import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { recordAudit } from '../../utils/audit';
import { getRdo, assertRdoEditable } from './rdos.service';
import { nextOrdem, registerReorderRoute } from './reorder';

export const servicosRouter = Router({ mergeParams: true });

registerReorderRoute(servicosRouter, 'rdo_servicos');

const itemSchema = z.object({
  descricao: z.string().min(1),
  unidade: z.string().optional(),
  quantidadeExecutada: z.number().min(0).optional(),
  quantidadePlanejada: z.number().min(0).optional(),
  empresa: z.string().optional(),
  localizacao: z.string().optional(),
  statusExecucao: z.enum(['em_andamento', 'concluido', 'paralisado']).optional(),
  observacao: z.string().optional(),
});

function loadRdo(req: any) {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  return { projectId, rdoId, rdo };
}

servicosRouter.get('/', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  const rows = db.prepare('SELECT * FROM rdo_servicos WHERE rdo_id = ? ORDER BY ordem, id').all(rdoId);
  res.json({ servicos: rows });
});

servicosRouter.post('/', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const d = parsed.data;
  const result = db
    .prepare(
      `INSERT INTO rdo_servicos (rdo_id, descricao, unidade, quantidade_executada, quantidade_planejada, empresa, localizacao, status_execucao, observacao, ordem)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      rdoId,
      d.descricao,
      d.unidade ?? null,
      d.quantidadeExecutada ?? null,
      d.quantidadePlanejada ?? null,
      d.empresa ?? null,
      d.localizacao ?? null,
      d.statusExecucao ?? null,
      d.observacao ?? null,
      nextOrdem('rdo_servicos', rdoId)
    );
  recordAudit({ entityType: 'rdo_servicos', entityId: Number(result.lastInsertRowid), action: 'create', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.status(201).json({ item: db.prepare('SELECT * FROM rdo_servicos WHERE id = ?').get(result.lastInsertRowid) });
});

servicosRouter.patch('/:itemId', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  const parsed = itemSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const current = db.prepare('SELECT * FROM rdo_servicos WHERE id = ? AND rdo_id = ?').get((req.params as any).itemId, rdoId) as any;
  if (!current) return res.status(404).json({ error: 'Item não encontrado.' });
  const d = parsed.data;
  db.prepare(
    `UPDATE rdo_servicos SET descricao=?, unidade=?, quantidade_executada=?, quantidade_planejada=?, empresa=?, localizacao=?, status_execucao=?, observacao=?, updated_at=datetime('now') WHERE id=?`
  ).run(
    d.descricao ?? current.descricao,
    d.unidade ?? current.unidade,
    d.quantidadeExecutada ?? current.quantidade_executada,
    d.quantidadePlanejada ?? current.quantidade_planejada,
    d.empresa ?? current.empresa,
    d.localizacao ?? current.localizacao,
    d.statusExecucao ?? current.status_execucao,
    d.observacao ?? current.observacao,
    current.id
  );
  recordAudit({ entityType: 'rdo_servicos', entityId: current.id, action: 'update', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.json({ item: db.prepare('SELECT * FROM rdo_servicos WHERE id = ?').get(current.id) });
});

servicosRouter.delete('/:itemId', (req, res) => {
  const { rdoId, rdo } = loadRdo(req);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  db.prepare('DELETE FROM rdo_servicos WHERE id = ? AND rdo_id = ?').run((req.params as any).itemId, rdoId);
  recordAudit({ entityType: 'rdo_servicos', entityId: Number((req.params as any).itemId), action: 'delete', userId: (req as any).user.id, projectId: Number((req.params as any).projectId) });
  res.json({ ok: true });
});
