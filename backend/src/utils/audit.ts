import { db } from '../db/connection';

type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'login_failed' | 'logout';

interface AuditParams {
  entityType: string;
  entityId?: number | null;
  action: AuditAction;
  userId?: number | null;
  projectId?: number | null;
  detail?: unknown;
}

const insertStmt = db.prepare(`
  INSERT INTO audit_log (entity_type, entity_id, action, user_id, project_id, detail)
  VALUES (@entityType, @entityId, @action, @userId, @projectId, @detail)
`);

export function recordAudit(params: AuditParams) {
  insertStmt.run({
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    action: params.action,
    userId: params.userId ?? null,
    projectId: params.projectId ?? null,
    detail: params.detail ? JSON.stringify(params.detail) : null,
  });
}
