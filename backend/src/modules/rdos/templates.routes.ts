import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../db/connection';
import { requireAuth } from '../../middleware/requireAuth';
import { requireProjectAccess } from '../../middleware/requireProjectAccess';
import { requireIssuer } from '../../middleware/requireProjectCapability';
import { recordAudit } from '../../utils/audit';

export const templatesRouter = Router({ mergeParams: true });

templatesRouter.use(requireAuth, requireProjectAccess);

function getTemplateFull(id: number, projectId: number) {
  const template = db.prepare('SELECT * FROM rdo_templates WHERE id = ? AND project_id = ?').get(id, projectId) as any;
  if (!template) return null;
  const efetivo = db.prepare('SELECT * FROM rdo_template_efetivo WHERE template_id = ? ORDER BY id').all(id);
  const equipamentos = db.prepare('SELECT * FROM rdo_template_equipamentos WHERE template_id = ? ORDER BY id').all(id);
  const servicos = db.prepare('SELECT * FROM rdo_template_servicos WHERE template_id = ? ORDER BY id').all(id);
  const comentarios = db.prepare('SELECT * FROM rdo_template_comentarios WHERE template_id = ? ORDER BY id').all(id);
  return { ...template, efetivo, equipamentos, servicos, comentarios };
}

templatesRouter.get('/', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rows = db.prepare('SELECT id FROM rdo_templates WHERE project_id = ? ORDER BY nome').all(projectId) as { id: number }[];
  res.json({ templates: rows.map((r) => getTemplateFull(r.id, projectId)) });
});

const efetivoItemSchema = z.object({
  funcao: z.string().min(1),
  empresa: z.string().optional(),
  quantidade: z.number().int().min(0),
  turno: z.enum(['manha', 'tarde', 'noite', 'integral']).optional(),
});

const equipamentoItemSchema = z.object({
  tipo: z.string().min(1),
  propriedade: z.enum(['proprio', 'alugado', 'terceiro']),
  empresa: z.string().optional(),
  quantidade: z.number().int().min(0),
});

const servicoItemSchema = z.object({
  descricao: z.string().min(1),
  unidade: z.string().optional(),
  quantidadePlanejada: z.number().min(0).optional(),
  empresa: z.string().optional(),
});

const comentarioItemSchema = z.object({
  texto: z.string().min(1),
});

const templateSchema = z.object({
  nome: z.string().min(1),
  efetivo: z.array(efetivoItemSchema).default([]),
  equipamentos: z.array(equipamentoItemSchema).default([]),
  servicos: z.array(servicoItemSchema).default([]),
  comentarios: z.array(comentarioItemSchema).default([]),
});

function saveTemplateChildren(
  templateId: number,
  efetivo: z.infer<typeof efetivoItemSchema>[],
  equipamentos: z.infer<typeof equipamentoItemSchema>[],
  servicos: z.infer<typeof servicoItemSchema>[],
  comentarios: z.infer<typeof comentarioItemSchema>[]
) {
  db.prepare('DELETE FROM rdo_template_efetivo WHERE template_id = ?').run(templateId);
  db.prepare('DELETE FROM rdo_template_equipamentos WHERE template_id = ?').run(templateId);
  db.prepare('DELETE FROM rdo_template_servicos WHERE template_id = ?').run(templateId);
  db.prepare('DELETE FROM rdo_template_comentarios WHERE template_id = ?').run(templateId);
  for (const e of efetivo) {
    db.prepare('INSERT INTO rdo_template_efetivo (template_id, funcao, empresa, quantidade, turno) VALUES (?, ?, ?, ?, ?)').run(
      templateId,
      e.funcao,
      e.empresa ?? null,
      e.quantidade,
      e.turno ?? null
    );
  }
  for (const eq of equipamentos) {
    db.prepare('INSERT INTO rdo_template_equipamentos (template_id, tipo, propriedade, empresa, quantidade) VALUES (?, ?, ?, ?, ?)').run(
      templateId,
      eq.tipo,
      eq.propriedade,
      eq.empresa ?? null,
      eq.quantidade
    );
  }
  for (const s of servicos) {
    db.prepare('INSERT INTO rdo_template_servicos (template_id, descricao, unidade, quantidade_planejada, empresa) VALUES (?, ?, ?, ?, ?)').run(
      templateId,
      s.descricao,
      s.unidade ?? null,
      s.quantidadePlanejada ?? null,
      s.empresa ?? null
    );
  }
  for (const c of comentarios) {
    db.prepare('INSERT INTO rdo_template_comentarios (template_id, texto) VALUES (?, ?)').run(templateId, c.texto);
  }
}

