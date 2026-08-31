import type { NextFunction, Request, Response } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Apenas administradores podem realizar esta ação.' });
  }
  next();
}
