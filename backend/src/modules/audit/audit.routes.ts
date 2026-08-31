import { Router } from 'express';
import { db } from '../../db/connection';
import { requireAuth } from '../../middleware/requireAuth';
import { requireAdmin } from '../../middleware/requireAdmin';

export const auditRouter = Router();

// Master-only: this is the accountability surface for the whole system, including
// the cross-organization access trail — an Org Admin should not be able to see
// when/whether the Master looked at another company's data.
auditRouter.use(requireAuth, requireAdmin);

const logStmt = db.prepare(`
  SELECT a.id, a.entity_type, a.entity_id, a.action, a.detail, a.created_at, a.project_id,
    u.name as actor_name, p.name as project_name
  FROM audit_log a
  LEFT JOIN users u ON u.id = a.user_id
  LEFT JOIN projects p ON p.id = a.project_id
  ORDER BY a.created_at DESC
  LIMIT 500
`);

auditRouter.get('/log', (req, res) => {
  const { entityType, action, projectId } = req.query as Record<string, string | undefined>;
  let rows = logStmt.all() as any[];
  if (entityType) rows = rows.filter((r) => r.entity_type === entityType);
  if (action) rows = rows.filter((r) => r.action === action);
  if (projectId) rows = rows.filter((r) => r.project_id === Number(projectId));
  res.json({ log: rows.slice(0, 200) });
});

const accessLogStmt = db.prepare(`
  SELECT oal.id, oal.accessed_at, oal.project_id,
    u.name as actor_name, u.email as actor_email,
    p.name as project_name
  FROM org_access_log oal
  JOIN users u ON u.id = oal.user_id
  JOIN projects p ON p.id = oal.project_id
  ORDER BY oal.accessed_at DESC
  LIMIT 300
`);

auditRouter.get('/access-log', (_req, res) => {
  res.json({ accessLog: accessLogStmt.all() });
});
