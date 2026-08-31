import type { NextFunction, Request, Response } from 'express';
import { getUserFromSession } from '../modules/auth/auth.service';
import { SESSION_COOKIE_NAME } from '../modules/auth/auth.routes';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sid = req.cookies?.[SESSION_COOKIE_NAME];
  const user = sid ? getUserFromSession(sid) : null;
  if (!user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  req.user = user;
  next();
}
