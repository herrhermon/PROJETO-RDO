import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { requireAuth } from '../../middleware/requireAuth';
import { requireProjectAccess } from '../../middleware/requireProjectAccess';
import { requireIssuer, requireValidator } from '../../middleware/requireProjectCapability';
import { HttpError } from '../../middleware/errorHandler';
import { recordAudit } from '../../utils/audit';
import { companyTypeForLevel, getMembershipLevel } from '../projects/validation-chain.service';
import { assertRdoEditable, createRdo, deleteRdo, getCompletion, getRdo, listRdos, updateRdoFields } from './rdos.service';
import { approveRdo, getHistory, rejectRdo, signRdo, submitRdo, unsignRdo } from './rdo-status.service';
import { efetivoRouter } from './efetivo.routes';
import { equipamentosRouter } from './equipamentos.routes';
import { servicosRouter } from './servicos.routes';
import { comentariosRouter } from './comentarios.routes';
import { anexosRouter } from './anexos.routes';
import { generateRdoPdf } from '../pdf/pdf.service';

export const rdosRouter = Router({ mergeParams: true });

rdosRouter.use(requireAuth, requireProjectAccess);

rdosRouter.get('/', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const { from, to, status } = req.query as Record<string, string | undefined>;
  const rdos = listRdos(projectId, { from, to, status }).map((rdo) => ({
    ...rdo,
    waiting_company_type: rdo.status === 'em_validacao' && rdo.current_level != null ? companyTypeForLevel(projectId, rdo.current_level) : null,
  }));
  res.json({ rdos });
});

