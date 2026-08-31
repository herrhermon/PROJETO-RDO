import type { NextFunction, Request, Response } from 'express';
import { getMembershipCompanyType, getMembershipLevel } from '../modules/projects/validation-chain.service';

export function requireIssuer(req: Request, res: Response, next: NextFunction) {
  if (req.user!.isAdmin) return next();
  const projectId = Number(req.params.projectId);
  if (getMembershipCompanyType(projectId, req.user!.id) !== 'construtora') {
    return res.status(403).json({ error: 'Apenas usuários de empresa Construtora podem emitir ou editar RDOs neste projeto.' });
  }
  next();
}

export function requireValidator(req: Request, res: Response, next: NextFunction) {
  if (req.user!.isAdmin) return next();
  const projectId = Number(req.params.projectId);
  if (getMembershipLevel(projectId, req.user!.id) < 1) {
    return res.status(403).json({ error: 'Você não tem permissão para validar RDOs neste projeto.' });
  }
  next();
}
