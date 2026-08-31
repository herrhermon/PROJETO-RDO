import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { useProjectContext } from './ProjectLayout';
import { useCatalog } from '../hooks/useCatalog';
import type { RdoTemplate } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

type SubTab = 'funcoes' | 'empresas' | 'modelos';

export function CadastroPage() {
  const { project } = useProjectContext();
  const [tab, setTab] = useState<SubTab>('funcoes');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Cadastro</h2>
        <p className="text-gray-500">Funções, empresas e modelos de RDO do projeto {project.name}</p>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-fit">
        {(
          [
            ['funcoes', 'Funções'],
            ['empresas', 'Empresas'],
            ['modelos', 'Modelos de RDO'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
              tab === key ? 'bg-white text-eqc-900 shadow-sm border border-gray-200' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'funcoes' && <SimpleCatalogList kind="funcoes" projectId={project.id} label="Função" />}
      {tab === 'empresas' && <SimpleCatalogList kind="empresas" projectId={project.id} label="Empresa" />}
      {tab === 'modelos' && <ModelosList projectId={project.id} />}
    </div>
  );
}

function SimpleCatalogList({ kind, projectId, label }: { kind: 'funcoes' | 'empresas'; projectId: number; label: string }) {
  const { funcoes, empresas, reload } = useCatalog(projectId);
  const { notify } = useToast();
  const [nome, setNome] = useState('');
  const items = kind === 'funcoes' ? funcoes : empresas;

  async function handleAdd() {
    if (!nome.trim()) return notify(`Informe o nome da ${label.toLowerCase()} antes de adicionar.`, 'error');
    try {
      await api.post(`/projects/${projectId}/${kind}`, { nome: nome.trim() });
      setNome('');
      reload();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao cadastrar.', 'error');
    }
  }

  async function handleDelete(id: number) {
    await api.delete(`/projects/${projectId}/${kind}/${id}`);
    reload();
  }

  return (
    <Card className="p-6 max-w-lg space-y-4">
      <div className="flex gap-2">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={`Nome da ${label.toLowerCase()}`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>
      <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between px-4 py-2 text-sm">
            {item.nome}
            <button onClick={() => handleDelete(item.id)} className="text-gray-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="px-4 py-6 text-center text-gray-400 text-sm">Nenhum {label.toLowerCase()} cadastrada ainda.</li>}
      </ul>
    </Card>
  );
}

const TURNOS = ['manha', 'tarde', 'noite', 'integral'];
const PROPRIEDADES = ['proprio', 'alugado', 'terceiro'] as const;

interface EfetivoDraft {
  funcao: string;
  empresa: string;
  quantidade: string;
  turno: string;
}
interface EquipamentoDraft {
  tipo: string;
  propriedade: (typeof PROPRIEDADES)[number];
  empresa: string;
  quantidade: string;
}
interface ServicoDraft {
  descricao: string;
  unidade: string;
  quantidadePlanejada: string;
  empresa: string;
}
interface ComentarioDraft {
  texto: string;
}

function ModelosList({ projectId }: { projectId: number }) {
  const { notify } = useToast();
  const { funcoes, empresas } = useCatalog(projectId);
  const [templates, setTemplates] = useState<RdoTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);

  function load() {
    api.get<{ templates: RdoTemplate[] }>(`/projects/${projectId}/templates`).then((r) => setTemplates(r.templates));
  }
  useEffect(load, [projectId]);

  async function handleDelete(id: number) {
    await api.delete(`/projects/${projectId}/templates/${id}`);
    load();
  }

  return (
    <div className="space-y-4">
      <Button onClick={() => setShowForm((v) => !v)}>
        <Plus className="w-4 h-4" /> {showForm ? 'Fechar formulário' : 'Novo Modelo'}
      </Button>

      {showForm && (
        <TemplateForm
          projectId={projectId}
          funcoes={funcoes}
          empresas={empresas}
          onCreated={() => {
            setShowForm(false);
            load();
            notify('Modelo criado.');
          }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-800">{t.nome}</h4>
              <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {t.comentarios.length > 0 && (
              <ul className="mb-2 space-y-0.5">
                {t.comentarios.map((c, i) => (
                  <li key={i} className="text-xs text-gray-600 italic">
                    "{c.texto}"
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-gray-500">
              Efetivo padrão: {t.efetivo.length} item(ns) · Equipamentos padrão: {t.equipamentos.length} item(ns) · Serviço padrão: {t.servicos.length} item(ns)
            </p>
          </Card>
        ))}
        {templates.length === 0 && !showForm && <p className="text-sm text-gray-400">Nenhum modelo cadastrado ainda.</p>}
      </div>
    </div>
  );
}

function TemplateForm({
  projectId,
  funcoes,
  empresas,
  onCreated,
}: {
  projectId: number;
  funcoes: { id: number; nome: string }[];
  empresas: { id: number; nome: string }[];
  onCreated: () => void;
}) {
  const { notify } = useToast();
  const [nome, setNome] = useState('');
  const [efetivo, setEfetivo] = useState<EfetivoDraft[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDraft[]>([]);
  const [servicos, setServicos] = useState<ServicoDraft[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioDraft[]>([]);

  function addEfetivoRow() {
    setEfetivo((prev) => [...prev, { funcao: '', empresa: '', quantidade: '1', turno: 'integral' }]);
  }
  function addEquipamentoRow() {
    setEquipamentos((prev) => [...prev, { tipo: '', propriedade: 'proprio', empresa: '', quantidade: '1' }]);
  }
  function addServicoRow() {
    setServicos((prev) => [...prev, { descricao: '', unidade: '', quantidadePlanejada: '', empresa: '' }]);
  }
  function addComentarioRow() {
    setComentarios((prev) => [...prev, { texto: '' }]);
  }

  async function handleSubmit() {
    if (!nome.trim()) return;
    try {
      await api.post(`/projects/${projectId}/templates`, {
        nome: nome.trim(),
        efetivo: efetivo.filter((e) => e.funcao).map((e) => ({ funcao: e.funcao, empresa: e.empresa || undefined, quantidade: Number(e.quantidade) || 0, turno: e.turno })),
        equipamentos: equipamentos
          .filter((e) => e.tipo)
          .map((e) => ({ tipo: e.tipo, propriedade: e.propriedade, empresa: e.empresa || undefined, quantidade: Number(e.quantidade) || 0 })),
        servicos: servicos
          .filter((s) => s.descricao)
          .map((s) => ({
            descricao: s.descricao,
            unidade: s.unidade || undefined,
            quantidadePlanejada: s.quantidadePlanejada ? Number(s.quantidadePlanejada) : undefined,
            empresa: s.empresa || undefined,
          })),
        comentarios: comentarios.filter((c) => c.texto.trim()).map((c) => ({ texto: c.texto.trim() })),
      });
      onCreated();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao criar modelo.', 'error');
    }
  }

  return (
    <Card className="p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do modelo</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Ex: Domingo / Feriado" />
      </div>

      <p className="text-xs text-gray-500 -mt-2">
        Condições climáticas não podem ser padronizadas em um modelo — o clima real do dia é sempre informado na hora de emitir o RDO.
      </p>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Comentário padrão</label>
          <Button variant="secondary" onClick={addComentarioRow}>
            <Plus className="w-4 h-4" /> Adicionar linha
          </Button>
        </div>
        <div className="space-y-2">
          {comentarios.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                value={row.texto}
                onChange={(e) => setComentarios((prev) => prev.map((r, j) => (j === i ? { ...r, texto: e.target.value } : r)))}
                placeholder="Ex: Não houve expediente (domingo/feriado)."
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <button onClick={() => setComentarios((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {comentarios.length === 0 && <p className="text-xs text-gray-400">Nenhum comentário padrão ainda.</p>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Efetivo padrão</label>
          <Button variant="secondary" onClick={addEfetivoRow}>
            <Plus className="w-4 h-4" /> Adicionar linha
          </Button>
        </div>
        <div className="space-y-2">
          {efetivo.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <select
                value={row.funcao}
                onChange={(e) => setEfetivo((prev) => prev.map((r, j) => (j === i ? { ...r, funcao: e.target.value } : r)))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Função...</option>
                {funcoes.map((f) => (
                  <option key={f.id} value={f.nome}>
                    {f.nome}
                  </option>
                ))}
              </select>
              <select
                value={row.empresa}
                onChange={(e) => setEfetivo((prev) => prev.map((r, j) => (j === i ? { ...r, empresa: e.target.value } : r)))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Empresa...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.nome}>
                    {emp.nome}
                  </option>
                ))}
              </select>
              <select
                value={row.turno}
                onChange={(e) => setEfetivo((prev) => prev.map((r, j) => (j === i ? { ...r, turno: e.target.value } : r)))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                {TURNOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={row.quantidade}
                onChange={(e) => setEfetivo((prev) => prev.map((r, j) => (j === i ? { ...r, quantidade: e.target.value } : r)))}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <button onClick={() => setEfetivo((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Equipamentos padrão</label>
          <Button variant="secondary" onClick={addEquipamentoRow}>
            <Plus className="w-4 h-4" /> Adicionar linha
          </Button>
        </div>
        <div className="space-y-2">
          {equipamentos.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <input
                value={row.tipo}
                onChange={(e) => setEquipamentos((prev) => prev.map((r, j) => (j === i ? { ...r, tipo: e.target.value } : r)))}
                placeholder="Tipo"
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={row.propriedade}
                onChange={(e) => setEquipamentos((prev) => prev.map((r, j) => (j === i ? { ...r, propriedade: e.target.value as any } : r)))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                {PROPRIEDADES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={row.empresa}
                onChange={(e) => setEquipamentos((prev) => prev.map((r, j) => (j === i ? { ...r, empresa: e.target.value } : r)))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Empresa...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.nome}>
                    {emp.nome}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={row.quantidade}
                onChange={(e) => setEquipamentos((prev) => prev.map((r, j) => (j === i ? { ...r, quantidade: e.target.value } : r)))}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <button onClick={() => setEquipamentos((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Serviço padrão</label>
          <Button variant="secondary" onClick={addServicoRow}>
            <Plus className="w-4 h-4" /> Adicionar linha
          </Button>
        </div>
        <div className="space-y-2">
          {servicos.map((row, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <input
                value={row.descricao}
                onChange={(e) => setServicos((prev) => prev.map((r, j) => (j === i ? { ...r, descricao: e.target.value } : r)))}
                placeholder="Ex: Segurança patrimonial"
                className="flex-1 min-w-[200px] px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <input
                value={row.unidade}
                onChange={(e) => setServicos((prev) => prev.map((r, j) => (j === i ? { ...r, unidade: e.target.value } : r)))}
                placeholder="Un."
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <input
                type="number"
                min={0}
                value={row.quantidadePlanejada}
                onChange={(e) => setServicos((prev) => prev.map((r, j) => (j === i ? { ...r, quantidadePlanejada: e.target.value } : r)))}
                placeholder="Qtd. planejada"
                className="w-32 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
              <select
                value={row.empresa}
                onChange={(e) => setServicos((prev) => prev.map((r, j) => (j === i ? { ...r, empresa: e.target.value } : r)))}
                className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Empresa...</option>
                {empresas.map((emp) => (
                  <option key={emp.id} value={emp.nome}>
                    {emp.nome}
                  </option>
                ))}
              </select>
              <button onClick={() => setServicos((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!nome.trim()}>
        Salvar Modelo
      </Button>
    </Card>
  );
}
