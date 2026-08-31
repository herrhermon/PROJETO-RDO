import { RDO_STATUS_LABELS } from '../../../utils/constants/rdoStatus';

export interface RdoReportData {
  project: { name: string; location: string | null; code: string | null };
  rdo: {
    rdo_number: number;
    reference_date: string;
    status: string;
    periodo_manha_clima: string | null;
    periodo_manha_praticavel: number | null;
    periodo_tarde_clima: string | null;
    periodo_tarde_praticavel: number | null;
    periodo_noite_clima: string | null;
    periodo_noite_praticavel: number | null;
    chuva_acumulada_mm: number | null;
    chuva_fonte: string | null;
    clima_observacoes: string | null;
    signed_at: string | null;
  };
  signedByName: string | null;
  efetivo: { funcao: string; empresa: string | null; quantidade: number; turno: string | null }[];
  equipamentos: { tipo: string; propriedade: string; empresa: string | null; quantidade: number }[];
  servicos: {
    descricao: string;
    unidade: string | null;
    quantidade_executada: number | null;
    quantidade_planejada: number | null;
    empresa: string | null;
    localizacao: string | null;
    status_execucao: string | null;
  }[];
  comentarios: { tipo: string; texto: string; author_name: string | null; created_at: string }[];
  fotos: { file_name: string; dataUri: string; legenda: string | null }[];
  documentos: { file_name: string }[];
}

function praticavel(v: number | null): string {
  if (v === null) return '-';
  return v ? 'Praticável' : 'Impraticável';
}

const PROPRIEDADE_LABELS: Record<string, string> = { proprio: 'Próprio', alugado: 'Alugado', terceiro: 'Terceiro' };
const CHUVA_FONTE_LABELS: Record<string, string> = {
  ecowitt: 'via Estação Pluviométrica Automática (Ecowitt)',
  cemaden: 'via Estação CEMADEN',
};

