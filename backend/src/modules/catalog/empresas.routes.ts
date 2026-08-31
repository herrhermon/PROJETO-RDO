import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { requireAuth } from '../../middleware/requireAuth';
import { requireProjectAccess } from '../../middleware/requireProjectAccess';
import { requireIssuer } from '../../middleware/requireProjectCapability';
import { recordAudit } from '../../utils/audit';

export const empresasRouter = Router({ mergeParams: true });

empresasRouter.use(requireAuth, requireProjectAccess);

empresasRouter.get('/', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rows = db.prepare('SELECT * FROM project_empresas WHERE project_id = ? ORDER BY nome').all(projectId);
  res.json({ empresas: rows });
});

const createSchema = z.object({ nome: z.string().min(1) });

empresasRouter.post('/', requireIssuer, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe um nome válido.' });
  const projectId = Number((req.params as any).projectId);
  const existing = db.prepare('SELECT id FROM project_empresas WHERE project_id = ? AND nome = ? COLLATE NOCASE').get(projectId, parsed.data.nome);
  if (existing) return res.status(409).json({ error: 'Essa empresa já está cadastrada.' });
  const result = db.prepare('INSERT INTO project_empresas (project_id, nome) VALUES (?, ?)').run(projectId, parsed.data.nome);
  recordAudit({ entityType: 'project_empresas', entityId: Number(result.lastInsertRowid), action: 'create', userId: req.user!.id, projectId });
  res.status(201).json({ item: db.prepare('SELECT * FROM project_empresas WHERE id = ?').get(result.lastInsertRowid) });
});

empresasRouter.delete('/:id', requireIssuer, (req, res) => {
  const projectId = Number((req.params as any).projectId);
  db.prepare('DELETE FROM project_empresas WHERE id = ? AND project_id = ?').run(req.params.id, projectId);
  recordAudit({ entityType: 'project_empresas', entityId: Number(req.params.id), action: 'delete', userId: req.user!.id, projectId });
  res.json({ ok: true });
});
