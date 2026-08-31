import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { recordAudit } from '../../utils/audit';
import { getRdo } from './rdos.service';

export const comentariosRouter = Router({ mergeParams: true });

const itemSchema = z.object({
  tipo: z.enum(['comentario', 'ocorrencia']),
  texto: z.string().min(1),
});

comentariosRouter.get('/', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  const rows = db
    .prepare(
      `SELECT c.*, u.name as author_name FROM rdo_comentarios c
       LEFT JOIN users u ON u.id = c.author_id
       WHERE c.rdo_id = ? ORDER BY c.created_at ASC`
    )
    .all(rdoId);
  res.json({ comentarios: rows });
});

comentariosRouter.post('/', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  const parsed = itemSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const authorId = (req as any).user.id;
  const result = db
    .prepare('INSERT INTO rdo_comentarios (rdo_id, author_id, tipo, texto) VALUES (?, ?, ?, ?)')
    .run(rdoId, authorId, parsed.data.tipo, parsed.data.texto);
  recordAudit({ entityType: 'rdo_comentarios', entityId: Number(result.lastInsertRowid), action: 'create', userId: authorId, projectId });
  const row = db
    .prepare(`SELECT c.*, u.name as author_name FROM rdo_comentarios c LEFT JOIN users u ON u.id = c.author_id WHERE c.id = ?`)
    .get(result.lastInsertRowid);
  res.status(201).json({ item: row });
});

comentariosRouter.delete('/:itemId', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const user = (req as any).user;
  const current = db.prepare('SELECT * FROM rdo_comentarios WHERE id = ? AND rdo_id = ?').get((req.params as any).itemId, rdoId) as any;
  if (!current) return res.status(404).json({ error: 'Comentário não encontrado.' });
  const isAuthor = current.author_id === user.id;
  const isAdmin = user.isAdmin;
  if (!isAuthor && !isAdmin) return res.status(403).json({ error: 'Só o autor ou um administrador pode excluir este comentário.' });
  db.prepare('DELETE FROM rdo_comentarios WHERE id = ?').run(current.id);
  recordAudit({ entityType: 'rdo_comentarios', entityId: current.id, action: 'delete', userId: user.id, projectId });
  res.json({ ok: true });
});
