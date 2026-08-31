import { db } from './connection';
import { hashPassword } from '../modules/auth/auth.service';
import { toLocalISODate } from '../utils/dateUtils';
import { geocodeCity } from '../modules/weather/geocode.service';

const SEED_PASSWORD = 'Eqtec@123';

type SeedRole = 'master' | 'org_admin' | 'member';

function upsertUser(name: string, email: string, role: SeedRole = 'member', organizationId: number | null = null): number {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: number } | undefined;
  if (existing) {
    db.prepare("UPDATE users SET role = ?, organization_id = ? WHERE id = ?").run(role, organizationId, existing.id);
    return existing.id;
  }
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role, organization_id, must_reset_password) VALUES (?, ?, ?, ?, ?, 1)')
    .run(name, email, hashPassword(SEED_PASSWORD), role, organizationId);
  return Number(result.lastInsertRowid);
}

function upsertOrganization(nome: string): number {
  const existing = db.prepare('SELECT id FROM organizations WHERE nome = ?').get(nome) as { id: number } | undefined;
  if (existing) return existing.id;
  const result = db.prepare('INSERT INTO organizations (nome) VALUES (?)').run(nome);
  return Number(result.lastInsertRowid);
}

async function upsertProject(input: {
  name: string;
  code: string;
  city: string;
  state: string;
  country: string;
  startDate: string;
  plannedEndDate: string;
  progress: number;
}): Promise<number> {
  const existing = db.prepare('SELECT id FROM projects WHERE code = ?').get(input.code) as { id: number } | undefined;
  if (existing) return existing.id;
  const geo = await geocodeCity(input.city, input.state, input.country);
  if (!geo) console.warn(`Não foi possível geocodificar ${input.city}/${input.state} — previsão do tempo ficará indisponível para este projeto de demonstração.`);
  const result = db
    .prepare(
      `INSERT INTO projects (name, code, city, state, country, latitude, longitude, start_date, planned_end_date, physical_progress_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(input.name, input.code, input.city, input.state, input.country, geo?.latitude ?? null, geo?.longitude ?? null, input.startDate, input.plannedEndDate, input.progress);
  return Number(result.lastInsertRowid);
}

function upsertCompany(projectId: number, tipo: 'construtora' | 'gerenciadora' | 'cliente', nome: string, organizationId: number | null = null): number {
  const existing = db.prepare('SELECT id FROM project_companies WHERE project_id = ? AND tipo = ? AND nome = ?').get(projectId, tipo, nome) as
    | { id: number }
    | undefined;
  if (existing) {
    if (organizationId) db.prepare('UPDATE project_companies SET organization_id = ? WHERE id = ?').run(organizationId, existing.id);
    return existing.id;
  }
  const result = db.prepare('INSERT INTO project_companies (project_id, tipo, nome, organization_id) VALUES (?, ?, ?, ?)').run(projectId, tipo, nome, organizationId);
  return Number(result.lastInsertRowid);
}

function addMember(projectId: number, userId: number, companyId: number | null = null, level = 0) {
  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId);
  if (existing) {
    db.prepare('UPDATE project_members SET company_id = ?, level = ? WHERE project_id = ? AND user_id = ?').run(companyId, level, projectId, userId);
  } else {
    db.prepare('INSERT INTO project_members (project_id, user_id, company_id, level) VALUES (?, ?, ?, ?)').run(projectId, userId, companyId, level);
  }
}

function seedCatalog(projectId: number) {
  const funcoes = ['Pedreiro', 'Servente', 'Encarregado', 'Armador', 'Carpinteiro', 'Eletricista'];
  const empresas = ['Construtora Alfa', 'Fundações Beta', 'Elétrica Gama'];
  for (const nome of funcoes) {
    db.prepare('INSERT OR IGNORE INTO project_funcoes (project_id, nome) VALUES (?, ?)').run(projectId, nome);
  }
  for (const nome of empresas) {
    db.prepare('INSERT OR IGNORE INTO project_empresas (project_id, nome) VALUES (?, ?)').run(projectId, nome);
  }
}

function seedTemplate(projectId: number) {
  const existing = db.prepare('SELECT id FROM rdo_templates WHERE project_id = ? AND nome = ?').get(projectId, 'Domingo / Feriado');
  if (existing) return;
  const result = db.prepare(`INSERT INTO rdo_templates (project_id, nome) VALUES (?, 'Domingo / Feriado')`).run(projectId);
  const templateId = Number(result.lastInsertRowid);
  db.prepare('INSERT INTO rdo_template_efetivo (template_id, funcao, empresa, quantidade, turno) VALUES (?, ?, ?, ?, ?)').run(
    templateId,
    'Vigia',
    'Construtora Alfa',
    1,
    'integral'
  );
  db.prepare('INSERT INTO rdo_template_servicos (template_id, descricao, unidade, quantidade_planejada, empresa) VALUES (?, ?, ?, ?, ?)').run(
    templateId,
    'Segurança patrimonial',
    null,
    null,
    'Construtora Alfa'
  );
  db.prepare('INSERT INTO rdo_template_comentarios (template_id, texto) VALUES (?, ?)').run(templateId, 'Não houve expediente (domingo/feriado).');
}

function seedRdos(projectId: number, editorId: number, entries: { status: string; level?: number }[]) {
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM rdos WHERE project_id = ?').get(projectId) as { c: number };
  if (existingCount.c > 0) return;

  const climas = ['Ensolarado', 'Nublado', 'Chuvoso', 'Ensolarado', 'Nublado'];
  const condicoes = ['Praticável', 'Praticável', 'Impraticável', 'Praticável', 'Praticável'];

  const today = new Date();
  let rdoNumber = 1;
  for (let i = entries.length; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = toLocalISODate(date);
    const { status, level } = entries[entries.length - i];
    const clima = climas[i % climas.length];
    const condicao = condicoes[i % condicoes.length];
    const isSigned = status !== 'em_edicao';

    const praticavel = condicao === 'Praticável' ? 1 : 0;
    const result = db
      .prepare(
        `INSERT INTO rdos (project_id, rdo_number, reference_date, status, current_level,
           periodo_manha_clima, periodo_manha_praticavel, periodo_tarde_clima, periodo_tarde_praticavel, periodo_noite_clima, periodo_noite_praticavel,
           chuva_acumulada_mm, created_by, signed_by, signed_at, submitted_at, approved_at, rejected_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        projectId,
        rdoNumber++,
        dateStr,
        status,
        status === 'em_validacao' ? level ?? null : null,
        clima,
        praticavel,
        clima,
        praticavel,
        clima,
        praticavel,
        clima === 'Chuvoso' ? 18 : 0,
        editorId,
        isSigned ? editorId : null,
        isSigned ? `${dateStr}T17:00:00` : null,
        status !== 'em_edicao' ? `${dateStr}T17:05:00` : null,
        status === 'concluido' ? `${dateStr}T18:00:00` : null,
        status === 'reprovado' ? 'Efetivo divergente do relatório de campo. Corrigir e reenviar.' : null
      );
    const rdoId = Number(result.lastInsertRowid);

    db.prepare('INSERT INTO rdo_efetivo (rdo_id, funcao, empresa, quantidade, turno) VALUES (?, ?, ?, ?, ?)').run(
      rdoId,
      'Pedreiro',
      'Construtora Alfa',
      12,
      'integral'
    );
    db.prepare('INSERT INTO rdo_efetivo (rdo_id, funcao, empresa, quantidade, turno) VALUES (?, ?, ?, ?, ?)').run(
      rdoId,
      'Servente',
      'Construtora Alfa',
      8,
      'integral'
    );
    db.prepare('INSERT INTO rdo_equipamentos (rdo_id, tipo, propriedade, empresa, quantidade) VALUES (?, ?, ?, ?, ?)').run(
      rdoId,
      'Betoneira',
      'alugado',
      'Construtora Alfa',
      2
    );
    db.prepare(
      'INSERT INTO rdo_servicos (rdo_id, descricao, unidade, quantidade_executada, quantidade_planejada, empresa, status_execucao) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(rdoId, 'Concretagem de laje - Bloco A', 'm³', 42, 50, 'Construtora Alfa', 'em_andamento');
    db.prepare('INSERT INTO rdo_comentarios (rdo_id, author_id, tipo, texto) VALUES (?, ?, ?, ?)').run(
      rdoId,
      editorId,
      'comentario',
      'Trabalho seguiu conforme planejado, sem intercorrências relevantes.'
    );
  }
}

async function main() {
  const admin = upsertUser('Admin EQC', 'admin@eqc.com.br', 'master');

  // Organizações globais — identidade de empresa que persiste entre projetos,
  // usada para escopar o Admin de Empresa e o log de acesso entre empresas.
  const orgKronolog = upsertOrganization('Kronolog Engenharia');
  const orgEqc = upsertOrganization('EQC');
  const orgDiase = upsertOrganization('Diase Participações');
  const orgKsmConstrutora = upsertOrganization('KSM Construtora');
  const orgKsmEmpreendimentos = upsertOrganization('KSM Empreendimentos');

  // Kronolog: full 3-tier hierarchy (Construtora -> Gerenciadora -> Cliente), 2-step validation chain.
  const editor = upsertUser('Editor Kronolog', 'editor@eqc.com.br', 'member', orgKronolog);
  const valGerenciadora = upsertUser('Validador Gerenciadora', 'validador.gerenciadora@eqc.com.br', 'member', orgEqc);
  // Demo de Admin de Empresa: este usuário administra só os projetos onde a Diase participa.
  const valCliente = upsertUser('Validador Cliente', 'validador.cliente@eqc.com.br', 'org_admin', orgDiase);

  // KSM Guarulhos: only Construtora + Cliente (no Gerenciadora), 1-step validation chain.
  const editorGuarulhos = upsertUser('Editor Guarulhos', 'editor.guarulhos@eqc.com.br', 'member', orgKsmConstrutora);
  const valClienteGuarulhos = upsertUser('Validador Cliente Guarulhos', 'validador.cliente.guarulhos@eqc.com.br', 'member', orgKsmEmpreendimentos);

  const kronolog = await upsertProject({
    name: 'Kronolog Extrema I',
    code: 'KRO-EXT-01',
    city: 'Extrema',
    state: 'Minas Gerais',
    country: 'Brasil',
    startDate: '2026-01-05',
    plannedEndDate: '2026-11-30',
    progress: 65.4,
  });
  const ksm = await upsertProject({
    name: 'KSM Log Guarulhos',
    code: 'KSM-GRU-01',
    city: 'Guarulhos',
    state: 'São Paulo',
    country: 'Brasil',
    startDate: '2026-03-10',
    plannedEndDate: '2027-02-28',
    progress: 32.1,
  });

  const kronologConstrutora = upsertCompany(kronolog, 'construtora', 'Kronolog Engenharia', orgKronolog);
  const kronologGerenciadora = upsertCompany(kronolog, 'gerenciadora', 'EQC', orgEqc);
  const kronologCliente = upsertCompany(kronolog, 'cliente', 'Diase Participações', orgDiase);

  const ksmConstrutora = upsertCompany(ksm, 'construtora', 'KSM Construtora', orgKsmConstrutora);
  const ksmCliente = upsertCompany(ksm, 'cliente', 'KSM Empreendimentos', orgKsmEmpreendimentos);

  // Kronolog: Construtora=nível 1, Gerenciadora=nível 2, Cliente=nível 3 (cadeia [1,2,3]).
  addMember(kronolog, admin, null, 0);
  addMember(kronolog, editor, kronologConstrutora, 1);
  addMember(kronolog, valGerenciadora, kronologGerenciadora, 2);
  addMember(kronolog, valCliente, kronologCliente, 3);

  // KSM: Construtora=nível 1, Cliente=nível 2 (sem Gerenciadora, cadeia [1,2]).
  addMember(ksm, admin, null, 0);
  addMember(ksm, editorGuarulhos, ksmConstrutora, 1);
  addMember(ksm, valClienteGuarulhos, ksmCliente, 2);

  seedCatalog(kronolog);
  seedCatalog(ksm);
  seedTemplate(kronolog);
  seedTemplate(ksm);
  seedRdos(kronolog, editor, [
    { status: 'concluido' },
    { status: 'concluido' },
    { status: 'concluido' },
    { status: 'em_validacao', level: 2 },
    { status: 'em_validacao', level: 3 },
    { status: 'reprovado' },
    { status: 'concluido' },
    { status: 'concluido' },
    { status: 'em_edicao' },
    { status: 'concluido' },
  ]);
  seedRdos(ksm, editorGuarulhos, [
    { status: 'concluido' },
    { status: 'concluido' },
    { status: 'em_validacao', level: 2 },
    { status: 'reprovado' },
    { status: 'concluido' },
    { status: 'em_edicao' },
    { status: 'concluido' },
  ]);

  console.log('Seed concluído. Usuários (senha padrão: %s):', SEED_PASSWORD);
  console.log('  admin@eqc.com.br (Admin Master)');
  console.log('  editor@eqc.com.br (Construtora - Kronolog)');
  console.log('  validador.gerenciadora@eqc.com.br (Gerenciadora EQC - Kronolog)');
  console.log('  validador.cliente@eqc.com.br (Admin de Empresa - Diase Participações)');
  console.log('  editor.guarulhos@eqc.com.br (Construtora - KSM Guarulhos, sem Gerenciadora)');
  console.log('  validador.cliente.guarulhos@eqc.com.br (Cliente - KSM Guarulhos)');
}

main().catch((err) => {
  console.error('Seed falhou:', err);
  process.exit(1);
});
