import { useNavigate } from 'react-router-dom';
import type { Rdo } from '../../lib/types';
import { formatDateBR } from '../../lib/dateUtils';
import { RdoStatusBadge } from './RdoStatusBadge';

export function RdoListTable({ rdos }: { rdos: Rdo[] }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 uppercase text-xs">
          <tr>
            <th className="px-6 py-4">Data Ref.</th>
            <th className="px-6 py-4">RDO</th>
            <th className="px-6 py-4">Clima</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rdos.map((rdo) => (
            <tr
              key={rdo.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`${rdo.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`${rdo.id}`)}
              className="cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4 font-bold text-gray-800">{formatDateBR(rdo.reference_date)}</td>
              <td className="px-6 py-4 font-bold text-eqc-900">RDO - {rdo.rdo_number}</td>
              <td className="px-6 py-4">{rdo.periodo_manha_clima ?? '-'}</td>
              <td className="px-6 py-4">
                <RdoStatusBadge status={rdo.status} />
              </td>
            </tr>
          ))}
          {rdos.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                Nenhum RDO encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
