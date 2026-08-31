import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { requireAuth } from '../../middleware/requireAuth';
import { requireAdmin } from '../../middleware/requireAdmin';
import { requireProjectAccess } from '../../middleware/requireProjectAccess';
import { requireProjectAdmin } from '../../middleware/requireProjectAdmin';
import { recordAudit } from '../../utils/audit';
import { createProject, getProject, listMembers, listProjectsForUser, projectBelongsToOrganization, updateProject } from './projects.service';
import { buildDashboard, buildPendencias } from '../dashboard/dashboard.service';
import { getMembershipCompanyType, getMembershipLevel } from './validation-chain.service';
import {
  chainReadiness,
  createCompany,
  deleteCompany,
  listCompanies,
  listMembersWithCompany,
  removeMember,
  setCompanyLogo,
  setMemberCompanyAndLevel,
  updateCompany,
} from './project-companies.service';
import { geocodeCity } from '../weather/geocode.service';
import { fetchWeatherForProject } from '../weather/weather.service';
import { fetchEcowittDailyRain } from '../weather/ecowitt.service';
import { getCemadenAccumulatedForDate, listCemadenStations } from '../weather/cemaden.service';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { uploadAvatar } from '../../middleware/upload';
import { env } from '../../config/env';

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get('/', (req, res) => {
  res.json({ projects: listProjectsForUser(req.user!.id, req.user!.role, req.user!.organizationId) });
});

// Whether the calling user has full administrative/oversight visibility into this
// project — Master always, or an Org Admin whose organization participates in it.
function hasFullProjectVisibility(req: any, projectId: number): boolean {
  if (req.user!.isAdmin) return true;
  return req.user!.role === 'org_admin' && !!req.user!.organizationId && projectBelongsToOrganization(projectId, req.user!.organizationId);
}

const createSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  startDate: z.string().min(1),
  plannedEndDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
  construtoraNome: z.string().min(1),
  clienteNome: z.string().min(1),
  gerenciadoraNome: z.string().optional(),
});

projectsRouter.post('/', requireAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const d = parsed.data;
  const geo = await geocodeCity(d.city, d.state, d.country);
  const id = createProject({ ...d, latitude: geo?.latitude, longitude: geo?.longitude });
  createCompany(id, 'construtora', d.construtoraNome);
  createCompany(id, 'cliente', d.clienteNome);
  if (d.gerenciadoraNome) createCompany(id, 'gerenciadora', d.gerenciadoraNome);
  recordAudit({ entityType: 'project', entityId: id, action: 'create', userId: req.user!.id, projectId: id });
  res.status(201).json({ project: getProject(id), geocoded: !!geo });
});

const recentAccessStmt = db.prepare(
  "SELECT 1 FROM org_access_log WHERE user_id = ? AND project_id = ? AND accessed_at > datetime('now', '-4 hours') LIMIT 1"
);
const insertAccessStmt = db.prepare('INSERT INTO org_access_log (user_id, project_id) VALUES (?, ?)');

projectsRouter.get('/:projectId', requireProjectAccess, (req, res) => {
  const projectId = Number(req.params.projectId);
  const project = getProject(projectId);
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (req.user!.isAdmin && !recentAccessStmt.get(req.user!.id, projectId)) {
    insertAccessStmt.run(req.user!.id, projectId);
  }
  res.json({ project });
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  status: z.enum(['em_andamento', 'concluido', 'pausado']).optional(),
  startDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  coverImageUrl: z.string().optional(),
  physicalProgressPct: z.number().min(0).max(100).optional(),
  ecowittApplicationKey: z.string().nullable().optional(),
  ecowittApiKey: z.string().nullable().optional(),
  ecowittMac: z.string().nullable().optional(),
  cemadenStationCode: z.string().nullable().optional(),
  cemadenCodibge: z.string().nullable().optional(),
});

projectsRouter.patch('/:projectId', requireProjectAccess, requireProjectAdmin, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const id = Number(req.params.projectId);
  const current = getProject(id);
  if (!current) return res.status(404).json({ error: 'Projeto não encontrado.' });
  const d = parsed.data;
  let latitude: number | null | undefined;
  let longitude: number | null | undefined;
  if (d.city || d.state || d.country) {
    const geo = await geocodeCity(d.city ?? current.city, d.state ?? current.state, d.country ?? current.country);
    latitude = geo?.latitude ?? null;
    longitude = geo?.longitude ?? null;
  }
  const ok = updateProject(id, { ...d, latitude, longitude });
  if (!ok) return res.status(404).json({ error: 'Projeto não encontrado.' });
  recordAudit({ entityType: 'project', entityId: id, action: 'update', userId: req.user!.id, projectId: id, detail: parsed.data });
  res.json({ project: getProject(id) });
});

