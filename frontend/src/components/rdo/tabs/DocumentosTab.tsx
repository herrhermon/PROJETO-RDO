import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { api, ApiError } from '../../../lib/apiClient';
import type { AnexoItem } from '../../../lib/types';
import { useToast } from '../../ui/Toast';

export function DocumentosTab({ projectId, rdoId, editable }: { projectId: number; rdoId: number; editable: boolean }) {
  const { notify } = useToast();
  const [items, setItems] = useState<AnexoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    api.get<{ anexos: AnexoItem[] }>(`/projects/${projectId}/rdos/${rdoId}/anexos`).then((r) => setItems(r.anexos.filter((a) => a.tipo === 'documento')));
  }

  useEffect(load, [projectId, rdoId]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const accepted = files.filter((f) => f.type === 'application/pdf');
    const rejected = files.filter((f) => f.type !== 'application/pdf');
    if (rejected.length > 0) {
      notify(`A aplicação só aceita documentos no formato PDF. Arquivo(s) rejeitado(s): ${rejected.map((f) => f.name).join(', ')}.`, 'error');
    }
    if (accepted.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const form = new FormData();
    form.append('tipo', 'documento');
    accepted.forEach((f) => form.append('files', f));
    setUploading(true);
    try {
      await api.post(`/projects/${projectId}/rdos/${rdoId}/anexos`, form);
      load();
      notify('Documentos enviados com sucesso.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao enviar documentos.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/projects/${projectId}/rdos/${rdoId}/anexos/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <h3 className="font-bold text-gray-800">Documentos Anexados</h3>
      <p className="text-xs text-gray-500">A aplicação só aceita documentos no formato PDF. Ao exportar o relatório, cada PDF anexado é impresso na íntegra ao final.</p>

      {editable && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`border border-dashed rounded-lg p-4 flex flex-wrap items-center gap-3 transition-colors ${
            dragActive ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-300'
          }`}
        >
          <input ref={fileInputRef} type="file" multiple accept="application/pdf" onChange={(e) => handleFiles(e.target.files)} className="text-sm" />
          <span className="text-xs text-gray-500">Selecione ou arraste arquivos PDF para esta área.</span>
          {uploading && (
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Upload className="w-4 h-4 animate-pulse" /> Enviando...
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        {items.map((d) => (
          <div key={d.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <a href={api.uploadUrl(d.storage_path)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-eqc-900 hover:underline">
              <FileText className="w-4 h-4" /> {d.file_name}
            </a>
            {editable && (
              <button onClick={() => handleDelete(d.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">Nenhum documento anexado.</p>}
      </div>
    </div>
  );
}
