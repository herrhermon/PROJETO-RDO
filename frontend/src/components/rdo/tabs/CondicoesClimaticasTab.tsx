import { useEffect, useState } from 'react';
import { CheckCircle2, Cloud, CloudLightning, CloudRain, CloudSun, Droplets, HelpCircle, Sun, XCircle } from 'lucide-react';
import { api, ApiError } from '../../../lib/apiClient';
import type { RainLookupResult, RainSource, Rdo, WeatherResult } from '../../../lib/types';
import { todayISO } from '../../../lib/dateUtils';
import { useDebouncedCallback } from '../../../hooks/useDebounce';

const CLIMA_OPTIONS = ['Ensolarado', 'Nublado', 'Chuvoso', 'Tempestade'];
const PRATICABILIDADE_OPTIONS = ['Praticável', 'Impraticável'];
const CLIMA_ROW_CLASSES: Record<string, string> = {
  Ensolarado: 'bg-amber-50',
  Nublado: 'bg-gray-100',
  Chuvoso: 'bg-blue-50',
  Tempestade: 'bg-indigo-50',
};
const CLIMA_ICONS: Record<string, { icon: typeof Sun; color: string }> = {
  Ensolarado: { icon: Sun, color: 'text-amber-500' },
  Nublado: { icon: Cloud, color: 'text-gray-400' },
  Chuvoso: { icon: CloudRain, color: 'text-blue-500' },
  Tempestade: { icon: CloudLightning, color: 'text-indigo-500' },
};
const PRATICABILIDADE_ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  'Praticável': { icon: CheckCircle2, color: 'text-green-500' },
  'Impraticável': { icon: XCircle, color: 'text-red-500' },
};

interface Props {
  projectId: number;
  rdo: Rdo;
  editable: boolean;
  onSaved: (rdo: Rdo) => void;
}

interface FormState {
  manhaClima: string;
  manhaPraticavel: string;
  tardeClima: string;
  tardePraticavel: string;
  noiteClima: string;
  noitePraticavel: string;
  chuvaAcumulada: string;
  chuvaFonte: 'manual' | 'ecowitt' | 'cemaden';
  observacoes: string;
}

function toFormState(rdo: Rdo): FormState {
  return {
    manhaClima: rdo.periodo_manha_clima ?? '',
    manhaPraticavel: rdo.periodo_manha_praticavel === null ? '' : rdo.periodo_manha_praticavel ? 'Praticável' : 'Impraticável',
    tardeClima: rdo.periodo_tarde_clima ?? '',
    tardePraticavel: rdo.periodo_tarde_praticavel === null ? '' : rdo.periodo_tarde_praticavel ? 'Praticável' : 'Impraticável',
    noiteClima: rdo.periodo_noite_clima ?? '',
    noitePraticavel: rdo.periodo_noite_praticavel === null ? '' : rdo.periodo_noite_praticavel ? 'Praticável' : 'Impraticável',
    chuvaAcumulada: rdo.chuva_acumulada_mm?.toString() ?? '',
    chuvaFonte: rdo.chuva_fonte ?? 'manual',
    observacoes: rdo.clima_observacoes ?? '',
  };
}

