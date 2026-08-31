import { db } from '../../db/connection';
import { todayISODate } from '../../utils/dateUtils';
import { RDO_STATUS_LABELS } from '../../utils/constants/rdoStatus';
import { getMembershipCompanyType, getMembershipLevel, getValidationChain } from '../projects/validation-chain.service';
import { fetchWeatherForProject } from '../weather/weather.service';
import type { ProjectRow } from '../projects/projects.service';

export async function buildDashboard(project: ProjectRow) {
  const today = todayISODate();
  const todayRdo = db
    .prepare('SELECT id, status FROM rdos WHERE project_id = ? AND reference_date = ?')
    .get(project.id, today) as { id: number; status: string } | undefined;

  let elapsedDays: number | null = null;
  let totalDays: number | null = null;
  if (project.start_date && project.planned_end_date) {
    const start = new Date(project.start_date).getTime();
    const end = new Date(project.planned_end_date).getTime();
    const now = Date.now();
    totalDays = Math.max(1, Math.round((end - start) / 86400000));
    elapsedDays = Math.min(totalDays, Math.max(0, Math.round((now - start) / 86400000)));
  }

  const weather = await fetchWeatherForProject(project);

  return {
    physicalProgressPct: project.physical_progress_pct,
    elapsedDays,
    totalDays,
    todayRdo: todayRdo
      ? { id: todayRdo.id, status: todayRdo.status, statusLabel: RDO_STATUS_LABELS[todayRdo.status as keyof typeof RDO_STATUS_LABELS] }
      : null,
    weather,
  };
}

export function buildPendencias(projectId: number, userId: number, isAdmin: boolean) {
  const items: { type: string; message: string; rdoId?: number }[] = [];
  const chain = getValidationChain(projectId);
  const companyType = isAdmin ? null : getMembershipCompanyType(projectId, userId);
  const isEditor = isAdmin || companyType === 'construtora';

  const levelsForUser = isAdmin ? chain : [getMembershipLevel(projectId, userId)].filter((l) => l >= 1);
  const uniqueLevels = Array.from(new Set(levelsForUser));
  for (const level of uniqueLevels) {
    const rows = db
      .prepare("SELECT id, reference_date FROM rdos WHERE project_id = ? AND status = 'em_validacao' AND current_level = ? ORDER BY reference_date")
      .all(projectId, level) as { id: number; reference_date: string }[];
    for (const row of rows) {
      items.push({ type: 'validacao', message: `RDO de ${row.reference_date} aguardando validação (Nível ${level})`, rdoId: row.id });
    }
  }

  if (isEditor) {
    const today = todayISODate();
    const todayRdo = db.prepare('SELECT id FROM rdos WHERE project_id = ? AND reference_date = ?').get(projectId, today);
    if (!todayRdo) {
      items.push({ type: 'rdo_nao_emitido', message: 'RDO de hoje ainda não foi emitido.' });
    }
    const reprovados = db
      .prepare("SELECT id, reference_date FROM rdos WHERE project_id = ? AND status = 'reprovado' ORDER BY reference_date")
      .all(projectId) as { id: number; reference_date: string }[];
    for (const row of reprovados) {
      items.push({ type: 'reprovado', message: `RDO de ${row.reference_date} foi reprovado e aguarda correção.`, rdoId: row.id });
    }
  }

  return items;
}
