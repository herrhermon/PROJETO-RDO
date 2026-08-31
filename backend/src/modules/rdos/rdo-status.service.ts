import { db } from '../../db/connection';
import { HttpError } from '../../middleware/errorHandler';
import { getMembershipLevel, getValidationChain } from '../projects/validation-chain.service';
import { getCompletion, getRdo, type RdoRow } from './rdos.service';

function recordHistory(rdoId: number, fromStatus: string | null, toStatus: string, level: number | null, changedBy: number, reason?: string | null) {
  db.prepare(`INSERT INTO rdo_status_history (rdo_id, from_status, to_status, level, changed_by, reason) VALUES (?, ?, ?, ?, ?, ?)`).run(
    rdoId,
    fromStatus,
    toStatus,
    level,
    changedBy,
    reason ?? null
  );
}

export function signRdo(projectId: number, rdoId: number, userId: number): RdoRow {
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) throw new HttpError(404, 'RDO não encontrado.');
  if (rdo.status !== 'em_edicao' && rdo.status !== 'reprovado') {
    throw new HttpError(409, 'Só é possível assinar um RDO em edição ou reprovado.');
  }
  db.prepare(`UPDATE rdos SET signed_by = ?, signed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(userId, rdoId);
  return getRdo(projectId, rdoId)!;
}

export function unsignRdo(projectId: number, rdoId: number): RdoRow {
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) throw new HttpError(404, 'RDO não encontrado.');
  if (rdo.status !== 'em_edicao' && rdo.status !== 'reprovado') {
    throw new HttpError(409, 'Este RDO já foi submetido e não pode mais ter a assinatura desfeita.');
  }
  if (!rdo.signed_by) {
    throw new HttpError(409, 'Este RDO ainda não foi assinado.');
  }
  db.prepare(`UPDATE rdos SET signed_by = NULL, signed_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(rdoId);
  return getRdo(projectId, rdoId)!;
}

export function submitRdo(projectId: number, rdoId: number, userId: number): RdoRow {
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) throw new HttpError(404, 'RDO não encontrado.');
  if (rdo.status !== 'em_edicao' && rdo.status !== 'reprovado') {
    throw new HttpError(409, 'Este RDO já foi submetido.');
  }
  if (!rdo.signed_by) {
    throw new HttpError(400, 'É necessário assinar o RDO antes de submeter para validação.');
  }
  const completion = getCompletion(rdo);
  if (!completion.climaFilled) {
    throw new HttpError(400, 'Informe as condições climáticas antes de submeter o RDO.');
  }
  const hasActivity = completion.efetivoCount > 0 || completion.equipamentosCount > 0 || completion.servicosCount > 0 || completion.comentariosCount > 0;
  if (!hasActivity) {
    throw new HttpError(400, 'Registre ao menos uma atividade (efetivo, equipamentos ou serviços) ou um comentário antes de submeter o RDO.');
  }
  const chain = getValidationChain(projectId);
  if (chain.length === 0) {
    throw new HttpError(409, 'Este projeto ainda não tem uma empresa Cliente cadastrada — não é possível submeter para validação.');
  }
  const signerLevel = getMembershipLevel(projectId, rdo.signed_by);
  const nextLevel = chain.find((l) => l > signerLevel);
  if (nextLevel === undefined) {
    throw new HttpError(409, 'Não foi possível determinar o próximo nível de validação para este RDO.');
  }
  db.prepare(
    `UPDATE rdos SET status = 'em_validacao', current_level = ?, submitted_at = datetime('now'), rejected_reason = NULL, updated_at = datetime('now') WHERE id = ?`
  ).run(nextLevel, rdoId);
  recordHistory(rdoId, rdo.status, 'em_validacao', nextLevel, userId);
  return getRdo(projectId, rdoId)!;
}

export function approveRdo(projectId: number, rdoId: number, userId: number, level: number): RdoRow {
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) throw new HttpError(404, 'RDO não encontrado.');
  if (rdo.status !== 'em_validacao' || rdo.current_level !== level) {
    throw new HttpError(409, `Este RDO não está aguardando validação no Nível ${level}.`);
  }
  const chain = getValidationChain(projectId);
  const idx = chain.indexOf(level);
  if (idx === -1) {
    throw new HttpError(409, 'Nível de validação inválido para a hierarquia atual deste projeto.');
  }
  const isFinal = idx === chain.length - 1;
  if (isFinal) {
    db.prepare(`UPDATE rdos SET status = 'concluido', current_level = NULL, approved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(
      rdoId
    );
    recordHistory(rdoId, rdo.status, 'concluido', level, userId);
  } else {
    const nextLevel = chain[idx + 1];
    db.prepare(`UPDATE rdos SET status = 'em_validacao', current_level = ?, updated_at = datetime('now') WHERE id = ?`).run(nextLevel, rdoId);
    recordHistory(rdoId, rdo.status, 'em_validacao', nextLevel, userId);
  }
  return getRdo(projectId, rdoId)!;
}

export function rejectRdo(projectId: number, rdoId: number, userId: number, level: number, reason: string): RdoRow {
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) throw new HttpError(404, 'RDO não encontrado.');
  if (rdo.status !== 'em_validacao' || rdo.current_level !== level) {
    throw new HttpError(409, `Este RDO não está aguardando validação no Nível ${level}.`);
  }
  db.prepare(
    `UPDATE rdos SET status = 'reprovado', current_level = NULL, rejected_reason = ?, signed_by = NULL, signed_at = NULL, updated_at = datetime('now') WHERE id = ?`
  ).run(reason, rdoId);
  recordHistory(rdoId, rdo.status, 'reprovado', level, userId, reason);
  return getRdo(projectId, rdoId)!;
}

export function getHistory(rdoId: number) {
  return db
    .prepare(
      `SELECT h.id, h.from_status, h.to_status, h.level, h.reason, h.changed_at, u.name as changed_by_name
       FROM rdo_status_history h
       LEFT JOIN users u ON u.id = h.changed_by
       WHERE h.rdo_id = ?
       ORDER BY h.changed_at ASC`
    )
    .all(rdoId);
}
