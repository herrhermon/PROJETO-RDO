import { useEffect, useState } from 'react';
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../../../lib/apiClient';
import type { EfetivoItem, ServicoItem } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useCatalog } from '../../../hooks/useCatalog';
import { useRowReorder } from '../../../hooks/useRowReorder';
import { CatalogSelect } from '../CatalogSelect';

const STATUS_OPTIONS = ['em_andamento', 'concluido', 'paralisado'];

export function ServicosTab({ projectId, rdoId, editable }: { projectId: number; rdoId: number; editable: boolean }) {
  const { notify } = useToast();
  const { empresas, reload: reloadCatalog } = useCatalog(projectId);
  const [items, setItems] = useState<ServicoItem[]>([]);
  const [empresasDoEfetivo, setEmpresasDoEfetivo] = useState<string[]>([]);
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('');
  const [executada, setExecutada] = useState('');
  const [planejada, setPlanejada] = useState('');
  const [local, setLocal] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [status, setStatus] = useState('em_andamento');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<ServicoItem>>({});

  const base = `/projects/${projectId}/rdos/${rdoId}/servicos`;
  const { rowProps } = useRowReorder(items, setItems, `${base}/reorder`, (m) => {
    notify(m, 'error');
    load();
  });

  function load() {
    api.get<{ servicos: ServicoItem[] }>(base).then((r) => setItems(r.servicos));
    api.get<{ efetivo: EfetivoItem[] }>(`/projects/${projectId}/rdos/${rdoId}/efetivo`).then((r) => {
      const unique = Array.from(new Set(r.efetivo.map((e) => e.empresa).filter((e): e is string => !!e)));
      setEmpresasDoEfetivo(unique);
    });
  }

  useEffect(load, [projectId, rdoId]);

  // Companies already on today's crew come first, but the full project catalog stays
  // available so a service can be logged before its crew is entered.
  const empresasDisponiveis = Array.from(new Set([...empresasDoEfetivo, ...empresas.map((e) => e.nome)]));

  async function handleAdd() {
    if (!descricao) return notify('Informe a descrição do serviço antes de adicionar.', 'error');
    try {
      await api.post(base, {
        descricao,
        unidade: unidade || undefined,
        quantidadeExecutada: executada ? Number(executada) : undefined,
        quantidadePlanejada: planejada ? Number(planejada) : undefined,
        localizacao: local || undefined,
        empresa: empresa || undefined,
        statusExecucao: status,
      });
      setDescricao('');
      setUnidade('');
      setExecutada('');
      setPlanejada('');
      setLocal('');
      setEmpresa('');
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao adicionar serviço.', 'error');
    }
  }

  function startEdit(item: ServicoItem) {
    setEditingId(item.id);
    setDraft({ ...item });
  }

  async function saveEdit(id: number) {
    if (!draft.descricao?.trim()) return notify('A descrição não pode ficar vazia.', 'error');
    try {
      await api.patch(`${base}/${id}`, {
        descricao: draft.descricao.trim(),
        unidade: draft.unidade || undefined,
        quantidadeExecutada: draft.quantidade_executada != null ? Number(draft.quantidade_executada) : undefined,
        quantidadePlanejada: draft.quantidade_planejada != null ? Number(draft.quantidade_planejada) : undefined,
        localizacao: draft.localizacao || undefined,
        empresa: draft.empresa || undefined,
        statusExecucao: draft.status_execucao || undefined,
      });
      setEditingId(null);
      load();
      notify('Registro atualizado.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao salvar alteração.', 'error');
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`${base}/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800">Serviços Executados</h3>

      {editable && items.length > 1 && (
        <p className="text-xs text-gray-400">Arraste as linhas pela alça à esquerda para mudar a ordem — ela vale também no PDF.</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              {editable && <th className="w-8"></th>}
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-left">Un.</th>
              <th className="px-3 py-2 text-left">Executado</th>
              <th className="px-3 py-2 text-left">Planejado</th>
              <th className="px-3 py-2 text-left">Local</th>
              <th className="px-3 py-2 text-left">Empresa</th>
              <th className="px-3 py-2 text-left">Status</th>
              {editable && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => {
              const divergent =
                item.quantidade_planejada != null && item.quantidade_executada != null && item.quantidade_executada > item.quantidade_planejada;

              return editingId === item.id ? (
                <tr key={item.id} className="bg-blue-50/60">
                  {editable && <td></td>}
                  <td className="px-2 py-2">
                    <input
                      value={draft.descricao ?? ''}
                      onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
                      className="w-full min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={draft.unidade ?? ''}
                      onChange={(e) => setDraft({ ...draft, unidade: e.target.value })}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={draft.quantidade_executada ?? ''}
                      onChange={(e) => setDraft({ ...draft, quantidade_executada: e.target.value === '' ? null : Number(e.target.value) })}
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min={0}
                      value={draft.quantidade_planejada ?? ''}
                      onChange={(e) => setDraft({ ...draft, quantidade_planejada: e.target.value === '' ? null : Number(e.target.value) })}
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={draft.localizacao ?? ''}
                      onChange={(e) => setDraft({ ...draft, localizacao: e.target.value })}
                      className="w-28 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={draft.empresa ?? ''}
                      onChange={(e) => setDraft({ ...draft, empresa: e.target.value })}
                      className="w-full min-w-[120px] px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      <option value="">—</option>
                      {empresasDisponiveis.map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={draft.status_execucao ?? 'em_andamento'}
                      onChange={(e) => setDraft({ ...draft, status_execucao: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => saveEdit(item.id)} title="Salvar" className="text-green-600 hover:text-green-700 mr-2">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} title="Cancelar" className="text-gray-400 hover:text-gray-700">
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} {...(editable ? rowProps(item.id) : {})} className={divergent ? 'bg-amber-50' : undefined}>
                  {editable && (
                    <td className="pl-2 text-gray-300 cursor-grab active:cursor-grabbing" title="Arraste para reordenar">
                      <GripVertical className="w-4 h-4" />
                    </td>
                  )}
                  <td className="px-3 py-2">{item.descricao}</td>
                  <td className="px-3 py-2">{item.unidade ?? '-'}</td>
                  <td className="px-3 py-2">{item.quantidade_executada ?? '-'}</td>
                  <td className="px-3 py-2">{item.quantidade_planejada ?? '-'}</td>
                  <td className="px-3 py-2">{item.localizacao ?? '-'}</td>
                  <td className="px-3 py-2">{item.empresa ?? '-'}</td>
                  <td className="px-3 py-2 capitalize">{item.status_execucao?.replace('_', ' ') ?? '-'}</td>
                  {editable && (
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => startEdit(item)} title="Editar" className="text-gray-400 hover:text-eqc-900 mr-2">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} title="Excluir" className="text-gray-400 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={editable ? 9 : 7} className="px-3 py-6 text-center text-gray-400">
                  Nenhum registro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2 items-end bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs text-gray-600 mb-1">Descrição</label>
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Unidade</label>
            <input value={unidade} onChange={(e) => setUnidade(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-20" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Executado</label>
            <input type="number" min={0} value={executada} onChange={(e) => setExecutada(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-24" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Planejado</label>
            <input type="number" min={0} value={planejada} onChange={(e) => setPlanejada(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-24" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Local</label>
            <input value={local} onChange={(e) => setLocal(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-32" />
          </div>
          <CatalogSelect
            label="Empresa"
            value={empresa}
            onChange={setEmpresa}
            options={empresas}
            projectId={projectId}
            resource="empresas"
            onCreated={reloadCatalog}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-[140px]"
          />
          <div>
            <label className="block text-xs text-gray-600 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
