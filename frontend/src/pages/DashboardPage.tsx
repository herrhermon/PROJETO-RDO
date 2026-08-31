import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Calendar, CheckCircle2, Cloud, CloudRain, CloudLightning, Clock, Sun, TrendingUp } from 'lucide-react';
import { api } from '../lib/apiClient';
import { useProjectContext } from './ProjectLayout';
import type { DashboardData, Pendencia } from '../lib/types';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';

const WEATHER_ICONS: Record<string, typeof Sun> = {
  Ensolarado: Sun,
  Nublado: Cloud,
  Chuvoso: CloudRain,
  Tempestade: CloudLightning,
};

export function DashboardPage() {
  const { project } = useProjectContext();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);

  useEffect(() => {
    api.get<{ dashboard: DashboardData }>(`/projects/${project.id}/dashboard`).then((r) => setDashboard(r.dashboard));
    api.get<{ pendencias: Pendencia[] }>(`/projects/${project.id}/pendencias`).then((r) => setPendencias(r.pendencias));
  }, [project.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Visão Geral do Projeto</h2>
          <p className="text-gray-500">{project.name} — Resumo Executivo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Avanço Físico Global</p>
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-eqc-900">{dashboard?.physicalProgressPct ?? project.physical_progress_pct}%</span>
          </div>
          <ProgressBar value={dashboard?.physicalProgressPct ?? project.physical_progress_pct} />
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-gray-500">Prazo Decorrido</p>
            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-gray-800">
              {dashboard?.elapsedDays ?? '-'}
              <span className="text-lg text-gray-500">/{dashboard?.totalDays ?? '-'}</span>
            </span>
            <span className="text-sm text-gray-500 mb-1">dias</span>
          </div>
          <ProgressBar value={dashboard && dashboard.totalDays ? (dashboard.elapsedDays! / dashboard.totalDays) * 100 : 0} colorClass="bg-indigo-500" />
        </Card>
        <Card className="p-5">
          <p className="text-sm text-gray-500 mb-1">Status RDO Atual (Hoje)</p>
          <div className="flex items-center gap-3 mt-1">
            {dashboard?.todayRdo ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-50 border border-green-200 flex items-center justify-center">
                  <CheckCircle2 className="text-green-600 w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">{dashboard.todayRdo.statusLabel}</p>
                  {dashboard.todayRdo.id && (
                    <Link to={`../rdos/${dashboard.todayRdo.id}`} className="text-xs text-eqc-900 hover:underline">
                      Abrir RDO
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center">
                  <AlertTriangle className="text-red-600 w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Não Emitido</p>
                  <p className="text-xs text-red-500">RDO de hoje pendente</p>
                </div>
              </>
            )}
          </div>
        </Card>
        <Card className="p-5 bg-eqc-900 text-white flex flex-col justify-between border-0">
          <p className="text-sm text-blue-200 mb-1">
            Previsão do Tempo {project.city && <span className="font-normal">— {project.city}</span>}
          </p>
          {dashboard?.weather.source === 'api' ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{dashboard.weather.temperature !== undefined ? `${Math.round(dashboard.weather.temperature)}°C` : '-'}</span>
                <p className="text-xs text-blue-300">{dashboard.weather.summary}</p>
              </div>
              {(() => {
                const Icon = (dashboard.weather.clima && WEATHER_ICONS[dashboard.weather.clima]) || Cloud;
                return <Icon className="w-10 h-10 text-blue-300" />;
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-lg font-bold">Indisponível</span>
                <p className="text-xs text-blue-300">Sem previsão para esta localidade</p>
              </div>
              <Cloud className="w-10 h-10 text-blue-300" />
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-eqc-900" /> Painel de Pendências
        </h3>
        {pendencias.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma pendência no momento.</p>
        ) : (
          <ul className="space-y-2">
            {pendencias.map((p, i) => (
              <li key={i} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <span className="text-amber-900">{p.message}</span>
                {p.rdoId && (
                  <Link to={`../rdos/${p.rdoId}`} className="text-eqc-900 font-medium hover:underline">
                    Ver RDO
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-8 flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Integração Financeira (Sienge) — Em breve</h3>
        <p className="text-gray-500 max-w-lg text-sm">Este painel exibirá dados reais de saúde financeira do contrato assim que a integração for habilitada.</p>
      </Card>
    </div>
  );
}
