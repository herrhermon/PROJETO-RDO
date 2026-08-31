import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { requireAuth } from '../../middleware/requireAuth';
import { requireProjectAccess } from '../../middleware/requireProjectAccess';
import { requireIssuer } from '../../middleware/requireProjectCapability';
import { recordAudit } from '../../utils/audit';

export const funcoesRouter = Router({ mergeParams: true });

funcoesRouter.use(requireAuth, requireProjectAccess);

funcoesRouter.get('/', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rows = db.prepare('SELECT * FROM project_funcoes WHERE project_id = ? ORDER BY nome').all(projectId);
  res.json({ funcoes: rows });
});

const createSchema = z.object({ nome: z.string().min(1) });

funcoesRouter.post('/', requireIssuer, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe um nome válido.' });
  const projectId = Number((req.params as any).projectId);
  const existing = db.prepare('SELECT id FROM project_funcoes WHERE project_id = ? AND nome = ? COLLATE NOCASE').get(projectId, parsed.data.nome);
  if (existing) return res.status(409).json({ error: 'Essa função já está cadastrada.' });
  const result = db.prepare('INSERT INTO project_funcoes (project_id, nome) VALUES (?, ?)').run(projectId, parsed.data.nome);
  recordAudit({ entityType: 'project_funcoes', entityId: Number(result.lastInsertRowid), action: 'create', userId: req.user!.id, projectId });
  res.status(201).json({ item: db.prepare('SELECT * FROM project_funcoes WHERE id = ?').get(result.lastInsertRowid) });
});

funcoesRouter.delete('/:id', requireIssuer, (req, res) => {
  const projectId = Number((req.params as any).projectId);
  db.prepare('DELETE FROM project_funcoes WHERE id = ? AND project_id = ?').run(req.params.id, projectId);
  recordAudit({ entityType: 'project_funcoes', entityId: Number(req.params.id), action: 'delete', userId: req.user!.id, projectId });
  res.json({ ok: true });
});
