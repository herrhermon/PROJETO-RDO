import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, CloudSun, ListChecks } from 'lucide-react';
import { api } from '../../lib/apiClient';
import type { Rdo, WeatherResult } from '../../lib/types';
import type { RdoTabKey } from './RdoWizardNav';
import { Card } from '../ui/Card';

interface Completion {
  climaFilled: boolean;
  efetivoCount: number;
  equipamentosCount: number;
  servicosCount: number;
  comentariosCount: number;
  fotosCount: number;
  documentosCount: number;
}

const WEATHER_ICON_COLOR: Record<string, string> = {
  Ensolarado: 'text-amber-500',
  Nublado: 'text-gray-400',
  Chuvoso: 'text-blue-500',
  Tempestade: 'text-indigo-500',
};

export function RdoSidebar({ projectId, rdo, activeTab }: { projectId: number; rdo: Rdo; activeTab: RdoTabKey }) {
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [weather, setWeather] = useState<WeatherResult | null>(null);

  useEffect(() => {
    api.get<{ completion: Completion }>(`/projects/${projectId}/rdos/${rdo.id}/completion`).then((r) => setCompletion(r.completion));
  }, [projectId, rdo.id, rdo.updated_at, activeTab]);

  useEffect(() => {
    api.get<WeatherResult>(`/projects/${projectId}/weather`).then(setWeather);
  }, [projectId]);

  const items: { label: string; done: boolean }[] = completion
    ? [
        { label: 'Clima registrado', done: completion.climaFilled },
        { label: 'Efetivo preenchido', done: completion.efetivoCount > 0 },
        { label: 'Equipamentos preenchidos', done: completion.equipamentosCount > 0 },
        { label: 'Serviços preenchidos', done: completion.servicosCount > 0 },
        { label: 'Comentários registrados', done: completion.comentariosCount > 0 },
      ]
    : [];
  const doneCount = items.filter((i) => i.done).length;
  const progressPct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ListChecks className="w-4 h-4 text-eqc-900" />
          <h4 className="font-bold text-gray-800 text-sm">Status do Preenchimento</h4>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progresso</span>
          <span className="font-bold text-green-600">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              {item.done ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <Circle className="w-4 h-4 text-gray-300 shrink-0" />}
              <span className={item.done ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <CloudSun className="w-4 h-4 text-eqc-900" />
          <h4 className="font-bold text-gray-800 text-sm">Condições Climáticas</h4>
        </div>
        {weather?.source === 'api' ? (
          <div className="flex items-center gap-3">
            <CloudSun className={`w-9 h-9 ${(weather.clima && WEATHER_ICON_COLOR[weather.clima]) || 'text-gray-400'}`} />
            <div>
              <p className="text-2xl font-bold text-gray-800">{weather.temperature !== undefined ? `${Math.round(weather.temperature)}°C` : '-'}</p>
              <p className="text-xs text-gray-500">{weather.summary}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Previsão indisponível para esta localidade.</p>
        )}
      </Card>
    </div>
  );
}
