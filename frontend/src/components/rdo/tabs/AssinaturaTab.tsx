import { useEffect, useState } from 'react';
import { CheckCircle2, PenTool } from 'lucide-react';
import { api } from '../../../lib/apiClient';
import type { Rdo, StatusHistoryEntry } from '../../../lib/types';
import { Button } from '../../ui/Button';

export function AssinaturaTab({ projectId, rdo, editable, onSign }: { projectId: number; rdo: Rdo; editable: boolean; onSign: () => void }) {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);

  useEffect(() => {
    api.get<{ history: StatusHistoryEntry[] }>(`/projects/${projectId}/rdos/${rdo.id}/history`).then((r) => setHistory(r.history));
  }, [projectId, rdo.id, rdo.status]);

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-800">Assinatura do Diário de Obra</h3>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          {rdo.signed_by ? (
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircle2 className="w-5 h-5" /> Assinado em {rdo.signed_at ? new Date(rdo.signed_at).toLocaleString('pt-BR') : '-'}
            </div>
          ) : (
            <span className="text-gray-500">RDO ainda não assinado.</span>
          )}
        </div>
        {editable && !rdo.signed_by && (
          <Button onClick={onSign}>
            <PenTool className="w-4 h-4" /> Assinar RDO
          </Button>
        )}
      </div>

      <div>
        <h4 className="text-sm font-bold text-gray-600 mb-2">Histórico de Validação</h4>
        <div className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between text-sm bg-white border border-gray-200 rounded-lg px-3 py-2">
              <span>
                {h.from_status ?? 'novo'} → <span className="font-medium">{h.to_status}</span>
                {h.reason && <span className="text-red-600"> — {h.reason}</span>}
              </span>
              <span className="text-xs text-gray-400">
                {h.changed_by_name ?? 'Sistema'} · {new Date(h.changed_at).toLocaleString('pt-BR')}
              </span>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-gray-400">Nenhuma movimentação registrada ainda.</p>}
        </div>
      </div>
    </div>
  );
}
