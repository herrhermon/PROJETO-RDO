export interface Project {
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
}

export interface RainSource {
  key: 'manual' | 'ecowitt' | 'cemaden';
  label: string;
}

export interface RainLookupResult {
  hasData: boolean;
  valueMm?: number;
  error?: string;
}

export interface ProjectCompany {
  id: number;
  tipo: 'construtora' | 'gerenciadora' | 'cliente';
  nome: string;
  logo_path: string | null;
  organization_id: number | null;
}

export interface Organization {
  id: number;
  nome: string;
  logo_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeatherResult {
  source: 'api' | 'unavailable';
  temperature?: number;
  summary?: string;
  clima?: 'Ensolarado' | 'Nublado' | 'Chuvoso' | 'Tempestade';
}

export interface Rdo {
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
  chuva_fonte: 'manual' | 'ecowitt' | 'cemaden' | null;
  clima_observacoes: string | null;
  created_by: number | null;
  signed_by: number | null;
  signed_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  updated_at: string;
  creator_name?: string | null;
  completion_pct?: number;
  waiting_company_type?: 'construtora' | 'gerenciadora' | 'cliente' | null;
}

export interface EfetivoItem {
  id: number;
  funcao: string;
  empresa: string | null;
  quantidade: number;
  turno: string | null;
  observacao: string | null;
}

export interface EquipamentoItem {
  id: number;
  tipo: string;
  propriedade: 'proprio' | 'alugado' | 'terceiro';
  empresa: string | null;
  quantidade: number;
  observacao: string | null;
}

export interface ServicoItem {
  id: number;
  descricao: string;
  unidade: string | null;
  quantidade_executada: number | null;
  quantidade_planejada: number | null;
  empresa: string | null;
  localizacao: string | null;
  status_execucao: string | null;
  observacao: string | null;
}

export interface CatalogItem {
  id: number;
  nome: string;
}

export interface RdoTemplate {
  id: number;
  nome: string;
  efetivo: { funcao: string; empresa: string | null; quantidade: number; turno: string | null }[];
  equipamentos: { tipo: string; propriedade: string; empresa: string | null; quantidade: number }[];
  servicos: { descricao: string; unidade: string | null; quantidade_planejada: number | null; empresa: string | null }[];
  comentarios: { texto: string }[];
}

export interface ComentarioItem {
  id: number;
  tipo: 'comentario' | 'ocorrencia';
  texto: string;
  author_id: number | null;
  author_name: string | null;
  created_at: string;
}

export interface AnexoItem {
  id: number;
  tipo: 'foto' | 'documento';
  file_name: string;
  storage_path: string;
  thumbnail_path: string | null;
  legenda: string | null;
  created_at: string;
}

export interface Pendencia {
  type: string;
  message: string;
  rdoId?: number;
}

export interface DashboardData {
  physicalProgressPct: number;
  elapsedDays: number | null;
  totalDays: number | null;
  todayRdo: { id: number; status: string; statusLabel: string } | null;
  weather: WeatherResult;
}

export interface StatusHistoryEntry {
  id: number;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  changed_at: string;
  changed_by_name: string | null;
}
