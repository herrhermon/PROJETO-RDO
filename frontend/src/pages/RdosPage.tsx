import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Eye, EyeOff, LayoutGrid, List as ListIcon } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { useProjectContext } from './ProjectLayout';
import type { Rdo } from '../lib/types';
import { RdoCalendarGrid } from '../components/rdo/RdoCalendarGrid';
import { RdoListTable } from '../components/rdo/RdoListTable';
import { RdoGroupBoard } from '../components/rdo/RdoGroupBoard';
import { useToast } from '../components/ui/Toast';
import { canEditRdo } from '../lib/permissions';

type DisplayMode = 'calendario' | 'lista' | 'grupo';

export function RdosPage() {
  const { project, me } = useProjectContext();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [rdos, setRdos] = useState<Rdo[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('calendario');
  const [showConcluded, setShowConcluded] = useState(false);

  function load() {
    api.get<{ rdos: Rdo[] }>(`/projects/${project.id}/rdos`).then((r) => setRdos(r.rdos));
  }

  useEffect(load, [project.id]);

  const visibleRdos = showConcluded ? rdos : rdos.filter((r) => r.status !== 'concluido');

  async function handleCreate(date: string) {
    if (!canEditRdo(me)) return;
    try {
      const res = await api.post<{ rdo: Rdo }>(`/projects/${project.id}/rdos`, { referenceDate: date });
      navigate(`${res.rdo.id}`);
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Não foi possível criar o RDO.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Diário de Obras (RDO)</h2>
          <p className="text-gray-500">Gestão e Validação Diária</p>
        </div>
        <button
          onClick={() => setShowConcluded((v) => !v)}
          className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-full text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          {showConcluded ? <Eye className="w-4 h-4 text-blue-600" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
          {showConcluded ? "Ocultar RDO's Concluídos" : "Ver RDO's Concluídos"}
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4">
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          {(
            [
              ['calendario', 'Calendário', Calendar],
              ['lista', 'Lista', ListIcon],
              ['grupo', 'Grupo', LayoutGrid],
            ] as const
          ).map(([mode, label, Icon]) => (
            <button
              key={mode}
              onClick={() => setDisplayMode(mode)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition ${
                displayMode === mode ? 'bg-white text-eqc-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {displayMode === 'calendario' && (
        <RdoCalendarGrid allRdos={rdos} visibleRdos={visibleRdos} startDate={project.start_date} onCreate={handleCreate} />
      )}
      {displayMode === 'lista' && <RdoListTable rdos={visibleRdos} />}
      {displayMode === 'grupo' && <RdoGroupBoard rdos={visibleRdos} />}
    </div>
  );
}
