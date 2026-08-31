import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import type { Organization } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

export function AdminOrganizationsPage() {
  const { notify } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  function load() {
    api.get<{ organizations: Organization[] }>('/organizations').then((r) => setOrganizations(r.organizations));
  }

  useEffect(load, []);

  async function handleUploadLogo(id: number, file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify('Selecione uma imagem JPG, PNG ou WEBP.', 'error');
      return;
    }
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/organizations/${id}/logo`, form);
      load();
      notify('Logo atualizada.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao enviar a logo.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Empresas (Organizações)</h2>
          <p className="text-gray-500">Cadastro global de empresas contratantes — é o que amarra os projetos de uma mesma empresa entre si e habilita o Admin de Empresa.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Nova Empresa
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Logo</th>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Cadastrada em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {organizations.map((org) => (
              <tr key={org.id}>
                <td className="px-4 py-3">
                  <OrganizationLogoCell organization={org} onUpload={(file) => handleUploadLogo(org.id, file)} />
                </td>
                <td className="px-4 py-3 font-medium">{org.nome}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(org.created_at).toLocaleDateString('pt-BR')}</td>
              </tr>
            ))}
            {organizations.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma empresa cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showCreate && (
        <CreateOrganizationModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function OrganizationLogoCell({ organization, onUpload }: { organization: Organization; onUpload: (file: File) => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleChange(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setBroken(false);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      title={organization.logo_path ? 'Trocar logo' : 'Enviar logo'}
      className="relative w-16 h-10 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden hover:border-eqc-900 transition-colors disabled:opacity-60"
    >
      {organization.logo_path && !broken ? (
        <img src={api.uploadUrl(organization.logo_path)} alt="" className="max-w-full max-h-full object-contain" onError={() => setBroken(true)} />
      ) : (
        <ImagePlus className="w-4 h-4 text-gray-300" />
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleChange(e.target.files)} />
    </button>
  );
}

function CreateOrganizationModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nome, setNome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!nome.trim()) {
      setError('Informe o nome da empresa.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.post('/organizations', { nome: nome.trim() });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cadastrar empresa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nova Empresa" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Ex: Racional Engenharia"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