export function renderRdoReportHtml(data: RdoReportData): string {
  const { project, rdo } = data;
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 32px; font-size: 12px; }
  h1 { color: #002b49; font-size: 20px; margin-bottom: 4px; }
  h2 { color: #002b49; font-size: 14px; margin-top: 24px; margin-bottom: 8px; border-bottom: 2px solid #002b49; padding-bottom: 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #002b49; padding-bottom: 12px; margin-bottom: 16px; }
  .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #e5f0ff; color: #002b49; font-weight: bold; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; font-size: 11px; }
  th { background: #f3f4f6; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
  .meta-item { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; }
  .meta-item .label { font-size: 10px; color: #6b7280; text-transform: uppercase; }
  .meta-item .value { font-size: 13px; font-weight: bold; }
  .photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .photos img { width: 100%; height: 140px; object-fit: cover; border-radius: 6px; border: 1px solid #d1d5db; }
  .comment { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; margin-bottom: 6px; }
  .comment .meta { font-size: 10px; color: #6b7280; margin-bottom: 4px; }
  .comment .texto { white-space: pre-wrap; }
  .signature { margin-top: 32px; padding-top: 16px; border-top: 1px solid #d1d5db; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Relatório Diário de Obra — RDO ${rdo.rdo_number}</h1>
      <div>${project.name}${project.location ? ` — ${project.location}` : ''}</div>
      <div>Data de referência: ${rdo.reference_date}</div>
    </div>
    <div class="badge">${RDO_STATUS_LABELS[rdo.status as keyof typeof RDO_STATUS_LABELS] ?? rdo.status}</div>
  </div>

  <h2>Condições Climáticas e Praticabilidade</h2>
  <table>
    <thead><tr><th>Período</th><th>Clima</th><th>Praticabilidade</th></tr></thead>
    <tbody>
      <tr><td>Manhã</td><td>${rdo.periodo_manha_clima ?? '-'}</td><td>${praticavel(rdo.periodo_manha_praticavel)}</td></tr>
      <tr><td>Tarde</td><td>${rdo.periodo_tarde_clima ?? '-'}</td><td>${praticavel(rdo.periodo_tarde_praticavel)}</td></tr>
      <tr><td>Noite</td><td>${rdo.periodo_noite_clima ?? '-'}</td><td>${praticavel(rdo.periodo_noite_praticavel)}</td></tr>
    </tbody>
  </table>
  <div class="meta-grid" style="grid-template-columns: 1fr;">
    <div class="meta-item"><div class="label">Chuva acumulada no dia</div><div class="value">${rdo.chuva_acumulada_mm ?? '-'}${rdo.chuva_acumulada_mm !== null ? ' mm' : ''}${
      rdo.chuva_fonte && CHUVA_FONTE_LABELS[rdo.chuva_fonte] ? ` <span style="font-weight: normal; font-size: 10px; color: #6b7280;">${CHUVA_FONTE_LABELS[rdo.chuva_fonte]}</span>` : ''
    }</div></div>
  </div>
  ${rdo.clima_observacoes ? `<div class="meta-item" style="margin-top: 8px;"><div class="label">Observações sobre as condições climáticas</div><div>${rdo.clima_observacoes}</div></div>` : ''}

  <h2>Efetivo (Mão de Obra)</h2>
  <table>
    <thead><tr><th>Função</th><th>Empresa</th><th>Turno</th><th>Quantidade</th></tr></thead>
    <tbody>
      ${data.efetivo.map((e) => `<tr><td>${e.funcao}</td><td>${e.empresa ?? '-'}</td><td>${e.turno ?? '-'}</td><td>${e.quantidade}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum registro.</td></tr>'}
    </tbody>
  </table>

  <h2>Equipamentos</h2>
  <table>
    <thead><tr><th>Tipo</th><th>Propriedade</th><th>Empresa</th><th>Quantidade</th></tr></thead>
    <tbody>
      ${data.equipamentos.map((e) => `<tr><td>${e.tipo}</td><td>${PROPRIEDADE_LABELS[e.propriedade] ?? e.propriedade}</td><td>${e.empresa ?? '-'}</td><td>${e.quantidade}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum registro.</td></tr>'}
    </tbody>
  </table>

  <h2>Serviços Executados</h2>
  <table>
    <thead><tr><th>Descrição</th><th>Unidade</th><th>Executado</th><th>Planejado</th><th>Local</th><th>Empresa</th><th>Status</th></tr></thead>
    <tbody>
      ${data.servicos.map((s) => `<tr><td>${s.descricao}</td><td>${s.unidade ?? '-'}</td><td>${s.quantidade_executada ?? '-'}</td><td>${s.quantidade_planejada ?? '-'}</td><td>${s.localizacao ?? '-'}</td><td>${s.empresa ?? '-'}</td><td>${s.status_execucao ?? '-'}</td></tr>`).join('') || '<tr><td colspan="7">Nenhum registro.</td></tr>'}
    </tbody>
  </table>

  <h2>Comentários e Ocorrências</h2>
  ${
    data.comentarios
      .map((c) => `<div class="comment"><div class="meta">${c.tipo === 'ocorrencia' ? 'Ocorrência' : 'Comentário'} — ${c.author_name ?? 'Usuário'} em ${c.created_at}</div><div class="texto">${c.texto}</div></div>`)
      .join('') || '<div>Nenhum comentário registrado.</div>'
  }

  <h2>Registro Fotográfico</h2>
  <div class="photos">
    ${data.fotos.map((f) => `<div><img src="${f.dataUri}" /><div>${f.legenda ?? ''}</div></div>`).join('') || '<div>Nenhuma foto anexada.</div>'}
  </div>

  <h2>Documentos Anexados</h2>
  <div>
    ${data.documentos.map((d) => `<div>• ${d.file_name} (páginas mescladas a seguir)</div>`).join('') || '<div>Nenhum documento anexado.</div>'}
  </div>

  <div class="signature">
    <div>________________________________________</div>
    <div>${data.signedByName ?? 'Não assinado'}</div>
    <div>Assinado em: ${rdo.signed_at ?? '-'}</div>
  </div>
</body>
</html>
`;
}
