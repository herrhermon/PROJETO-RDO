import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { requireAuth } from '../../middleware/requireAuth';
import { requireAdmin } from '../../middleware/requireAdmin';
import { uploadAvatar } from '../../middleware/upload';
import { env } from '../../config/env';
import { recordAudit } from '../../utils/audit';
import { createOrganization, getOrganization, listAllOrganizations, setOrganizationLogo, updateOrganization } from './organizations.service';

export const organizationsRouter = Router();

organizationsRouter.use(requireAuth);

organizationsRouter.get('/', (req, res) => {
  if (req.user!.role === 'member') return res.status(403).json({ error: 'Sem permissão para listar empresas.' });
  if (req.user!.isAdmin) {
    return res.json({ organizations: listAllOrganizations() });
  }
  const mine = req.user!.organizationId ? getOrganization(req.user!.organizationId) : null;
  res.json({ organizations: mine ? [mine] : [] });
});

const createSchema = z.object({ nome: z.string().min(1) });

organizationsRouter.post('/', requireAdmin, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe um nome válido.' });
  const organization = createOrganization(parsed.data.nome.trim());
  recordAudit({ entityType: 'organization', entityId: organization.id, action: 'create', userId: req.user!.id });
  res.status(201).json({ organization });
});

organizationsRouter.patch('/:id', requireAdmin, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe um nome válido.' });
  const organization = updateOrganization(Number(req.params.id), parsed.data.nome.trim());
  if (!organization) return res.status(404).json({ error: 'Empresa não encontrada.' });
  recordAudit({ entityType: 'organization', entityId: organization.id, action: 'update', userId: req.user!.id });
  res.json({ organization });
});

organizationsRouter.post('/:id/logo', requireAdmin, uploadAvatar.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const id = Number(req.params.id);
  const dir = path.join(env.uploadsDir, 'org-logos');
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${id}-${crypto.randomUUID()}.png`;
  const filePath = path.join(dir, fileName);
  await sharp(req.file.buffer).resize({ width: 300, height: 120, fit: 'inside', withoutEnlargement: true }).png().toFile(filePath);
  const organization = setOrganizationLogo(id, `org-logos/${fileName}`);
  if (!organization) return res.status(404).json({ error: 'Empresa não encontrada.' });
  recordAudit({ entityType: 'organization', entityId: id, action: 'update', userId: req.user!.id, detail: { logoUpdated: true } });
  res.json({ organization });
});
