import { useEffect, useState } from 'react';
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../../../lib/apiClient';
import type { EfetivoItem } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useCatalog } from '../../../hooks/useCatalog';
import { useRowReorder } from '../../../hooks/useRowReorder';
import { CatalogSelect } from '../CatalogSelect';

const TURNOS = ['manha', 'tarde', 'noite', 'integral'];

export function EfetivoTab({ projectId, rdoId, editable }: { projectId: number; rdoId: number; editable: boolean }) {
  const { notify } = useToast();
  const { funcoes, empresas, reload: reloadCatalog } = useCatalog(projectId);
  const [items, setItems] = useState<EfetivoItem[]>([]);
  const [funcao, setFuncao] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [turno, setTurno] = useState('integral');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<EfetivoItem>>({});

  const base = `/projects/${projectId}/rdos/${rdoId}/efetivo`;
  const { rowProps } = useRowReorder(items, setItems, `${base}/reorder`, (m) => {
    notify(m, 'error');
    load();
  });

  function load() {
    api.get<{ efetivo: EfetivoItem[] }>(base).then((r) => setItems(r.efetivo));
  }

  useEffect(load, [projectId, rdoId]);

  async function handleAdd() {
    if (!funcao) return notify('Selecione a função antes de adicionar.', 'error');
    if (!quantidade) return notify('Informe a quantidade antes de adicionar.', 'error');
    try {
      await api.post(base, { funcao, empresa: empresa || undefined, quantidade: Number(quantidade), turno });
      setFuncao('');
      setEmpresa('');
      setQuantidade('');
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao adicionar item.', 'error');
    }
  }

  function startEdit(item: EfetivoItem) {
    setEditingId(item.id);
    setDraft({ funcao: item.funcao, empresa: item.empresa, quantidade: item.quantidade, turno: item.turno });
  }

  async function saveEdit(id: number) {
    if (!draft.funcao) return notify('A função não pode ficar vazia.', 'error');
    if (draft.quantidade === undefined || Number(draft.quantidade) < 0) return notify('Informe uma quantidade válida.', 'error');
    try {
      await api.patch(`${base}/${id}`, {
        funcao: draft.funcao,
        empresa: draft.empresa || undefined,
        quantidade: Number(draft.quantidade),
        turno: draft.turno || undefined,
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

  const total = items.reduce((sum, i) => sum + i.quantidade, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800">Efetivo (Mão de Obra)</h3>
        <span className="text-sm text-gray-500">Total: {total} pessoas</span>
      </div>

      {editable && items.length > 1 && (
        <p className="text-xs text-gray-400">Arraste as linhas pela alça à esquerda para mudar a ordem — ela vale também no PDF.</p>
      )}

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-xs uppercase text-gray-600">
          <tr>
            {editable && <th className="w-8"></th>}
            <th className="px-3 py-2 text-left">Função</th>
            <th className="px-3 py-2 text-left">Empresa</th>
            <th className="px-3 py-2 text-left">Turno</th>
            <th className="px-3 py-2 text-left">Qtd.</th>
            {editable && <th className="px-3 py-2"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) =>
            editingId === item.id ? (
              <tr key={item.id} className="bg-blue-50/60">
                {editable && <td></td>}
                <td className="px-2 py-2">
                  <select
                    value={draft.funcao ?? ''}
                    onChange={(e) => setDraft({ ...draft, funcao: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {funcoes.map((f) => (
                      <option key={f.id} value={f.nome}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={draft.empresa ?? ''}
                    onChange={(e) => setDraft({ ...draft, empresa: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    <option value="">—</option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.nome}>
                        {e.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <select
                    value={draft.turno ?? ''}
                    onChange={(e) => setDraft({ ...draft, turno: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white capitalize"
                  >
                    {TURNOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number"
                    min={0}
                    value={draft.quantidade ?? ''}
                    onChange={(e) => setDraft({ ...draft, quantidade: Number(e.target.value) })}
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
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
              <tr key={item.id} {...(editable ? rowProps(item.id) : {})}>
                {editable && (
                  <td className="pl-2 text-gray-300 cursor-grab active:cursor-grabbing" title="Arraste para reordenar">
                    <GripVertical className="w-4 h-4" />
                  </td>
                )}
                <td className="px-3 py-2">{item.funcao}</td>
                <td className="px-3 py-2">{item.empresa ?? '-'}</td>
                <td className="px-3 py-2 capitalize">{item.turno ?? '-'}</td>
                <td className="px-3 py-2">{item.quantidade}</td>
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
            )
          )}
          {items.length === 0 && (
            <tr>
              <td colSpan={editable ? 6 : 4} className="px-3 py-6 text-center text-gray-400">
                Nenhum registro.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {editable && (
        <div className="flex flex-wrap gap-2 items-end bg-gray-50 border border-gray-200 rounded-lg p-3">
          <CatalogSelect
            label="Função"
            value={funcao}
            onChange={setFuncao}
            options={funcoes}
            projectId={projectId}
            resource="funcoes"
            onCreated={reloadCatalog}
          />
          <CatalogSelect
            label="Empresa"
            value={empresa}
            onChange={setEmpresa}
            options={empresas}
            projectId={projectId}
            resource="empresas"
            onCreated={reloadCatalog}
          />
          <div>
            <label className="block text-xs text-gray-600 mb-1">Turno</label>
            <select value={turno} onChange={(e) => setTurno(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              {TURNOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Quantidade</label>
            <input type="number" min={0} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm w-24" />
          </div>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}
