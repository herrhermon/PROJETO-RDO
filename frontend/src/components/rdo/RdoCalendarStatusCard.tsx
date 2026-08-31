import { AlertTriangle, CheckCircle2, Hourglass, Pencil } from 'lucide-react';
import type { Rdo } from '../../lib/types';
import { colorForName, getInitials } from '../ui/Avatar';

const WAITING_COMPANY_LABELS: Record<string, string> = {
  construtora: 'Construtora',
  gerenciadora: 'Gerenciadora',
  cliente: 'Cliente',
};

function CreatorBadge({ name }: { name: string }) {
  return (
    <div
      className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full ${colorForName(name)} text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-sm`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

export function RdoCalendarStatusCard({ rdo }: { rdo: Rdo }) {
  const creatorName = rdo.creator_name;

  if (rdo.status === 'concluido') {
    return (
      <div className="flex-1 rounded-md bg-green-500 text-white flex items-center justify-center gap-1.5 px-2 py-2 text-[10px] font-bold uppercase tracking-wide shadow-sm">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Concluído
      </div>
    );
  }

  if (rdo.status === 'reprovado') {
    return (
      <div className="flex-1 rounded-md bg-red-50 border border-red-300 flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center">
        <div className="flex items-center gap-1 text-red-700 text-[10px] font-bold uppercase tracking-wide">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Reprovado
        </div>
        <span className="text-[9px] text-red-500 font-medium">Requer ajuste</span>
      </div>
    );
  }

  if (rdo.status === 'em_validacao') {
    const waitingLabel = rdo.waiting_company_type ? WAITING_COMPANY_LABELS[rdo.waiting_company_type] : null;
    return (
      <div className="relative flex-1 rounded-md bg-amber-50 border border-amber-300 flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center">
        {creatorName && <CreatorBadge name={creatorName} />}
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          <Hourglass className="w-3.5 h-3.5 shrink-0" /> Validação Nível {rdo.current_level}
        </div>
        {waitingLabel && <span className="text-[9px] font-medium text-amber-600">Aguardando {waitingLabel}</span>}
      </div>
    );
  }

  const pct = rdo.completion_pct ?? 0;
  return (
    <div className="relative flex-1 rounded-md bg-white border border-blue-200 flex flex-col items-center justify-center gap-1.5 px-2 py-2 text-center">
      {creatorName && <CreatorBadge name={creatorName} />}
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
        <Pencil className="w-3.5 h-3.5 shrink-0" /> Em edição
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1">
        <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
