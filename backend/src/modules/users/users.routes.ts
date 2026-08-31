import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/requireAuth';
import { requireAdmin } from '../../middleware/requireAdmin';
import { recordAudit } from '../../utils/audit';
import { createUser, emailExists, getUserDetail, listUsers, resetUserPassword, updateUser } from './users.service';

export const usersRouter = Router();

usersRouter.use(requireAuth);

// Master sees every user; Org Admin sees only their own organization's users;
// a plain member has no business here.
usersRouter.get('/', (req, res) => {
  if (req.user!.role === 'member') return res.status(403).json({ error: 'Sem permissão para listar usuários.' });
  res.json({ users: req.user!.isAdmin ? listUsers() : listUsers(req.user!.organizationId) });
});

usersRouter.get('/:id', requireAdmin, (req, res) => {
  const user = getUserDetail(Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json({ user });
});

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['master', 'org_admin', 'member']).optional(),
  organizationId: z.number().int().nullable().optional(),
});

usersRouter.post('/', (req, res) => {
  if (req.user!.role === 'member') return res.status(403).json({ error: 'Sem permissão para criar usuários.' });
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  if (emailExists(parsed.data.email)) return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });

  // Org Admin can only create members within their own organization — role and
  // organizationId from the request body are ignored/overridden for them.
  const role = req.user!.isAdmin ? parsed.data.role ?? 'member' : 'member';
  const organizationId = req.user!.isAdmin ? parsed.data.organizationId ?? null : req.user!.organizationId;

  const id = createUser({ name: parsed.data.name, email: parsed.data.email, password: parsed.data.password, role, organizationId });
  recordAudit({ entityType: 'user', entityId: id, action: 'create', userId: req.user!.id, detail: { email: parsed.data.email, role, organizationId } });
  res.status(201).json({ user: getUserDetail(id) });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['master', 'org_admin', 'member']).optional(),
  organizationId: z.number().int().nullable().optional(),
});

usersRouter.patch('/:id', requireAdmin, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const id = Number(req.params.id);
  if (parsed.data.email && emailExists(parsed.data.email, id)) {
    return res.status(409).json({ error: 'Já existe um usuário com este e-mail.' });
  }
  const ok = updateUser(id, parsed.data);
  if (!ok) return res.status(404).json({ error: 'Usuário não encontrado.' });
  recordAudit({ entityType: 'user', entityId: id, action: 'update', userId: req.user!.id, detail: parsed.data });
  res.json({ user: getUserDetail(id) });
});

usersRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const ok = updateUser(id, { isActive: false });
  if (!ok) return res.status(404).json({ error: 'Usuário não encontrado.' });
  recordAudit({ entityType: 'user', entityId: id, action: 'delete', userId: req.user!.id });
  res.json({ ok: true });
});

const resetPasswordSchema = z.object({ newPassword: z.string().min(6) });

usersRouter.post('/:id/reset-password', requireAdmin, (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Senha inválida (mínimo 6 caracteres).' });
  resetUserPassword(Number(req.params.id), parsed.data.newPassword);
  recordAudit({ entityType: 'user', entityId: Number(req.params.id), action: 'update', userId: req.user!.id, detail: { resetPassword: true } });
  res.json({ ok: true });
});
