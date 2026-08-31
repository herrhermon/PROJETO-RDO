import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { recordAudit } from '../../utils/audit';
import { getRdo, assertRdoEditable } from './rdos.service';
import { nextOrdem, registerReorderRoute } from './reorder';

export const efetivoRouter = Router({ mergeParams: true });

registerReorderRoute(efetivoRouter, 'rdo_efetivo');

const itemSchema = z.object({
  funcao: z.string().min(1),
  empresa: z.string().optional(),
  quantidade: z.number().int().min(0),
  turno: z.enum(['manha', 'tarde', 'noite', 'integral']).optional(),
  observacao: z.string().optional(),
});

function loadRdo(req: any) {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  return { projectId, rdoId, rdo };
}

efetivoRouter.get('/', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  const rows = db.prepare('SELECT * FROM rdo_efetivo WHERE rdo_id = ? ORDER BY ordem, id').all(rdoId);
  res.json({ efetivo: rows });
});

efetivoRouter.post('/', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const result = db
    .prepare('INSERT INTO rdo_efetivo (rdo_id, funcao, empresa, quantidade, turno, observacao, ordem) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(rdoId, parsed.data.funcao, parsed.data.empresa ?? null, parsed.data.quantidade, parsed.data.turno ?? null, parsed.data.observacao ?? null, nextOrdem('rdo_efetivo', rdoId));
  recordAudit({ entityType: 'rdo_efetivo', entityId: Number(result.lastInsertRowid), action: 'create', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  const row = db.prepare('SELECT * FROM rdo_efetivo WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ item: row });
});

efetivoRouter.patch('/:itemId', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const current = db.prepare('SELECT * FROM rdo_efetivo WHERE id = ? AND rdo_id = ?').get((req.params as any).itemId, rdoId) as any;
  if (!current) return res.status(404).json({ error: 'Item não encontrado.' });
  db.prepare(
    `UPDATE rdo_efetivo SET funcao=?, empresa=?, quantidade=?, turno=?, observacao=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    parsed.data.funcao ?? current.funcao,
    parsed.data.empresa ?? current.empresa,
    parsed.data.quantidade ?? current.quantidade,
    parsed.data.turno ?? current.turno,
    parsed.data.observacao ?? current.observacao,
    current.id
  );
  recordAudit({ entityType: 'rdo_efetivo', entityId: current.id, action: 'update', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.json({ item: db.prepare('SELECT * FROM rdo_efetivo WHERE id = ?').get(current.id) });
});

efetivoRouter.delete('/:itemId', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  db.prepare('DELETE FROM rdo_efetivo WHERE id = ? AND rdo_id = ?').run((req.params as any).itemId, rdoId);
  recordAudit({ entityType: 'rdo_efetivo', entityId: Number((req.params as any).itemId), action: 'delete', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.json({ ok: true });
});
