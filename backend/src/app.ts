import 'express-async-errors';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { projectsRouter } from './modules/projects/projects.routes';
import { rdosRouter } from './modules/rdos/rdos.routes';
import { templatesRouter } from './modules/rdos/templates.routes';
import { funcoesRouter } from './modules/catalog/funcoes.routes';
import { empresasRouter } from './modules/catalog/empresas.routes';
import { organizationsRouter } from './modules/organizations/organizations.routes';
import { auditRouter } from './modules/audit/audit.routes';

export const app = express();

app.use(cors({ origin: env.frontendOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(env.uploadsDir));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/rdos', rdosRouter);
app.use('/api/projects/:projectId/templates', templatesRouter);
app.use('/api/projects/:projectId/funcoes', funcoesRouter);
app.use('/api/projects/:projectId/empresas', empresasRouter);

// When the frontend has been built (npm run build), serve it from the same
// origin/port as the API — this is what lets a single tunnel (or a single
// deployed process) expose the whole app instead of two separate origins.
const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use(errorHandler);
