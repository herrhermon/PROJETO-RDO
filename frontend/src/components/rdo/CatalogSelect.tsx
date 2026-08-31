import { useState } from 'react';
import { api, ApiError } from '../../lib/apiClient';
import type { CatalogItem } from '../../lib/types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface Props {
  label: string;
  value: string;
  onChange: (nome: string) => void;
  options: CatalogItem[];
  projectId: number;
  /** Catalog endpoint segment — 'funcoes' or 'empresas'. */
  resource: 'funcoes' | 'empresas';
  onCreated: () => void;
  className?: string;
}

// A catalog dropdown that can also create the missing entry in place, so filling
// an RDO never forces a detour to the Cadastro screen.
export function CatalogSelect({ label, value, onChange, options, projectId, resource, onCreated, className }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <>
      <div>
        <label className="block text-xs text-gray-600 mb-1">{label}</label>
        <div className="flex gap-1.5">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={className ?? 'px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[160px]'}
          >
            <option value="">Selecione...</option>
            {options.map((o) => (
              <option key={o.id} value={o.nome}>
                {o.nome}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            title={`Cadastrar nova ${label.toLowerCase()}`}
            className="px-2.5 py-2 border border-gray-300 rounded-md text-sm text-eqc-900 hover:bg-blue-50 hover:border-eqc-900 transition-colors whitespace-nowrap"
          >
            + Nova
          </button>
        </div>
      </div>

      {showCreate && (
        <CreateCatalogItemModal
          label={label}
          projectId={projectId}
          resource={resource}
          onClose={() => setShowCreate(false)}
          onCreated={(nome) => {
            setShowCreate(false);
            onCreated();
            onChange(nome);
          }}
        />
      )}
    </>
  );
}

function CreateCatalogItemModal({
  label,
  projectId,
  resource,
  onClose,
  onCreated,
}: {
  label: string;
  projectId: number;
  resource: 'funcoes' | 'empresas';
  onClose: () => void;
  onCreated: (nome: string) => void;
}) {
  const { notify } = useToast();
  const [nome, setNome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!nome.trim()) {
      setError(`Informe o nome d${resource === 'funcoes' ? 'a função' : 'a empresa'}.`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/${resource}`, { nome: nome.trim() });
      notify(`${label} cadastrada.`);
      onCreated(nome.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Erro ao cadastrar ${label.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Nova ${label}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder={resource === 'funcoes' ? 'Ex: Carpinteiro' : 'Ex: Construtora Alfa'}
          />
          <p className="text-xs text-gray-400 mt-1">
            Fica disponível para todos os RDOs deste projeto — você não precisa sair do diário para cadastrar.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
