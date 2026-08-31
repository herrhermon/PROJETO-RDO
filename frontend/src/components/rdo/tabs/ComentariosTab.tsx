import { useEffect, useState } from 'react';
import { AlertTriangle, MessageCircle, Send, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../../lib/apiClient';
import type { ComentarioItem } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useAuth } from '../../../hooks/useAuth';

export function ComentariosTab({ projectId, rdoId }: { projectId: number; rdoId: number }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState<ComentarioItem[]>([]);
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<'comentario' | 'ocorrencia'>('comentario');

  function load() {
    api.get<{ comentarios: ComentarioItem[] }>(`/projects/${projectId}/rdos/${rdoId}/comentarios`).then((r) => setItems(r.comentarios));
  }

  useEffect(load, [projectId, rdoId]);

  async function handleSend() {
    if (!texto.trim()) {
      notify('Escreva algo antes de enviar.', 'error');
      return;
    }
    try {
      await api.post(`/projects/${projectId}/rdos/${rdoId}/comentarios`, { tipo, texto: texto.trim() });
      setTexto('');
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao enviar comentário.', 'error');
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/projects/${projectId}/rdos/${rdoId}/comentarios/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800">Comentários e Ocorrências</h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className={`p-3 rounded-lg border flex items-start justify-between gap-2 ${item.tipo === 'ocorrencia' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                {item.tipo === 'ocorrencia' ? <AlertTriangle className="w-3 h-3 text-amber-600" /> : <MessageCircle className="w-3 h-3" />}
                <span className="font-medium">{item.author_name ?? 'Usuário'}</span>
                <span>{new Date(item.created_at).toLocaleString('pt-BR')}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{item.texto}</p>
            </div>
            {(item.author_id === user?.id || user?.isAdmin) && (
              <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600 shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400 text-center py-6">Nenhum comentário registrado.</p>}
      </div>

      <div className="flex gap-2 items-start bg-gray-50 border border-gray-200 rounded-lg p-3">
        <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="px-2 py-2 border border-gray-300 rounded-md text-sm">
          <option value="comentario">Comentário</option>
          <option value="ocorrencia">Ocorrência</option>
        </select>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="Escreva um comentário ou registre uma ocorrência..."
        />
        <Button onClick={handleSend}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
