CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL UNIQUE,
  logo_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  avatar_path TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('master','org_admin','member')),
  organization_id INTEGER REFERENCES organizations(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  must_reset_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Brasil',
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','concluido','pausado')),
  start_date TEXT NOT NULL,
  planned_end_date TEXT,
  cover_image_url TEXT,
  physical_progress_pct REAL NOT NULL DEFAULT 0,
  ecowitt_application_key TEXT,
  ecowitt_api_key TEXT,
  ecowitt_mac TEXT,
  cemaden_station_code TEXT,
  cemaden_codibge TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('construtora','gerenciadora','cliente')),
  nome TEXT NOT NULL,
  logo_path TEXT,
  organization_id INTEGER REFERENCES organizations(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, tipo, nome)
);
CREATE INDEX IF NOT EXISTS idx_project_companies_project ON project_companies(project_id);
CREATE INDEX IF NOT EXISTS idx_project_companies_organization ON project_companies(organization_id);

CREATE TABLE IF NOT EXISTS org_access_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  accessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_org_access_log_project ON org_access_log(project_id, accessed_at);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES project_companies(id) ON DELETE SET NULL,
  level INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_company ON project_members(company_id);

CREATE TABLE IF NOT EXISTS project_funcoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, nome)
);

CREATE TABLE IF NOT EXISTS project_empresas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, nome)
);

CREATE TABLE IF NOT EXISTS rdos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rdo_number INTEGER NOT NULL,
  reference_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'em_edicao' CHECK (status IN ('em_edicao','em_validacao','reprovado','concluido')),
  current_level INTEGER,
  periodo_manha_clima TEXT,
  periodo_manha_praticavel INTEGER,
  periodo_tarde_clima TEXT,
  periodo_tarde_praticavel INTEGER,
  periodo_noite_clima TEXT,
  periodo_noite_praticavel INTEGER,
  chuva_acumulada_mm REAL,
  chuva_fonte TEXT CHECK (chuva_fonte IS NULL OR chuva_fonte IN ('manual','ecowitt','cemaden')),
  clima_observacoes TEXT,
  created_by INTEGER REFERENCES users(id),
  signed_by INTEGER REFERENCES users(id),
  signed_at TEXT,
  submitted_at TEXT,
  approved_at TEXT,
  rejected_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, reference_date),
  UNIQUE(project_id, rdo_number)
);
CREATE INDEX IF NOT EXISTS idx_rdos_project_date ON rdos(project_id, reference_date);
CREATE INDEX IF NOT EXISTS idx_rdos_project_status ON rdos(project_id, status);

CREATE TABLE IF NOT EXISTS rdo_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rdo_id INTEGER NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  level INTEGER,
  changed_by INTEGER REFERENCES users(id),
  reason TEXT,
  changed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rdo_status_history_rdo ON rdo_status_history(rdo_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','login','login_failed','logout')),
  user_id INTEGER REFERENCES users(id),
  project_id INTEGER,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_log_project_created ON audit_log(project_id, created_at);

CREATE TABLE IF NOT EXISTS rdo_efetivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rdo_id INTEGER NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,
  funcao TEXT NOT NULL,
  empresa TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
  turno TEXT CHECK (turno IN ('manha','tarde','noite','integral')),
  observacao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rdo_efetivo_rdo ON rdo_efetivo(rdo_id);

CREATE TABLE IF NOT EXISTS rdo_equipamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rdo_id INTEGER NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  propriedade TEXT NOT NULL CHECK (propriedade IN ('proprio','alugado','terceiro')),
  empresa TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
  observacao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rdo_equipamentos_rdo ON rdo_equipamentos(rdo_id);

CREATE TABLE IF NOT EXISTS rdo_servicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rdo_id INTEGER NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  unidade TEXT,
  quantidade_executada REAL CHECK (quantidade_executada IS NULL OR quantidade_executada >= 0),
  quantidade_planejada REAL,
  empresa TEXT,
  localizacao TEXT,
  status_execucao TEXT CHECK (status_execucao IN ('em_andamento','concluido','paralisado')),
  observacao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rdo_servicos_rdo ON rdo_servicos(rdo_id);

CREATE TABLE IF NOT EXISTS rdo_comentarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rdo_id INTEGER NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('comentario','ocorrencia')),
  texto TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rdo_comentarios_rdo ON rdo_comentarios(rdo_id);

CREATE TABLE IF NOT EXISTS rdo_anexos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rdo_id INTEGER NOT NULL REFERENCES rdos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('foto','documento')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width_px INTEGER,
  height_px INTEGER,
  thumbnail_path TEXT,
  legenda TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rdo_anexos_rdo ON rdo_anexos(rdo_id);

CREATE TABLE IF NOT EXISTS rdo_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(project_id, nome)
);

CREATE TABLE IF NOT EXISTS rdo_template_comentarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES rdo_templates(id) ON DELETE CASCADE,
  texto TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rdo_template_efetivo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES rdo_templates(id) ON DELETE CASCADE,
  funcao TEXT NOT NULL,
  empresa TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade >= 0),
  turno TEXT CHECK (turno IN ('manha','tarde','noite','integral'))
);

CREATE TABLE IF NOT EXISTS rdo_template_equipamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES rdo_templates(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  propriedade TEXT NOT NULL CHECK (propriedade IN ('proprio','alugado','terceiro')),
  empresa TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade >= 0)
);

CREATE TABLE IF NOT EXISTS rdo_template_servicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES rdo_templates(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  unidade TEXT,
  quantidade_planejada REAL,
  empresa TEXT
);