templatesRouter.post('/', requireIssuer, (req, res) => {
  const parsed = templateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const projectId = Number((req.params as any).projectId);
  const d = parsed.data;
  const existing = db.prepare('SELECT id FROM rdo_templates WHERE project_id = ? AND nome = ? COLLATE NOCASE').get(projectId, d.nome);
  if (existing) return res.status(409).json({ error: 'Já existe um modelo com esse nome.' });
  const result = db.prepare('INSERT INTO rdo_templates (project_id, nome) VALUES (?, ?)').run(projectId, d.nome);
  const templateId = Number(result.lastInsertRowid);
  saveTemplateChildren(templateId, d.efetivo, d.equipamentos, d.servicos, d.comentarios);
  recordAudit({ entityType: 'rdo_templates', entityId: templateId, action: 'create', userId: req.user!.id, projectId });
  res.status(201).json({ template: getTemplateFull(templateId, projectId) });
});

templatesRouter.patch('/:id', requireIssuer, (req, res) => {
  const parsed = templateSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.', details: parsed.error.flatten() });
  const projectId = Number((req.params as any).projectId);
  const templateId = Number(req.params.id);
  const current = db.prepare('SELECT * FROM rdo_templates WHERE id = ? AND project_id = ?').get(templateId, projectId) as any;
  if (!current) return res.status(404).json({ error: 'Modelo não encontrado.' });
  const d = parsed.data;
  db.prepare(`UPDATE rdo_templates SET nome=?, updated_at=datetime('now') WHERE id = ?`).run(d.nome ?? current.nome, templateId);
  if (d.efetivo !== undefined || d.equipamentos !== undefined || d.servicos !== undefined || d.comentarios !== undefined) {
    const efetivo = d.efetivo ?? (db.prepare('SELECT funcao, empresa, quantidade, turno FROM rdo_template_efetivo WHERE template_id = ?').all(templateId) as any);
    const equipamentos =
      d.equipamentos ?? (db.prepare('SELECT tipo, propriedade, empresa, quantidade FROM rdo_template_equipamentos WHERE template_id = ?').all(templateId) as any);
    const servicos =
      d.servicos ??
      (db.prepare('SELECT descricao, unidade, quantidade_planejada AS quantidadePlanejada, empresa FROM rdo_template_servicos WHERE template_id = ?').all(templateId) as any);
    const comentarios = d.comentarios ?? (db.prepare('SELECT texto FROM rdo_template_comentarios WHERE template_id = ?').all(templateId) as any);
    saveTemplateChildren(templateId, efetivo, equipamentos, servicos, comentarios);
  }
  recordAudit({ entityType: 'rdo_templates', entityId: templateId, action: 'update', userId: req.user!.id, projectId });
  res.json({ template: getTemplateFull(templateId, projectId) });
});

templatesRouter.delete('/:id', requireIssuer, (req, res) => {
  const projectId = Number((req.params as any).projectId);
  db.prepare('DELETE FROM rdo_templates WHERE id = ? AND project_id = ?').run(req.params.id, projectId);
  recordAudit({ entityType: 'rdo_templates', entityId: Number(req.params.id), action: 'delete', userId: req.user!.id, projectId });
  res.json({ ok: true });
});
