import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import sharp from 'sharp';
import { z } from 'zod';
import { recordAudit } from '../../utils/audit';
import { requireAuth } from '../../middleware/requireAuth';
import { uploadAvatar } from '../../middleware/upload';
import { env } from '../../config/env';
import { changeOwnPassword, createSession, destroySession, getUserFromSession, setOwnAvatar, updateOwnProfile, verifyCredentials } from './auth.service';

export const authRouter = Router();

const SESSION_COOKIE = 'eqtec_sid';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Informe e-mail e senha válidos.' });
  }
  const { email, password } = parsed.data;
  const user = verifyCredentials(email, password);
  if (!user) {
    recordAudit({ entityType: 'user', action: 'login_failed', detail: { email } });
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  }
  const session = createSession(user.id, req.get('user-agent'), req.ip);
  res.cookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    expires: new Date(session.expiresAt),
  });
  recordAudit({ entityType: 'user', entityId: user.id, action: 'login', userId: user.id });
  res.json({ user });
});

authRouter.post('/logout', (req, res) => {
  const sid = req.cookies?.[SESSION_COOKIE];
  if (sid) {
    const user = getUserFromSession(sid);
    destroySession(sid);
    if (user) recordAudit({ entityType: 'user', entityId: user.id, action: 'logout', userId: user.id });
  }
  res.clearCookie(SESSION_COOKIE);
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => {
  const sid = req.cookies?.[SESSION_COOKIE];
  const user = sid ? getUserFromSession(sid) : null;
  if (!user) return res.status(401).json({ error: 'Não autenticado.' });
  res.json({ user });
});

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

authRouter.patch('/me', requireAuth, (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const user = updateOwnProfile(req.user!.id, parsed.data);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  recordAudit({ entityType: 'user', entityId: user.id, action: 'update', userId: user.id, detail: { self: true, ...parsed.data } });
  res.json({ user });
});

authRouter.post('/me/avatar', requireAuth, uploadAvatar.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const dir = path.join(env.uploadsDir, 'avatars');
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${req.user!.id}-${crypto.randomUUID()}.jpg`;
  const filePath = path.join(dir, fileName);
  await sharp(req.file.buffer).rotate().resize({ width: 256, height: 256, fit: 'cover' }).jpeg({ quality: 82 }).toFile(filePath);
  const user = setOwnAvatar(req.user!.id, `avatars/${fileName}`);
  recordAudit({ entityType: 'user', entityId: req.user!.id, action: 'update', userId: req.user!.id, detail: { avatarUpdated: true } });
  res.json({ user });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

authRouter.post('/change-password', requireAuth, (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe a senha atual e uma nova senha com pelo menos 6 caracteres.' });
  const result = changeOwnPassword(req.user!.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (result === 'wrong_password') return res.status(400).json({ error: 'Senha atual incorreta.' });
  if (result === 'not_found') return res.status(404).json({ error: 'Usuário não encontrado.' });
  recordAudit({ entityType: 'user', entityId: req.user!.id, action: 'update', userId: req.user!.id, detail: { passwordChanged: true } });
  res.json({ ok: true });
});

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