export function CondicoesClimaticasTab({ projectId, rdo, editable, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(toFormState(rdo));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedAt, setSavedAt] = useState('');
  const [suggestion, setSuggestion] = useState<WeatherResult | null>(null);
  const [rainSources, setRainSources] = useState<RainSource[]>([]);
  const [rainLookup, setRainLookup] = useState<{ loading: boolean; error?: string }>({ loading: false });

  useEffect(() => {
    if (!editable || rdo.reference_date !== todayISO()) return;
    api.get<WeatherResult>(`/projects/${projectId}/weather`).then((r) => {
      if (r.source === 'api') setSuggestion(r);
    });
  }, [projectId, rdo.reference_date, editable]);

  useEffect(() => {
    api.get<{ sources: RainSource[] }>(`/projects/${projectId}/rain-sources`).then((r) => setRainSources(r.sources));
  }, [projectId]);

  const save = useDebouncedCallback(async (next: FormState) => {
    setSaveState('saving');
    try {
      const res = await api.patch<{ rdo: Rdo }>(`/projects/${projectId}/rdos/${rdo.id}`, {
        periodoManhaClima: next.manhaClima || undefined,
        periodoManhaPraticavel: next.manhaPraticavel ? next.manhaPraticavel === 'Praticável' : undefined,
        periodoTardeClima: next.tardeClima || undefined,
        periodoTardePraticavel: next.tardePraticavel ? next.tardePraticavel === 'Praticável' : undefined,
        periodoNoiteClima: next.noiteClima || undefined,
        periodoNoitePraticavel: next.noitePraticavel ? next.noitePraticavel === 'Praticável' : undefined,
        chuvaAcumuladaMm: next.chuvaAcumulada ? Number(next.chuvaAcumulada) : undefined,
        chuvaFonte: next.chuvaFonte,
        climaObservacoes: next.observacoes || undefined,
      });
      onSaved(res.rdo);
      setSaveState('saved');
      setSavedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setSaveState('idle');
    }
  }, 800);

  function update(patch: Partial<FormState>) {
    const next = { ...form, ...patch };
    setForm(next);
    if (editable) save(next);
  }

  async function handleSourceChange(source: FormState['chuvaFonte']) {
    setRainLookup({ loading: false });
    if (source === 'manual') {
      update({ chuvaFonte: 'manual' });
      return;
    }
    setForm((prev) => ({ ...prev, chuvaFonte: source }));
    setRainLookup({ loading: true });
    try {
      const res = await api.get<RainLookupResult>(`/projects/${projectId}/rain?source=${source}&date=${rdo.reference_date}`);
      if (!res.hasData || res.valueMm === undefined) {
        setRainLookup({ loading: false, error: res.error ?? 'Não foi possível obter a leitura da estação.' });
        return;
      }
      setRainLookup({ loading: false });
      update({ chuvaFonte: source, chuvaAcumulada: String(res.valueMm) });
    } catch (err) {
      setRainLookup({ loading: false, error: err instanceof ApiError ? err.message : 'Não foi possível consultar a estação.' });
    }
  }

  function applySuggestion() {
    if (!suggestion?.clima) return;
    const praticavel = suggestion.clima === 'Chuvoso' || suggestion.clima === 'Tempestade' ? 'Impraticável' : 'Praticável';
    update({
      manhaClima: suggestion.clima,
      manhaPraticavel: praticavel,
      tardeClima: suggestion.clima,
      tardePraticavel: praticavel,
      noiteClima: suggestion.clima,
      noitePraticavel: praticavel,
    });
  }

  const rows: { label: string; climaKey: keyof FormState; praticavelKey: keyof FormState }[] = [
    { label: 'Manhã', climaKey: 'manhaClima', praticavelKey: 'manhaPraticavel' },
    { label: 'Tarde', climaKey: 'tardeClima', praticavelKey: 'tardePraticavel' },
    { label: 'Noite', climaKey: 'noiteClima', praticavelKey: 'noitePraticavel' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Condições Climáticas</h3>
        {editable && (
          <span className="text-xs text-gray-400" aria-live="polite">
            {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? `Salvo às ${savedAt}` : ''}
          </span>
        )}
      </div>

      {suggestion?.source === 'api' && (
        <div className="flex items-center justify-between gap-3 bg-sky-50 border border-sky-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sky-900 text-sm">
            <CloudSun className="w-5 h-5" />
            <span>
              Previsão de hoje: <strong>{suggestion.clima}</strong>
              {suggestion.temperature !== undefined ? `, ${Math.round(suggestion.temperature)}°C` : ''}
              {suggestion.summary ? ` — ${suggestion.summary}` : ''}
            </span>
          </div>
          {editable && (
            <button onClick={applySuggestion} className="text-sm font-medium text-sky-900 underline hover:no-underline whitespace-nowrap">
              Usar sugestão
            </button>
          )}
        </div>
      )}

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-xs uppercase text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left">Período</th>
            <th className="px-3 py-2 text-left">Clima</th>
            <th className="px-3 py-2 text-left">Praticabilidade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row) => {
            const climaInfo = CLIMA_ICONS[form[row.climaKey]];
            const ClimaIcon = climaInfo?.icon ?? HelpCircle;
            const pratInfo = PRATICABILIDADE_ICONS[form[row.praticavelKey]];
            const PratIcon = pratInfo?.icon ?? HelpCircle;
            return (
              <tr key={row.label} className={CLIMA_ROW_CLASSES[form[row.climaKey]] ?? ''}>
                <td className="px-3 py-2 font-medium">{row.label}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ClimaIcon className={`w-5 h-5 shrink-0 ${climaInfo?.color ?? 'text-gray-300'}`} />
                    <select
                      disabled={!editable}
                      value={form[row.climaKey]}
                      onChange={(e) => update({ [row.climaKey]: e.target.value } as Partial<FormState>)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md disabled:bg-gray-50 bg-white"
                    >
                      <option value="">Selecione...</option>
                      {CLIMA_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <PratIcon className={`w-5 h-5 shrink-0 ${pratInfo?.color ?? 'text-gray-300'}`} />
                    <select
                      disabled={!editable}
                      value={form[row.praticavelKey]}
                      onChange={(e) => update({ [row.praticavelKey]: e.target.value } as Partial<FormState>)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md disabled:bg-gray-50 bg-white"
                    >
                      <option value="">Selecione...</option>
                      {PRATICABILIDADE_OPTIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="max-w-md space-y-3">
        {rainSources.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fonte da leitura de chuva</label>
            <select
              disabled={!editable}
              value={form.chuvaFonte}
              onChange={(e) => handleSourceChange(e.target.value as FormState['chuvaFonte'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 bg-white text-sm"
            >
              {rainSources.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chuva acumulada no dia (mm)</label>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
              <Droplets className="w-4 h-4 text-blue-500" />
            </div>
            <input
              disabled={!editable || form.chuvaFonte !== 'manual'}
              type="number"
              min={0}
              value={form.chuvaAcumulada}
              onChange={(e) => update({ chuvaAcumulada: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          {rainLookup.loading && <p className="text-xs text-gray-500 mt-1">Consultando a estação...</p>}
          {rainLookup.error && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-1">
              {rainLookup.error} Selecione &quot;Informar manualmente&quot; para digitar o valor.
            </p>
          )}
          {!rainLookup.loading && !rainLookup.error && form.chuvaFonte !== 'manual' && (
            <p className="text-xs text-green-700 mt-1">Valor obtido automaticamente da estação cadastrada.</p>
          )}
        </div>
      </div>

      {rainSources.length <= 1 && (
        <p className="text-xs text-gray-400">
          Nenhuma estação pluviométrica cadastrada neste projeto — informe a chuva acumulada manualmente. Um administrador pode cadastrar uma estação
          Ecowitt ou CEMADEN em Editar Projeto.
        </p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações sobre as condições climáticas</label>
        <textarea
          disabled={!editable}
          value={form.observacoes}
          onChange={(e) => update({ observacoes: e.target.value })}
          rows={3}
          placeholder={
            'Ex: "Ventos fortes impediram o trabalho dos pintores de fachada por questões de segurança."\n' +
            'Ex: "A incidência de trovoadas próximo à obra exigiu a paralisação da montagem da estrutura metálica por risco de raios."\n' +
            'Ex: "Terraplenagem paralisada pelas chuvas do dia anterior."'
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-50 text-sm"
        />
      </div>
    </div>
  );
}
