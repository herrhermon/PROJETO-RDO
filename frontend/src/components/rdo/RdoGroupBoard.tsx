import { useNavigate } from 'react-router-dom';
import type { Rdo } from '../../lib/types';
import { RDO_STATUS_LABELS } from '../../lib/constants/rdoStatus';
import { formatDateBR } from '../../lib/dateUtils';

const GROUPS: (keyof typeof RDO_STATUS_LABELS)[] = ['em_edicao', 'em_validacao', 'reprovado', 'concluido'];

export function RdoGroupBoard({ rdos }: { rdos: Rdo[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex-1 overflow-x-auto pb-4">
      <div className="flex gap-4 items-start h-full min-h-[400px]">
        {GROUPS.map((statusKey) => {
          const items = rdos.filter((r) => r.status === statusKey);
          return (
            <div key={statusKey} className="w-72 shrink-0 bg-gray-100 rounded-xl flex flex-col max-h-[600px] border border-gray-300 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-300 flex justify-between items-center bg-gray-200 rounded-t-xl">
                <h3 className="font-bold text-gray-800 uppercase text-xs tracking-wider">{RDO_STATUS_LABELS[statusKey]}</h3>
                <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-gray-600 border border-gray-300">{items.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 flex flex-col gap-3">
                {items.map((rdo) => (
                  <div
                    key={rdo.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`${rdo.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`${rdo.id}`)}
                    className="p-3 rounded-lg border bg-white transition-all cursor-pointer hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="font-bold text-sm">RDO - {rdo.rdo_number}</div>
                      {rdo.status === 'em_validacao' && rdo.current_level != null && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-300">
                          Nível {rdo.current_level}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{formatDateBR(rdo.reference_date)}</div>
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Vazio</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
