import { db } from '../../db/connection';
import type { UserRole } from '../../types/express';

export interface ProjectRow {
  id: number;
  name: string;
  code: string | null;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  start_date: string;
  planned_end_date: string | null;
  cover_image_url: string | null;
  physical_progress_pct: number;
  ecowitt_application_key: string | null;
  ecowitt_api_key: string | null;
  ecowitt_mac: string | null;
  cemaden_station_code: string | null;
  cemaden_codibge: string | null;
  created_at: string;
  updated_at: string;
}

const listAllStmt = db.prepare('SELECT * FROM projects ORDER BY name');
const listForUserStmt = db.prepare(`
  SELECT p.* FROM projects p
  JOIN project_members pm ON pm.project_id = p.id
  WHERE pm.user_id = ?
  ORDER BY p.name
`);
const listForOrgStmt = db.prepare(`
  SELECT DISTINCT p.* FROM projects p
  JOIN project_companies pc ON pc.project_id = p.id
  WHERE pc.organization_id = ?
  ORDER BY p.name
`);
const getByIdStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
const projectBelongsToOrgStmt = db.prepare('SELECT 1 FROM project_companies WHERE project_id = ? AND organization_id = ? LIMIT 1');

export function listProjectsForUser(userId: number, role: UserRole, organizationId: number | null): ProjectRow[] {
  if (role === 'master') return listAllStmt.all() as unknown as ProjectRow[];
  if (role === 'org_admin' && organizationId) return listForOrgStmt.all(organizationId) as unknown as ProjectRow[];
  return listForUserStmt.all(userId) as unknown as ProjectRow[];
}

export function projectBelongsToOrganization(projectId: number, organizationId: number): boolean {
  return !!projectBelongsToOrgStmt.get(projectId, organizationId);
}

export function getProject(id: number): ProjectRow | undefined {
  return getByIdStmt.get(id) as unknown as ProjectRow | undefined;
}

export function createProject(input: {
  name: string;
  code?: string;
  city: string;
  state: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  startDate: string;
  plannedEndDate?: string;
  coverImageUrl?: string;
}): number {
  const result = db
    .prepare(
      `INSERT INTO projects (name, code, city, state, country, latitude, longitude, start_date, planned_end_date, cover_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.name,
      input.code ?? null,
      input.city,
      input.state,
      input.country,
      input.latitude ?? null,
      input.longitude ?? null,
      input.startDate,
      input.plannedEndDate ?? null,
      input.coverImageUrl ?? null
    );
  return Number(result.lastInsertRowid);
}

export function updateProject(
  id: number,
  input: Partial<{
    name: string;
    code: string;
    city: string;
    state: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    status: string;
    startDate: string;
    plannedEndDate: string;
    coverImageUrl: string;
    physicalProgressPct: number;
    ecowittApplicationKey: string | null;
    ecowittApiKey: string | null;
    ecowittMac: string | null;
    cemadenStationCode: string | null;
    cemadenCodibge: string | null;
  }>
) {
  const current = getProject(id);
  if (!current) return false;
  db.prepare(
    `UPDATE projects SET name=?, code=?, city=?, state=?, country=?, latitude=?, longitude=?, status=?, start_date=?, planned_end_date=?, cover_image_url=?, physical_progress_pct=?,
       ecowitt_application_key=?, ecowitt_api_key=?, ecowitt_mac=?, cemaden_station_code=?, cemaden_codibge=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(
    input.name ?? current.name,
    input.code ?? current.code,
    input.city ?? current.city,
    input.state ?? current.state,
    input.country ?? current.country,
    input.latitude === undefined ? current.latitude : input.latitude,
    input.longitude === undefined ? current.longitude : input.longitude,
    input.status ?? current.status,
    input.startDate ?? current.start_date,
    input.plannedEndDate ?? current.planned_end_date,
    input.coverImageUrl ?? current.cover_image_url,
    input.physicalProgressPct ?? current.physical_progress_pct,
    input.ecowittApplicationKey === undefined ? current.ecowitt_application_key : input.ecowittApplicationKey,
    input.ecowittApiKey === undefined ? current.ecowitt_api_key : input.ecowittApiKey,
    input.ecowittMac === undefined ? current.ecowitt_mac : input.ecowittMac,
    input.cemadenStationCode === undefined ? current.cemaden_station_code : input.cemadenStationCode,
    input.cemadenCodibge === undefined ? current.cemaden_codibge : input.cemadenCodibge,
    id
  );
  return true;
}

export function listMembers(projectId: number) {
  return db
    .prepare(
      `SELECT u.id, u.name, u.email FROM users u
       JOIN project_members pm ON pm.user_id = u.id
       WHERE pm.project_id = ?
       ORDER BY u.name`
    )
    .all(projectId);
}
