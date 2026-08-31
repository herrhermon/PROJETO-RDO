import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3001),
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  cookieSecret: process.env.COOKIE_SECRET ?? 'dev-secret-change-me',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS ?? 12),
  dbPath: path.join(__dirname, '..', '..', 'data', 'eqtec.db'),
  uploadsDir: path.join(__dirname, '..', '..', 'uploads'),
  cemadenEmail: process.env.CEMADEN_EMAIL ?? '',
  cemadenPassword: process.env.CEMADEN_PASSWORD ?? '',
};
