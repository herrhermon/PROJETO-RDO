import { useEffect, useState } from 'react';
import { Check, GripVertical, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, ApiError } from '../../../lib/apiClient';
import type { EquipamentoItem } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import { useCatalog } from '../../../hooks/useCatalog';
import { useRowReorder } from '../../../hooks/useRowReorder';
import { CatalogSelect } from '../CatalogSelect';

const PROPRIEDADE_OPTIONS: { value: EquipamentoItem['propriedade']; label: string }[] = [
  { value: 'proprio', label: 'Próprio' },
  { value: 'alugado', label: 'Alugado' },
  { value: 'terceiro', label: 'Terceiro' },
];

export function EquipamentosTab({ projectId, rdoId, editable }: { projectId: number; rdoId: number; editable: boolean }) {
  const { notify } = useToast();
  const { empresas, reload: reloadCatalog } = useCatalog(projectId);
  const [items, setItems] = useState<EquipamentoItem[]>([]);
  const [tipo, setTipo] = useState('');
  const [propriedade, setPropriedade] = useState<EquipamentoItem['propriedade']>('proprio');
  const [empresa, setEmpresa] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<EquipamentoItem>>({});

  const base = `/projects/${projectId}/rdos/${rdoId}/equipamentos`;
  const { rowProps } = useRowReorder(items, setItems, `${base}/reorder`, (m) => {
    notify(m, 'error');
    load();
  });

  function load() {
    api.get<{ equipamentos: EquipamentoItem[] }>(base).then((r) => setItems(r.equipamentos));
  }

  useEffect(load, [projectId, rdoId]);

  async function handleAdd() {
    if (!tipo) return notify('Informe o tipo do equipamento antes de adicionar.', 'error');
    if (!quantidade) return notify('Informe a quantidade antes de adicionar.', 'error');
    try {
      await api.post(base, { tipo, propriedade, empresa: empresa || undefined, quantidade: Number(quantidade) });
      setTipo('');
      setEmpresa('');
      setQuantidade('');
      load();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao adicionar equipamento.', 'error');
    }
  }

  function startEdit(item: EquipamentoItem) {
    setEditingId(item.id);
    setDraft({ tipo: item.tipo, propriedade: item.propriedade, empresa: item.empresa, quantidade: item.quantidade });
  }

  async function saveEdit(id: number) {
    if (!draft.tipo?.trim()) return notify('O tipo não pode ficar vazio.', 'error');
    if (draft.quantidade === undefined || Number(draft.quantidade) < 0) return notify('Informe uma quantidade válida.', 'error');
    try {
      await api.patch(`${base}/${id}`, {
        tipo: draft.tipo.trim(),
        propriedade: draft.propriedade,
        empresa: draft.empresa || undefined,
        quantidade: Number(draft.quantidade),
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

  const propriedadeLabel = (p: string) => PROPRIEDADE_OPTIONS.find((o) => o.value === p)?.label ?? p;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-800">Equipamentos</h3>

      {editable && items.length > 1 && (
        <p className="text-xs text-gray-400">Arraste as linhas pela alça à esquerda para mudar a ordem — ela vale também no PDF.</p>
      )}

      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-50 text-xs uppercase text-gray-600">
          <tr>
            {editable && <th className="w-8"></th>}
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Propriedade</th>
            <th className="px-3 py-2 text-left">Empresa</th>
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
                  <input
                    value={draft.tipo ?? ''}
                    onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                  />
                </td>
                <td className="px-2 py-2">
                  <select
                    value={draft.propriedade ?? 'proprio'}
                    onChange={(e) => setDraft({ ...draft, propriedade: e.target.value as EquipamentoItem['propriedade'] })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white"
                  >
                    {PROPRIEDADE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
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
                <td className="px-3 py-2">{item.tipo}</td>
                <td className="px-3 py-2">{propriedadeLabel(item.propriedade)}</td>
                <td className="px-3 py-2">{item.empresa ?? '-'}</td>
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
          <div>
            <label className="block text-xs text-gray-600 mb-1">Tipo</label>
            <input value={tipo} onChange={(e) => setTipo(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ex: Betoneira" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Propriedade</label>
            <select value={propriedade} onChange={(e) => setPropriedade(e.target.value as EquipamentoItem['propriedade'])} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              {PROPRIEDADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
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
