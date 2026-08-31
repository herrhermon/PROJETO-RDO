import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export function RejectModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal title="Reprovar RDO" onClose={onClose}>
      <p className="text-sm text-gray-600 mb-3">Informe o motivo da reprovação. O editor poderá corrigir e reenviar o RDO após esta ação.</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-eqc-900 outline-none"
        placeholder="Descreva o motivo..."
      />
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={!reason.trim()} onClick={() => onConfirm(reason.trim())}>
          Confirmar Reprovação
        </Button>
      </div>
    </Modal>
  );
}
