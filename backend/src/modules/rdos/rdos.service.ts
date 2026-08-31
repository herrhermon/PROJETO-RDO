import { db } from '../../db/connection';
import { isFutureDate } from '../../utils/dateUtils';
import { HttpError } from '../../middleware/errorHandler';

export interface RdoRow {
  id: number;
  project_id: number;
  rdo_number: number;
  reference_date: string;
  status: string;
  current_level: number | null;
  periodo_manha_clima: string | null;
  periodo_manha_praticavel: number | null;
  periodo_tarde_clima: string | null;
  periodo_tarde_praticavel: number | null;
  periodo_noite_clima: string | null;
  periodo_noite_praticavel: number | null;
  chuva_acumulada_mm: number | null;
  chuva_fonte: string | null;
  clima_observacoes: string | null;
  created_by: number | null;
  signed_by: number | null;
  signed_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

const listByProjectStmt = db.prepare('SELECT * FROM rdos WHERE project_id = ? ORDER BY reference_date DESC');
const getByIdStmt = db.prepare('SELECT * FROM rdos WHERE id = ? AND project_id = ?');
const nextNumberStmt = db.prepare('SELECT COALESCE(MAX(rdo_number), 0) + 1 AS next FROM rdos WHERE project_id = ?');
const getByDateStmt = db.prepare('SELECT * FROM rdos WHERE project_id = ? AND reference_date = ?');

export interface RdoListItem extends RdoRow {
  creator_name: string | null;
  completion_pct: number;
}

const listWithMetaStmt = db.prepare(`
  SELECT r.*, u.name AS creator_name,
    (CASE WHEN r.periodo_manha_clima IS NOT NULL OR r.periodo_tarde_clima IS NOT NULL OR r.periodo_noite_clima IS NOT NULL THEN 1 ELSE 0 END) AS clima_filled,
    (SELECT COUNT(*) FROM rdo_efetivo WHERE rdo_id = r.id) AS efetivo_count,
    (SELECT COUNT(*) FROM rdo_equipamentos WHERE rdo_id = r.id) AS equipamentos_count,
    (SELECT COUNT(*) FROM rdo_servicos WHERE rdo_id = r.id) AS servicos_count,
    (SELECT COUNT(*) FROM rdo_comentarios WHERE rdo_id = r.id) AS comentarios_count
  FROM rdos r
  LEFT JOIN users u ON u.id = r.created_by
  WHERE r.project_id = ?
  ORDER BY r.reference_date DESC
`);

export function listRdos(projectId: number, filters: { from?: string; to?: string; status?: string }): RdoListItem[] {
  let rows = listWithMetaStmt.all(projectId) as unknown as Array<
    RdoRow & { creator_name: string | null; clima_filled: number; efetivo_count: number; equipamentos_count: number; servicos_count: number; comentarios_count: number }
  >;
  if (filters.from) rows = rows.filter((r) => r.reference_date >= filters.from!);
  if (filters.to) rows = rows.filter((r) => r.reference_date <= filters.to!);
  if (filters.status) rows = rows.filter((r) => r.status === filters.status);
  return rows.map((r) => {
    const { clima_filled, efetivo_count, equipamentos_count, servicos_count, comentarios_count, ...rest } = r;
    const doneCount = [clima_filled === 1, efetivo_count > 0, equipamentos_count > 0, servicos_count > 0, comentarios_count > 0].filter(Boolean).length;
    return { ...rest, completion_pct: Math.round((doneCount / 5) * 100) };
  });
}

export function getRdo(projectId: number, rdoId: number): RdoRow | undefined {
  return getByIdStmt.get(rdoId, projectId) as unknown as RdoRow | undefined;
}

export function createRdo(projectId: number, referenceDate: string, createdBy: number): RdoRow {
  if (isFutureDate(referenceDate)) {
    throw new HttpError(400, 'Não é possível criar um RDO com data futura.');
  }
  const project = db.prepare('SELECT start_date FROM projects WHERE id = ?').get(projectId) as { start_date: string } | undefined;
  if (project && referenceDate < project.start_date) {
    throw new HttpError(400, `Não é possível criar um RDO anterior à data de início do projeto (${project.start_date}).`);
  }
  const existing = getByDateStmt.get(projectId, referenceDate);
  if (existing) {
    throw new HttpError(409, 'Já existe um RDO para esta data.');
  }
  const { next } = nextNumberStmt.get(projectId) as { next: number };
  const result = db
    .prepare(
      `INSERT INTO rdos (project_id, rdo_number, reference_date, status, created_by)
       VALUES (?, ?, ?, 'em_edicao', ?)`
    )
    .run(projectId, next, referenceDate, createdBy);
  return getByIdStmt.get(result.lastInsertRowid, projectId) as unknown as RdoRow;
}

export function updateRdoFields(
  projectId: number,
  rdoId: number,
  fields: Partial<{
    periodoManhaClima: string;
    periodoManhaPraticavel: boolean;
    periodoTardeClima: string;
    periodoTardePraticavel: boolean;
    periodoNoiteClima: string;
    periodoNoitePraticavel: boolean;
    chuvaAcumuladaMm: number;
    chuvaFonte: string;
    climaObservacoes: string;
  }>
): RdoRow | undefined {
  const current = getRdo(projectId, rdoId);
  if (!current) return undefined;
  if (current.status !== 'em_edicao' && current.status !== 'reprovado') {
    throw new HttpError(409, 'Este RDO não pode mais ser editado no status atual.');
  }
  db.prepare(
    `UPDATE rdos SET
       periodo_manha_clima = COALESCE(?, periodo_manha_clima),
       periodo_manha_praticavel = COALESCE(?, periodo_manha_praticavel),
       periodo_tarde_clima = COALESCE(?, periodo_tarde_clima),
       periodo_tarde_praticavel = COALESCE(?, periodo_tarde_praticavel),
       periodo_noite_clima = COALESCE(?, periodo_noite_clima),
       periodo_noite_praticavel = COALESCE(?, periodo_noite_praticavel),
       chuva_acumulada_mm = COALESCE(?, chuva_acumulada_mm),
       chuva_fonte = COALESCE(?, chuva_fonte),
       clima_observacoes = COALESCE(?, clima_observacoes),
       updated_at = datetime('now')
     WHERE id = ? AND project_id = ?`
  ).run(
    fields.periodoManhaClima ?? null,
    fields.periodoManhaPraticavel === undefined ? null : fields.periodoManhaPraticavel ? 1 : 0,
    fields.periodoTardeClima ?? null,
    fields.periodoTardePraticavel === undefined ? null : fields.periodoTardePraticavel ? 1 : 0,
    fields.periodoNoiteClima ?? null,
    fields.periodoNoitePraticavel === undefined ? null : fields.periodoNoitePraticavel ? 1 : 0,
    fields.chuvaAcumuladaMm ?? null,
    fields.chuvaFonte ?? null,
    fields.climaObservacoes ?? null,
    rdoId,
    projectId
  );
  return getRdo(projectId, rdoId);
}

export function assertRdoEditable(rdo: RdoRow) {
  if (rdo.status !== 'em_edicao' && rdo.status !== 'reprovado') {
    throw new HttpError(409, 'Este RDO não pode mais ser editado no status atual.');
  }
}

export interface RdoCompletion {
  climaFilled: boolean;
  efetivoCount: number;
  equipamentosCount: number;
  servicosCount: number;
  comentariosCount: number;
  fotosCount: number;
  documentosCount: number;
}

function countRows(table: string, rdoId: number, extraWhere = ''): number {
  const row = db.prepare(`SELECT COUNT(*) as c FROM ${table} WHERE rdo_id = ?${extraWhere}`).get(rdoId) as { c: number };
  return row.c;
}

export function getCompletion(rdo: RdoRow): RdoCompletion {
  return {
    climaFilled: !!(rdo.periodo_manha_clima || rdo.periodo_tarde_clima || rdo.periodo_noite_clima),
    efetivoCount: countRows('rdo_efetivo', rdo.id),
    equipamentosCount: countRows('rdo_equipamentos', rdo.id),
    servicosCount: countRows('rdo_servicos', rdo.id),
    comentariosCount: countRows('rdo_comentarios', rdo.id),
    fotosCount: countRows('rdo_anexos', rdo.id, " AND tipo = 'foto'"),
    documentosCount: countRows('rdo_anexos', rdo.id, " AND tipo = 'documento'"),
  };
}

export function deleteRdo(projectId: number, rdoId: number): boolean {
  const current = getRdo(projectId, rdoId);
  if (!current) return false;
  if (current.status !== 'em_edicao') {
    throw new HttpError(409, 'Só é possível excluir um RDO que ainda está em edição.');
  }
  db.prepare('DELETE FROM rdos WHERE id = ? AND project_id = ?').run(rdoId, projectId);
  return true;
}
