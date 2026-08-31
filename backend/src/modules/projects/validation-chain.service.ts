import { db } from '../../db/connection';
import { HttpError } from '../../middleware/errorHandler';

export type CompanyType = 'construtora' | 'gerenciadora' | 'cliente';

const TIER_RANK: Record<CompanyType, number> = { construtora: 1, gerenciadora: 2, cliente: 3 };
const TIER_LABELS: Record<CompanyType, string> = { construtora: 'Construtora', gerenciadora: 'Gerenciadora', cliente: 'Cliente' };

const companyTypeExistsStmt = db.prepare('SELECT 1 FROM project_companies WHERE project_id = ? AND tipo = ? LIMIT 1');

// The validation chain is the ordered list of distinct numeric levels currently
// assigned to project members (level >= 1). An RDO climbs this ladder one
// distinct level at a time, regardless of which company type owns each level.
export function getValidationChain(projectId: number): number[] {
  const rows = db
    .prepare('SELECT DISTINCT level FROM project_members WHERE project_id = ? AND level >= 1 ORDER BY level')
    .all(projectId) as { level: number }[];
  return rows.map((r) => r.level);
}

export function getMembershipLevel(projectId: number, userId: number): number {
  const row = db.prepare('SELECT level FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId) as
    | { level: number }
    | undefined;
  return row?.level ?? 0;
}

export function getMembershipCompanyType(projectId: number, userId: number): CompanyType | null {
  const row = db
    .prepare(
      `SELECT pc.tipo AS company_type
       FROM project_members pm
       LEFT JOIN project_companies pc ON pc.id = pm.company_id
       WHERE pm.project_id = ? AND pm.user_id = ?`
    )
    .get(projectId, userId) as { company_type: CompanyType | null } | undefined;
  return row?.company_type ?? null;
}

interface TierRange {
  tipo: CompanyType;
  minLevel: number;
  maxLevel: number;
}

function getTierRanges(projectId: number): TierRange[] {
  const rows = db
    .prepare(
      `SELECT pc.tipo AS tipo, MIN(pm.level) AS min_level, MAX(pm.level) AS max_level
       FROM project_members pm
       JOIN project_companies pc ON pc.id = pm.company_id
       WHERE pm.project_id = ? AND pm.level >= 1
       GROUP BY pc.tipo`
    )
    .all(projectId) as { tipo: CompanyType; min_level: number; max_level: number }[];
  return rows.map((r) => ({ tipo: r.tipo, minLevel: r.min_level, maxLevel: r.max_level }));
}

// Which company tier a given RDO validation level belongs to, for display purposes
// (e.g. "Aguardando Gerenciadora").
export function companyTypeForLevel(projectId: number, level: number): CompanyType | null {
  const ranges = getTierRanges(projectId);
  const match = ranges.find((r) => level >= r.minLevel && level <= r.maxLevel);
  return match?.tipo ?? null;
}

// Enforces: every level assigned to a Construtora member < every level assigned to a
// Gerenciadora member < every level assigned to a Cliente member. Multiple members can
// share a level, and a single company can span several distinct levels.
export function validateLevelOrdering(projectId: number, tipo: CompanyType, level: number, excludeUserId?: number): void {
  const rank = TIER_RANK[tipo];
  const others = db
    .prepare(
      `SELECT pm.user_id AS user_id, pm.level AS level, pc.tipo AS tipo
       FROM project_members pm
       JOIN project_companies pc ON pc.id = pm.company_id
       WHERE pm.project_id = ? AND pm.level >= 1`
    )
    .all(projectId) as { user_id: number; level: number; tipo: CompanyType }[];

  for (const other of others) {
    if (excludeUserId !== undefined && other.user_id === excludeUserId) continue;
    const otherRank = TIER_RANK[other.tipo];
    if (otherRank < rank && other.level >= level) {
      throw new HttpError(
        409,
        `Nível ${level} inválido: um usuário da ${TIER_LABELS[other.tipo]} está no nível ${other.level}. Usuários da ${TIER_LABELS[tipo]} precisam ter nível maior que todos os níveis da ${TIER_LABELS[other.tipo]}.`
      );
    }
    if (otherRank > rank && other.level <= level) {
      throw new HttpError(
        409,
        `Nível ${level} inválido: um usuário da ${TIER_LABELS[other.tipo]} está no nível ${other.level}. Usuários da ${TIER_LABELS[tipo]} precisam ter nível menor que todos os níveis da ${TIER_LABELS[other.tipo]}.`
      );
    }
  }
}

export interface ChainReadiness {
  hasConstrutora: boolean;
  hasGerenciadora: boolean;
  hasCliente: boolean;
  chainComplete: boolean;
}

export function chainReadiness(projectId: number): ChainReadiness {
  const hasConstrutora = !!companyTypeExistsStmt.get(projectId, 'construtora');
  const hasGerenciadora = !!companyTypeExistsStmt.get(projectId, 'gerenciadora');
  const hasCliente = !!companyTypeExistsStmt.get(projectId, 'cliente');
  return { hasConstrutora, hasGerenciadora, hasCliente, chainComplete: hasConstrutora && hasCliente };
}
