import { db } from '../../db/connection';
import { HttpError } from '../../middleware/errorHandler';
import { chainReadiness, validateLevelOrdering, type CompanyType } from './validation-chain.service';

export interface ProjectCompany {
  id: number;
  project_id: number;
  tipo: CompanyType;
  nome: string;
  logo_path: string | null;
  organization_id: number | null;
}

export function listCompanies(projectId: number): ProjectCompany[] {
  return db.prepare('SELECT * FROM project_companies WHERE project_id = ? ORDER BY tipo, nome').all(projectId) as unknown as ProjectCompany[];
}

export function createCompany(projectId: number, tipo: string, nome: string, organizationId?: number | null): ProjectCompany {
  const existing = db
    .prepare('SELECT id FROM project_companies WHERE project_id = ? AND tipo = ? AND nome = ? COLLATE NOCASE')
    .get(projectId, tipo, nome);
  if (existing) throw new HttpError(409, 'Já existe uma empresa com esse nome e tipo neste projeto.');
  const result = db
    .prepare('INSERT INTO project_companies (project_id, tipo, nome, organization_id) VALUES (?, ?, ?, ?)')
    .run(projectId, tipo, nome, organizationId ?? null);
  return db.prepare('SELECT * FROM project_companies WHERE id = ?').get(result.lastInsertRowid) as unknown as ProjectCompany;
}

export function updateCompany(
  projectId: number,
  companyId: number,
  input: { tipo?: string; nome?: string; organizationId?: number | null }
): ProjectCompany | null {
  const current = db.prepare('SELECT * FROM project_companies WHERE id = ? AND project_id = ?').get(companyId, projectId) as ProjectCompany | undefined;
  if (!current) return null;
  db.prepare("UPDATE project_companies SET tipo = ?, nome = ?, organization_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    input.tipo ?? current.tipo,
    input.nome ?? current.nome,
    input.organizationId === undefined ? current.organization_id : input.organizationId,
    companyId
  );
  return db.prepare('SELECT * FROM project_companies WHERE id = ?').get(companyId) as unknown as ProjectCompany;
}

export function setCompanyLogo(projectId: number, companyId: number, logoPath: string): ProjectCompany | null {
  const current = db.prepare('SELECT * FROM project_companies WHERE id = ? AND project_id = ?').get(companyId, projectId);
  if (!current) return null;
  db.prepare("UPDATE project_companies SET logo_path = ?, updated_at = datetime('now') WHERE id = ?").run(logoPath, companyId);
  return db.prepare('SELECT * FROM project_companies WHERE id = ?').get(companyId) as unknown as ProjectCompany;
}

export function deleteCompany(projectId: number, companyId: number) {
  const current = db.prepare('SELECT * FROM project_companies WHERE id = ? AND project_id = ?').get(companyId, projectId) as ProjectCompany | undefined;
  if (!current) throw new HttpError(404, 'Empresa não encontrada.');

  const memberCount = (db.prepare('SELECT COUNT(*) as c FROM project_members WHERE company_id = ?').get(companyId) as { c: number }).c;
  if (memberCount > 0) {
    throw new HttpError(409, `${memberCount} usuário(s) estão vinculados a esta empresa. Remova os vínculos antes de excluir.`);
  }

  if (current.tipo === 'gerenciadora' || current.tipo === 'cliente') {
    const pendingRdo = db.prepare("SELECT id FROM rdos WHERE project_id = ? AND status = 'em_validacao' LIMIT 1").get(projectId);
    if (pendingRdo) {
      throw new HttpError(409, 'Existem RDOs em validação neste projeto. Não é possível excluir esta empresa agora.');
    }
  }

  db.prepare('DELETE FROM project_companies WHERE id = ?').run(companyId);
}

export interface ProjectMemberDetail {
  user_id: number;
  name: string;
  email: string;
  company_id: number | null;
  company_nome: string | null;
  company_tipo: CompanyType | null;
  level: number;
}

export function listMembersWithCompany(projectId: number): ProjectMemberDetail[] {
  return db
    .prepare(
      `SELECT u.id as user_id, u.name, u.email, pc.id as company_id, pc.nome as company_nome, pc.tipo as company_tipo, pm.level as level
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
       LEFT JOIN project_companies pc ON pc.id = pm.company_id
       WHERE pm.project_id = ?
       ORDER BY u.name`
    )
    .all(projectId) as unknown as ProjectMemberDetail[];
}

export function setMemberCompanyAndLevel(projectId: number, userId: number, companyId: number | null, level: number) {
  let effectiveLevel = level;
  if (companyId === null) {
    effectiveLevel = 0;
  } else {
    const company = db.prepare('SELECT * FROM project_companies WHERE id = ? AND project_id = ?').get(companyId, projectId) as
      | ProjectCompany
      | undefined;
    if (!company) throw new HttpError(400, 'Empresa não pertence a este projeto.');
    if (effectiveLevel < 1) throw new HttpError(400, 'Informe um nível de 1 ou mais para um usuário vinculado a uma empresa.');
    validateLevelOrdering(projectId, company.tipo, effectiveLevel, userId);
  }
  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  if (existing) {
    db.prepare('UPDATE project_members SET company_id = ?, level = ? WHERE project_id = ? AND user_id = ?').run(
      companyId,
      effectiveLevel,
      projectId,
      userId
    );
  } else {
    db.prepare('INSERT INTO project_members (project_id, user_id, company_id, level) VALUES (?, ?, ?, ?)').run(projectId, userId, companyId, effectiveLevel);
  }
}

export function removeMember(projectId: number, userId: number) {
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
}

export { chainReadiness };
