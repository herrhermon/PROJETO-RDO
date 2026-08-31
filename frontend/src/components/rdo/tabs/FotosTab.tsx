import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '../../../lib/apiClient';
import type { AnexoItem } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';

interface PendingFoto {
  file: File;
  legenda: string;
  previewUrl: string;
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

export function FotosTab({ projectId, rdoId, editable }: { projectId: number; rdoId: number; editable: boolean }) {
  const { notify } = useToast();
  const [items, setItems] = useState<AnexoItem[]>([]);
  const [pending, setPending] = useState<PendingFoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    api.get<{ anexos: AnexoItem[] }>(`/projects/${projectId}/rdos/${rdoId}/anexos`).then((r) => setItems(r.anexos.filter((a) => a.tipo === 'foto')));
  }

  useEffect(load, [projectId, rdoId]);

  function handleSelect(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const accepted = files.filter((f) => ALLOWED_MIME.includes(f.type));
    const rejected = files.filter((f) => !ALLOWED_MIME.includes(f.type));
    if (rejected.length > 0) {
      notify(`Tipo de arquivo não aceito para fotos: ${rejected.map((f) => f.name).join(', ')}. Envie apenas imagens (JPG, PNG ou WEBP).`, 'error');
    }
    const next = accepted.map((file) => ({ file, legenda: '', previewUrl: URL.createObjectURL(file) }));
    setPending((prev) => [...prev, ...next]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePending(index: number) {
    setPending((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLegenda(index: number, legenda: string) {
    setPending((prev) => prev.map((p, i) => (i === index ? { ...p, legenda } : p)));
  }

  async function handleUpload() {
    if (pending.length === 0) return;
    const form = new FormData();
    form.append('tipo', 'foto');
    pending.forEach((p, i) => {
      form.append(`legenda_${i}`, p.legenda);
      form.append('files', p.file);
    });
    setUploading(true);
    try {
      await api.post(`/projects/${projectId}/rdos/${rdoId}/anexos`, form);
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPending([]);
      load();
      notify('Fotos enviadas com sucesso.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao enviar fotos.', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/projects/${projectId}/rdos/${rdoId}/anexos/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-800">Registro Fotográfico</h3>

      {editable && (
        <div className="space-y-3">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleSelect(e.dataTransfer.files);
            }}
            className={`border border-dashed rounded-lg p-4 flex flex-wrap items-center gap-3 transition-colors ${
              dragActive ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-300'
            }`}
          >
            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={(e) => handleSelect(e.target.files)} className="text-sm" />
            <span className="text-xs text-gray-500">
              Selecione ou arraste uma ou mais fotos para esta área. Você poderá adicionar uma legenda para cada uma antes de enviar.
            </span>
          </div>

          {pending.length > 0 && (
            <div className="space-y-2">
              {pending.map((p, i) => (
                <div key={i} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-2">
                  <img src={p.previewUrl} alt="" className="w-16 h-16 object-cover rounded" />
                  <input
                    value={p.legenda}
                    onChange={(e) => updateLegenda(i, e.target.value)}
                    placeholder="Legenda (opcional)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button onClick={() => removePending(i)} className="text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button onClick={handleUpload} disabled={uploading}>
                <Upload className="w-4 h-4" /> {uploading ? 'Enviando...' : `Enviar ${pending.length} foto(s)`}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((f) => (
          <div key={f.id} className="relative group border border-gray-200 rounded-lg overflow-hidden">
            <img src={api.uploadUrl(f.thumbnail_path ?? f.storage_path)} alt={f.file_name} className="w-full h-28 object-cover" />
            {f.legenda && <div className="px-2 py-1 text-xs text-gray-600 truncate bg-white border-t border-gray-100">{f.legenda}</div>}
            {editable && (
              <button
                onClick={() => handleDelete(f.id)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400 col-span-full">Nenhuma foto anexada.</p>}
      </div>
    </div>
  );
}
