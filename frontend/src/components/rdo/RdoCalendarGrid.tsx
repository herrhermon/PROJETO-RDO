import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Rdo } from '../../lib/types';
import { RdoCalendarStatusCard } from './RdoCalendarStatusCard';
import { todayISO, toLocalISODate } from '../../lib/dateUtils';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function isoDate(y: number, m: number, d: number): string {
  return toLocalISODate(new Date(y, m, d));
}

interface Props {
  allRdos: Rdo[];
  visibleRdos: Rdo[];
  startDate: string;
  onCreate: (date: string) => void;
}

export function RdoCalendarGrid({ allRdos, visibleRdos, startDate, onCreate }: Props) {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date());
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = todayISO();

  const allByDate = useMemo(() => {
    const map = new Map<string, Rdo>();
    for (const r of allRdos) map.set(r.reference_date, r);
    return map;
  }, [allRdos]);

  const visibleByDate = useMemo(() => {
    const map = new Map<string, Rdo>();
    for (const r of visibleRdos) map.set(r.reference_date, r);
    return map;
  }, [visibleRdos]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
      <div className="p-4 bg-gray-100 flex justify-between items-center border-b border-gray-300">
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-200 rounded-lg">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-gray-800 text-lg uppercase tracking-wide">
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-200 rounded-lg">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-300 bg-gray-50">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-sm font-bold text-gray-700 border-r border-gray-300 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 bg-gray-300 gap-[1px]">
        {Array.from({ length: 42 }).map((_, i) => {
          const dayNum = i - firstDayOfWeek + 1;
          const cellDate = new Date(year, month, dayNum);
          const isCurrentMonth = cellDate.getMonth() === month;
          const dateStr = isoDate(year, month, dayNum);
          const existingRdo = allByDate.get(dateStr);
          const visibleRdo = visibleByDate.get(dateStr);
          const isHidden = !!existingRdo && !visibleRdo;
          const isFuture = dateStr > today;
          const isBeforeStart = dateStr < startDate;
          const isPast = dateStr <= today;

          return (
            <div key={i} className={`min-h-[112px] p-2 flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-gray-100 opacity-60'}`}>
              <span className="text-sm font-bold text-gray-800">{String(cellDate.getDate()).padStart(2, '0')}</span>
              {visibleRdo ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`${visibleRdo.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`${visibleRdo.id}`)}
                  className="mt-1 flex-1 flex cursor-pointer transition-transform hover:scale-[1.03]"
                >
                  <RdoCalendarStatusCard rdo={visibleRdo} />
                </div>
              ) : isHidden ? null : isFuture ? (
                <div className="mt-1 flex-1 flex items-center justify-center text-gray-300 text-xs" title="Data futura bloqueada">
                  —
                </div>
              ) : isBeforeStart ? (
                <div className="mt-1 flex-1 flex items-center justify-center text-gray-300 text-xs" title="Anterior à data de início do projeto">
                  —
                </div>
              ) : isPast && isCurrentMonth ? (
                <button
                  onClick={() => onCreate(dateStr)}
                  className="mt-1 flex-1 border border-dashed rounded-md flex items-center justify-center cursor-pointer hover:bg-red-50 border-red-300 text-red-500 text-[10px] font-bold uppercase tracking-wide"
                >
                  Não emitido
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
