import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/connection';
import { projectBelongsToOrganization } from '../modules/projects/projects.service';

const membershipStmt = db.prepare(
  'SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?'
);

export function requireProjectAccess(req: Request, res: Response, next: NextFunction) {
  const projectId = Number(req.params.projectId);
  if (!Number.isInteger(projectId)) {
    return res.status(400).json({ error: 'Projeto inválido.' });
  }
  if (req.user?.isAdmin) return next();
  if (req.user!.role === 'org_admin' && req.user!.organizationId && projectBelongsToOrganization(projectId, req.user!.organizationId)) {
    return next();
  }

  const isMember = membershipStmt.get(projectId, req.user!.id);
  if (!isMember) {
    return res.status(403).json({ error: 'Você não tem acesso a este projeto.' });
  }
  next();
}