const createSchema = z.object({ referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

rdosRouter.post('/', requireIssuer, (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Data de referência inválida.' });
  const projectId = Number((req.params as any).projectId);
  const rdo = createRdo(projectId, parsed.data.referenceDate, req.user!.id);
  recordAudit({ entityType: 'rdo', entityId: rdo.id, action: 'create', userId: req.user!.id, projectId });
  res.status(201).json({ rdo });
});

rdosRouter.get('/:rdoId', (req, res) => {
  const rdo = getRdo(Number((req.params as any).projectId), Number((req.params as any).rdoId));
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  res.json({ rdo });
});

const updateSchema = z.object({
  periodoManhaClima: z.string().optional(),
  periodoManhaPraticavel: z.boolean().optional(),
  periodoTardeClima: z.string().optional(),
  periodoTardePraticavel: z.boolean().optional(),
  periodoNoiteClima: z.string().optional(),
  periodoNoitePraticavel: z.boolean().optional(),
  chuvaAcumuladaMm: z.number().optional(),
  chuvaFonte: z.enum(['manual', 'ecowitt', 'cemaden']).optional(),
  climaObservacoes: z.string().optional(),
});

rdosRouter.patch('/:rdoId', requireIssuer, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const projectId = Number((req.params as any).projectId);
  const rdo = updateRdoFields(projectId, Number((req.params as any).rdoId), parsed.data);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  recordAudit({ entityType: 'rdo', entityId: rdo.id, action: 'update', userId: req.user!.id, projectId });
  res.json({ rdo });
});

rdosRouter.delete('/:rdoId', requireIssuer, (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const ok = deleteRdo(projectId, rdoId);
  if (!ok) return res.status(404).json({ error: 'RDO não encontrado.' });
  recordAudit({ entityType: 'rdo', entityId: rdoId, action: 'delete', userId: req.user!.id, projectId });
  res.json({ ok: true });
});

rdosRouter.post('/:rdoId/sign', requireIssuer, (req, res) => {
  const rdo = signRdo(Number((req.params as any).projectId), Number((req.params as any).rdoId), req.user!.id);
  recordAudit({ entityType: 'rdo', entityId: rdo.id, action: 'update', userId: req.user!.id, projectId: Number((req.params as any).projectId), detail: { signed: true } });
  res.json({ rdo });
});

rdosRouter.post('/:rdoId/unsign', requireIssuer, (req, res) => {
  const rdo = unsignRdo(Number((req.params as any).projectId), Number((req.params as any).rdoId));
  recordAudit({ entityType: 'rdo', entityId: rdo.id, action: 'update', userId: req.user!.id, projectId: Number((req.params as any).projectId), detail: { unsigned: true } });
  res.json({ rdo });
});

function submitHandler(req: any, res: any) {
  const rdo = submitRdo(Number((req.params as any).projectId), Number((req.params as any).rdoId), req.user!.id);
  recordAudit({ entityType: 'rdo', entityId: rdo.id, action: 'update', userId: req.user!.id, projectId: Number((req.params as any).projectId), detail: { submitted: true } });
  res.json({ rdo });
}

rdosRouter.post('/:rdoId/submit', requireIssuer, submitHandler);
rdosRouter.post('/:rdoId/resubmit', requireIssuer, submitHandler);

function levelForUser(req: any): number {
  const projectId = Number((req.params as any).projectId);
  if (req.user!.isAdmin) {
    // Admin approves whatever level the RDO currently sits at.
    const rdo = getRdo(projectId, Number((req.params as any).rdoId));
    if (!rdo) throw new HttpError(404, 'RDO não encontrado.');
    if (rdo.status !== 'em_validacao' || rdo.current_level == null) throw new HttpError(409, 'Este RDO não está aguardando validação.');
    return rdo.current_level;
  }
  const level = getMembershipLevel(projectId, req.user!.id);
  if (level < 1) throw new HttpError(403, 'Você não tem um nível de validação associado a este projeto.');
  return level;
}

rdosRouter.post('/:rdoId/approve', requireValidator, (req, res) => {
  const level = levelForUser(req);
  const rdo = approveRdo(Number((req.params as any).projectId), Number((req.params as any).rdoId), req.user!.id, level);
  recordAudit({ entityType: 'rdo', entityId: rdo.id, action: 'update', userId: req.user!.id, projectId: Number((req.params as any).projectId), detail: { approvedLevel: level } });
  res.json({ rdo });
});

const rejectSchema = z.object({ reason: z.string().min(1) });

rdosRouter.post('/:rdoId/reject', requireValidator, (req, res) => {
  const parsed = rejectSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe o motivo da reprovação.' });
  const level = levelForUser(req);
  const rdo = rejectRdo(Number((req.params as any).projectId), Number((req.params as any).rdoId), req.user!.id, level, parsed.data.reason);
  recordAudit({ entityType: 'rdo', entityId: rdo.id, action: 'update', userId: req.user!.id, projectId: Number((req.params as any).projectId), detail: { rejectedLevel: level, reason: parsed.data.reason } });
  res.json({ rdo });
});

rdosRouter.get('/:rdoId/history', (req, res) => {
  res.json({ history: getHistory(Number((req.params as any).rdoId)) });
});

rdosRouter.get('/:rdoId/completion', (req, res) => {
  const rdo = getRdo(Number((req.params as any).projectId), Number((req.params as any).rdoId));
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  res.json({ completion: getCompletion(rdo) });
});

rdosRouter.get('/:rdoId/export/pdf', async (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  const buffer = await generateRdoPdf(projectId, rdoId);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="RDO-${rdo.rdo_number}.pdf"`);
  res.send(buffer);
});

rdosRouter.post('/:rdoId/autofill', requireIssuer, (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);

  const previous = db
    .prepare('SELECT id FROM rdos WHERE project_id = ? AND reference_date < ? ORDER BY reference_date DESC LIMIT 1')
    .get(projectId, rdo.reference_date) as { id: number } | undefined;
  if (!previous) return res.status(404).json({ error: 'Nenhum diário anterior encontrado para copiar.' });

  const efetivo = db.prepare('SELECT funcao, empresa, quantidade, turno, observacao FROM rdo_efetivo WHERE rdo_id = ?').all(previous.id) as any[];
  const equipamentos = db
    .prepare('SELECT tipo, propriedade, empresa, quantidade, observacao FROM rdo_equipamentos WHERE rdo_id = ?')
    .all(previous.id) as any[];
  const servicos = db
    .prepare('SELECT descricao, unidade, quantidade_executada, quantidade_planejada, empresa, localizacao, status_execucao, observacao FROM rdo_servicos WHERE rdo_id = ?')
    .all(previous.id) as any[];

  for (const e of efetivo) {
    db.prepare('INSERT INTO rdo_efetivo (rdo_id, funcao, empresa, quantidade, turno, observacao) VALUES (?, ?, ?, ?, ?, ?)').run(
      rdoId,
      e.funcao,
      e.empresa,
      e.quantidade,
      e.turno,
      e.observacao
    );
  }
  for (const eq of equipamentos) {
    db.prepare('INSERT INTO rdo_equipamentos (rdo_id, tipo, propriedade, empresa, quantidade, observacao) VALUES (?, ?, ?, ?, ?, ?)').run(
      rdoId,
      eq.tipo,
      eq.propriedade,
      eq.empresa,
      eq.quantidade,
      eq.observacao
    );
  }
  for (const s of servicos) {
    db.prepare(
      `INSERT INTO rdo_servicos (rdo_id, descricao, unidade, quantidade_executada, quantidade_planejada, empresa, localizacao, status_execucao, observacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(rdoId, s.descricao, s.unidade, s.quantidade_executada, s.quantidade_planejada, s.empresa, s.localizacao, s.status_execucao, s.observacao);
  }

  recordAudit({ entityType: 'rdo', entityId: rdoId, action: 'update', userId: req.user!.id, projectId, detail: { autofilledFrom: previous.id } });
  res.json({
    efetivo: db.prepare('SELECT * FROM rdo_efetivo WHERE rdo_id = ? ORDER BY id').all(rdoId),
    equipamentos: db.prepare('SELECT * FROM rdo_equipamentos WHERE rdo_id = ? ORDER BY id').all(rdoId),
    servicos: db.prepare('SELECT * FROM rdo_servicos WHERE rdo_id = ? ORDER BY id').all(rdoId),
  });
});

rdosRouter.post('/:rdoId/apply-template/:templateId', requireIssuer, (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);

  const template = db.prepare('SELECT * FROM rdo_templates WHERE id = ? AND project_id = ?').get(req.params.templateId, projectId) as any;
  if (!template) return res.status(404).json({ error: 'Modelo não encontrado.' });

  db.prepare('DELETE FROM rdo_efetivo WHERE rdo_id = ?').run(rdoId);
  db.prepare('DELETE FROM rdo_equipamentos WHERE rdo_id = ?').run(rdoId);
  db.prepare('DELETE FROM rdo_servicos WHERE rdo_id = ?').run(rdoId);
  const templateEfetivo = db.prepare('SELECT funcao, empresa, quantidade, turno FROM rdo_template_efetivo WHERE template_id = ?').all(template.id) as any[];
  const templateEquipamentos = db
    .prepare('SELECT tipo, propriedade, empresa, quantidade FROM rdo_template_equipamentos WHERE template_id = ?')
    .all(template.id) as any[];
  const templateServicos = db
    .prepare('SELECT descricao, unidade, quantidade_planejada, empresa FROM rdo_template_servicos WHERE template_id = ?')
    .all(template.id) as any[];
  for (const e of templateEfetivo) {
    db.prepare('INSERT INTO rdo_efetivo (rdo_id, funcao, empresa, quantidade, turno) VALUES (?, ?, ?, ?, ?)').run(rdoId, e.funcao, e.empresa, e.quantidade, e.turno);
  }
  for (const eq of templateEquipamentos) {
    db.prepare('INSERT INTO rdo_equipamentos (rdo_id, tipo, propriedade, empresa, quantidade) VALUES (?, ?, ?, ?, ?)').run(
      rdoId,
      eq.tipo,
      eq.propriedade,
      eq.empresa,
      eq.quantidade
    );
  }
  for (const s of templateServicos) {
    db.prepare('INSERT INTO rdo_servicos (rdo_id, descricao, unidade, quantidade_planejada, empresa) VALUES (?, ?, ?, ?, ?)').run(
      rdoId,
      s.descricao,
      s.unidade,
      s.quantidade_planejada,
      s.empresa
    );
  }
  const templateComentarios = db.prepare('SELECT texto FROM rdo_template_comentarios WHERE template_id = ?').all(template.id) as { texto: string }[];
  for (const c of templateComentarios) {
    db.prepare("INSERT INTO rdo_comentarios (rdo_id, author_id, tipo, texto) VALUES (?, ?, 'comentario', ?)").run(rdoId, req.user!.id, c.texto);
  }

  db.prepare(`UPDATE rdos SET updated_at = datetime('now') WHERE id = ?`).run(rdoId);

  recordAudit({ entityType: 'rdo', entityId: rdoId, action: 'update', userId: req.user!.id, projectId, detail: { appliedTemplate: template.id } });
  res.json({ rdo: getRdo(projectId, rdoId) });
});

rdosRouter.use('/:rdoId/efetivo', efetivoRouter);
rdosRouter.use('/:rdoId/equipamentos', equipamentosRouter);
rdosRouter.use('/:rdoId/servicos', servicosRouter);
rdosRouter.use('/:rdoId/comentarios', comentariosRouter);
rdosRouter.use('/:rdoId/anexos', anexosRouter);
