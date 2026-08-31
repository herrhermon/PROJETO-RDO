import type { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { recordAudit } from '../../utils/audit';
import { assertRdoEditable, getRdo } from './rdos.service';

const reorderSchema = z.object({ ids: z.array(z.number().int()).min(1) });

// New rows go to the bottom of the list rather than inheriting the id order,
// so an item added after a manual reordering doesn't jump into the middle.
export function nextOrdem(table: string, rdoId: number): number {
  const row = db.prepare(`SELECT COALESCE(MAX(ordem), 0) + 1 AS next FROM ${table} WHERE rdo_id = ?`).get(rdoId) as { next: number };
  return row.next;
}

// Registers PUT /reorder on a per-RDO item router. The client sends the full list
// of ids in their new visual order; positions are rewritten in one transaction.
export function registerReorderRoute(router: Router, table: string) {
  router.put('/reorder', (req, res) => {
    const projectId = Number((req.params as any).projectId);
    const rdoId = Number((req.params as any).rdoId);
    const rdo = getRdo(projectId, rdoId);
    if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
    assertRdoEditable(rdo);

    const parsed = reorderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Lista de ordenação inválida.' });

    const owned = db.prepare(`SELECT id FROM ${table} WHERE rdo_id = ?`).all(rdoId) as { id: number }[];
    const ownedIds = new Set(owned.map((r) => r.id));
    if (parsed.data.ids.length !== ownedIds.size || parsed.data.ids.some((id) => !ownedIds.has(id))) {
      return res.status(400).json({ error: 'A lista precisa conter exatamente os itens deste RDO.' });
    }

    const update = db.prepare(`UPDATE ${table} SET ordem = ?, updated_at = datetime('now') WHERE id = ? AND rdo_id = ?`);
    db.exec('BEGIN');
    try {
      parsed.data.ids.forEach((id, index) => update.run(index + 1, id, rdoId));
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    recordAudit({ entityType: table, entityId: rdoId, action: 'update', userId: (req as any).user.id, projectId, detail: { reordered: true } });
    res.json({ items: db.prepare(`SELECT * FROM ${table} WHERE rdo_id = ? ORDER BY ordem, id`).all(rdoId) });
  });
}
