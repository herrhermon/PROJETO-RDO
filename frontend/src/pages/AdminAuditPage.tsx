import { useEffect, useState } from 'react';
import { Building2, History } from 'lucide-react';
import { api } from '../lib/apiClient';
import { Card } from '../components/ui/Card';

type AuditTab = 'access' | 'log';

interface AccessLogEntry {
  id: number;
  accessed_at: string;
  project_id: number;
  actor_name: string;
  actor_email: string;
  project_name: string;
}

interface AuditLogEntry {
  id: number;
  entity_type: string;
  entity_id: number | null;
  action: string;
  detail: string | null;
  created_at: string;
  project_id: number | null;
  actor_name: string | null;
  project_name: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  login: 'Login',
  login_failed: 'Login falhou',
  logout: 'Logout',
};

export function AdminAuditPage() {
  const [tab, setTab] = useState<AuditTab>('access');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Auditoria</h2>
        <p className="text-gray-500">Rastreabilidade de acesso e ações no sistema — inclusive quando o Master acessa dados de outra empresa.</p>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-fit">
        {(
          [
            ['access', 'Acessos entre Empresas', Building2],
            ['log', 'Log de Auditoria Geral', History],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
              tab === key ? 'bg-white text-eqc-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'access' ? <AccessLogPanel /> : <GeneralLogPanel />}
    </div>
  );
}

function AccessLogPanel() {
  const [entries, setEntries] = useState<AccessLogEntry[]>([]);

  useEffect(() => {
    api.get<{ accessLog: AccessLogEntry[] }>('/audit/access-log').then((r) => setEntries(r.accessLog));
  }, []);

  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500 mb-3">
        Toda vez que um usuário Master abre o detalhe de um projeto de outra empresa, fica registrado aqui automaticamente (no máximo uma entrada a cada 4h por
        projeto/usuário).
      </p>
      <div className="space-y-2">
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <span>
              <span className="font-medium">{e.actor_name}</span> acessou <span className="font-medium">{e.project_name}</span>
            </span>
            <span className="text-xs text-gray-400">{new Date(e.accessed_at).toLocaleString('pt-BR')}</span>
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhum acesso registrado ainda.</p>}
      </div>
    </Card>
  );
}

function GeneralLogPanel() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    api.get<{ log: AuditLogEntry[] }>('/audit/log').then((r) => setEntries(r.log));
  }, []);

  return (
    <Card className="p-4">
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {entries.map((e) => (
          <div key={e.id} className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between">
              <span>
                <span className="font-medium">{e.actor_name ?? 'Sistema'}</span> {ACTION_LABELS[e.action] ?? e.action}{' '}
                <span className="font-medium">{e.entity_type}</span>
                {e.entity_id ? ` #${e.entity_id}` : ''}
                {e.project_name && <span className="text-gray-500"> · {e.project_name}</span>}
              </span>
              <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(e.created_at).toLocaleString('pt-BR')}</span>
            </div>
            {e.detail && <p className="text-xs text-gray-400 mt-1 font-mono break-all">{e.detail}</p>}
          </div>
        ))}
        {entries.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhuma ação registrada ainda.</p>}
      </div>
    </Card>
  );
}
