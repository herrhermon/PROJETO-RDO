import type { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Erro interno do servidor.';
  const status = (err as { statusCode?: number })?.statusCode ?? 500;
  res.status(status).json({ error: message });
}

export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