projectsRouter.post('/:projectId/cover', requireProjectAccess, requireProjectAdmin, uploadAvatar.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const projectId = Number(req.params.projectId);
  const current = getProject(projectId);
  if (!current) return res.status(404).json({ error: 'Projeto não encontrado.' });
  const dir = path.join(env.uploadsDir, 'covers');
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${projectId}-${crypto.randomUUID()}.jpg`;
  const filePath = path.join(dir, fileName);
  await sharp(req.file.buffer).resize({ width: 800, height: 400, fit: 'cover' }).jpeg({ quality: 85 }).toFile(filePath);
  updateProject(projectId, { coverImageUrl: `covers/${fileName}` });
  recordAudit({ entityType: 'project', entityId: projectId, action: 'update', userId: req.user!.id, projectId, detail: { coverUpdated: true } });
  res.json({ project: getProject(projectId) });
});

projectsRouter.get('/:projectId/dashboard', requireProjectAccess, async (req, res) => {
  const project = getProject(Number(req.params.projectId));
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json({ dashboard: await buildDashboard(project) });
});

projectsRouter.get('/:projectId/weather', requireProjectAccess, async (req, res) => {
  const project = getProject(Number(req.params.projectId));
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  res.json(await fetchWeatherForProject(project));
});

projectsRouter.get('/:projectId/rain-sources', requireProjectAccess, (req, res) => {
  const project = getProject(Number(req.params.projectId));
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });
  const sources = [{ key: 'manual', label: 'Informar manualmente' }];
  if (project.ecowitt_application_key && project.ecowitt_api_key && project.ecowitt_mac) {
    sources.push({ key: 'ecowitt', label: 'Estação Pluviométrica Automática (Ecowitt)' });
  }
  if (project.cemaden_station_code && project.cemaden_codibge) {
    sources.push({ key: 'cemaden', label: `Estação ${project.cemaden_station_code} (CEMADEN)` });
  }
  res.json({ sources });
});

// Lists the CEMADEN stations available in a município so the admin can pick one
// instead of having to know its code.
projectsRouter.get('/:projectId/cemaden-stations', requireProjectAccess, requireProjectAdmin, async (req, res) => {
  const codibge = String(req.query.codibge ?? '').trim();
  if (!/^\d{7}$/.test(codibge)) return res.status(400).json({ error: 'Informe um código IBGE de 7 dígitos.' });
  const today = new Date().toISOString().slice(0, 10);
  const result = await listCemadenStations(codibge, today);
  if ('error' in result) return res.json({ stations: [], error: result.error });
  res.json(result);
});

const rainQuerySchema = z.object({
  source: z.enum(['ecowitt', 'cemaden']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

projectsRouter.get('/:projectId/rain', requireProjectAccess, async (req, res) => {
  const parsed = rainQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Parâmetros inválidos.' });
  const project = getProject(Number(req.params.projectId));
  if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

  if (parsed.data.source === 'cemaden') {
    if (!project.cemaden_station_code) return res.status(400).json({ error: 'Nenhuma estação CEMADEN cadastrada neste projeto.' });
    return res.json(await getCemadenAccumulatedForDate(project, parsed.data.date));
  }

  if (!project.ecowitt_application_key || !project.ecowitt_api_key || !project.ecowitt_mac) {
    return res.status(400).json({ error: 'Nenhuma estação Ecowitt cadastrada neste projeto.' });
  }
  res.json(
    await fetchEcowittDailyRain(project.ecowitt_application_key, project.ecowitt_api_key, project.ecowitt_mac, parsed.data.date)
  );
});

projectsRouter.get('/:projectId/pendencias', requireProjectAccess, (req, res) => {
  const projectId = Number(req.params.projectId);
  const items = buildPendencias(projectId, req.user!.id, hasFullProjectVisibility(req, projectId));
  res.json({ pendencias: items });
});

projectsRouter.get('/:projectId/members', requireProjectAccess, (req, res) => {
  res.json({ members: listMembers(Number(req.params.projectId)) });
});

projectsRouter.get('/:projectId/me', requireProjectAccess, (req, res) => {
  const projectId = Number(req.params.projectId);
  const isAdmin = req.user!.isAdmin;
  const companyType = isAdmin ? null : getMembershipCompanyType(projectId, req.user!.id);
  const level = isAdmin ? null : getMembershipLevel(projectId, req.user!.id) || null;
  res.json({
    me: {
      isAdmin,
      companyTipo: companyType,
      canIssue: isAdmin || companyType === 'construtora',
      canValidate: isAdmin || (level !== null && level >= 1),
      validationLevel: level,
      canManageProject: hasFullProjectVisibility(req, projectId),
    },
  });
});

// --- Empresas do projeto (Construtora/Gerenciadora/Cliente) ---

projectsRouter.get('/:projectId/companies', requireProjectAccess, (req, res) => {
  const projectId = Number(req.params.projectId);
  res.json({ companies: listCompanies(projectId), chainStatus: chainReadiness(projectId) });
});

const companySchema = z.object({
  tipo: z.enum(['construtora', 'gerenciadora', 'cliente']),
  nome: z.string().min(1),
  organizationId: z.number().int().nullable().optional(),
});

projectsRouter.post('/:projectId/companies', requireProjectAccess, requireProjectAdmin, (req, res) => {
  const parsed = companySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const projectId = Number(req.params.projectId);
  const company = createCompany(projectId, parsed.data.tipo, parsed.data.nome, parsed.data.organizationId);
  recordAudit({ entityType: 'project_companies', entityId: company.id, action: 'create', userId: req.user!.id, projectId });
  res.status(201).json({ company, chainStatus: chainReadiness(projectId) });
});

projectsRouter.patch('/:projectId/companies/:companyId', requireProjectAccess, requireProjectAdmin, (req, res) => {
  const parsed = companySchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const projectId = Number(req.params.projectId);
  const company = updateCompany(projectId, Number(req.params.companyId), parsed.data);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
  recordAudit({ entityType: 'project_companies', entityId: company.id, action: 'update', userId: req.user!.id, projectId });
  res.json({ company, chainStatus: chainReadiness(projectId) });
});

projectsRouter.delete('/:projectId/companies/:companyId', requireProjectAccess, requireProjectAdmin, (req, res) => {
  const projectId = Number(req.params.projectId);
  deleteCompany(projectId, Number(req.params.companyId));
  recordAudit({ entityType: 'project_companies', entityId: Number(req.params.companyId), action: 'delete', userId: req.user!.id, projectId });
  res.json({ ok: true, chainStatus: chainReadiness(projectId) });
});

projectsRouter.post('/:projectId/companies/:companyId/logo', requireProjectAccess, requireProjectAdmin, uploadAvatar.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const projectId = Number(req.params.projectId);
  const companyId = Number(req.params.companyId);
  const dir = path.join(env.uploadsDir, 'logos');
  fs.mkdirSync(dir, { recursive: true });
  const fileName = `${companyId}-${crypto.randomUUID()}.png`;
  const filePath = path.join(dir, fileName);
  await sharp(req.file.buffer).resize({ width: 300, height: 120, fit: 'inside', withoutEnlargement: true }).png().toFile(filePath);
  const company = setCompanyLogo(projectId, companyId, `logos/${fileName}`);
  if (!company) return res.status(404).json({ error: 'Empresa não encontrada.' });
  recordAudit({ entityType: 'project_companies', entityId: companyId, action: 'update', userId: req.user!.id, projectId, detail: { logoUpdated: true } });
  res.json({ company, chainStatus: chainReadiness(projectId) });
});

// --- Membros do projeto (usuário + empresa) ---

projectsRouter.get('/:projectId/member-companies', requireProjectAccess, requireProjectAdmin, (req, res) => {
  const projectId = Number(req.params.projectId);
  res.json({ members: listMembersWithCompany(projectId), chainStatus: chainReadiness(projectId) });
});

const memberCompanySchema = z.object({ companyId: z.number().int().nullable(), level: z.number().int().min(0) });

projectsRouter.put('/:projectId/member-companies/:userId', requireProjectAccess, requireProjectAdmin, (req, res) => {
  const parsed = memberCompanySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const projectId = Number(req.params.projectId);
  const userId = Number(req.params.userId);
  setMemberCompanyAndLevel(projectId, userId, parsed.data.companyId, parsed.data.level);
  recordAudit({
    entityType: 'project_members',
    entityId: userId,
    action: 'update',
    userId: req.user!.id,
    projectId,
    detail: { companyId: parsed.data.companyId, level: parsed.data.level },
  });
  res.json({ members: listMembersWithCompany(projectId), chainStatus: chainReadiness(projectId) });
});

projectsRouter.delete('/:projectId/member-companies/:userId', requireProjectAccess, requireProjectAdmin, (req, res) => {
  const projectId = Number(req.params.projectId);
  const userId = Number(req.params.userId);
  removeMember(projectId, userId);
  recordAudit({ entityType: 'project_members', entityId: userId, action: 'delete', userId: req.user!.id, projectId });
  res.json({ members: listMembersWithCompany(projectId), chainStatus: chainReadiness(projectId) });
});
