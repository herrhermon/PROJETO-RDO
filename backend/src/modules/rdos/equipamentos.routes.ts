import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { recordAudit } from '../../utils/audit';
import { getRdo, assertRdoEditable } from './rdos.service';
import { nextOrdem, registerReorderRoute } from './reorder';

export const equipamentosRouter = Router({ mergeParams: true });

registerReorderRoute(equipamentosRouter, 'rdo_equipamentos');

const itemSchema = z.object({
  tipo: z.string().min(1),
  propriedade: z.enum(['proprio', 'alugado', 'terceiro']),
  empresa: z.string().optional(),
  quantidade: z.number().int().min(0),
  observacao: z.string().optional(),
});

function loadRdo(req: any) {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  return { projectId, rdoId, rdo };
}

equipamentosRouter.get('/', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  const rows = db.prepare('SELECT * FROM rdo_equipamentos WHERE rdo_id = ? ORDER BY ordem, id').all(rdoId);
  res.json({ equipamentos: rows });
});

equipamentosRouter.post('/', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const d = parsed.data;
  const result = db
    .prepare('INSERT INTO rdo_equipamentos (rdo_id, tipo, propriedade, empresa, quantidade, observacao, ordem) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(rdoId, d.tipo, d.propriedade, d.empresa ?? null, d.quantidade, d.observacao ?? null, nextOrdem('rdo_equipamentos', rdoId));
  recordAudit({ entityType: 'rdo_equipamentos', entityId: Number(result.lastInsertRowid), action: 'create', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.status(201).json({ item: db.prepare('SELECT * FROM rdo_equipamentos WHERE id = ?').get(result.lastInsertRowid) });
});

equipamentosRouter.patch('/:itemId', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const current = db.prepare('SELECT * FROM rdo_equipamentos WHERE id = ? AND rdo_id = ?').get((req.params as any).itemId, rdoId) as any;
  if (!current) return res.status(404).json({ error: 'Item não encontrado.' });
  const d = parsed.data;
  db.prepare(
    `UPDATE rdo_equipamentos SET tipo=?, propriedade=?, empresa=?, quantidade=?, observacao=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    d.tipo ?? current.tipo,
    d.propriedade ?? current.propriedade,
    d.empresa ?? current.empresa,
    d.quantidade ?? current.quantidade,
    d.observacao ?? current.observacao,
    current.id
  );
  recordAudit({ entityType: 'rdo_equipamentos', entityId: current.id, action: 'update', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.json({ item: db.prepare('SELECT * FROM rdo_equipamentos WHERE id = ?').get(current.id) });
});

equipamentosRouter.delete('/:itemId', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  db.prepare('DELETE FROM rdo_equipamentos WHERE id = ? AND rdo_id = ?').run((req.params as any).itemId, rdoId);
  recordAudit({ entityType: 'rdo_equipamentos', entityId: Number((req.params as any).itemId), action: 'delete', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.json({ ok: true });
});
