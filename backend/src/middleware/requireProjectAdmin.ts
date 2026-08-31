import type { NextFunction, Request, Response } from 'express';
import { projectBelongsToOrganization } from '../modules/projects/projects.service';

// Master passes always; Org Admin passes only for projects belonging to their own
// organization; everyone else (including a plain project member) gets 403. Use this
// in place of requireAdmin on routes that manage a specific project's setup
// (companies, members, project details) — project creation itself stays requireAdmin.
export function requireProjectAdmin(req: Request, res: Response, next: NextFunction) {
  const projectId = Number(req.params.projectId);
  if (req.user!.isAdmin) return next();
  if (req.user!.role === 'org_admin' && req.user!.organizationId && projectBelongsToOrganization(projectId, req.user!.organizationId)) {
    return next();
  }
  return res.status(403).json({ error: 'Você não tem permissão para administrar este projeto.' });
}
