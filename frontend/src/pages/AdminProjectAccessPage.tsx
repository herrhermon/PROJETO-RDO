import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import type { Organization, Project } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

type CompanyTipo = 'construtora' | 'gerenciadora' | 'cliente';

interface Company {
  id: number;
  tipo: CompanyTipo;
  nome: string;
  logo_path: string | null;
  organization_id: number | null;
}

interface ChainStatus {
  hasConstrutora: boolean;
  hasGerenciadora: boolean;
  hasCliente: boolean;
  chainComplete: boolean;
}

interface MemberDetail {
  user_id: number;
  name: string;
  email: string;
  company_id: number | null;
  company_nome: string | null;
  company_tipo: CompanyTipo | null;
  level: number;
}

const TIER_RANK: Record<CompanyTipo, number> = { construtora: 1, gerenciadora: 2, cliente: 3 };

function levelRangeHint(members: MemberDetail[], tipo: CompanyTipo, excludeUserId: number): { min: number; max: number | null } {
  const rank = TIER_RANK[tipo];
  let maxBelow = 0;
  let minAbove: number | null = null;
  for (const m of members) {
    if (m.user_id === excludeUserId || !m.company_tipo || m.level < 1) continue;
    const otherRank = TIER_RANK[m.company_tipo];
    if (otherRank < rank) maxBelow = Math.max(maxBelow, m.level);
    if (otherRank > rank) minAbove = minAbove === null ? m.level : Math.min(minAbove, m.level);
  }
  return { min: maxBelow + 1, max: minAbove !== null ? minAbove - 1 : null };
}

interface DirectoryUser {
  id: number;
  name: string;
  email: string;
}

const TIPO_LABELS: Record<CompanyTipo, string> = { construtora: 'Construtora', gerenciadora: 'Gerenciadora', cliente: 'Cliente' };
const TIPO_BADGE: Record<CompanyTipo, string> = {
  construtora: 'bg-blue-50 text-blue-700 border-blue-200',
  gerenciadora: 'bg-purple-50 text-purple-700 border-purple-200',
  cliente: 'bg-green-50 text-green-700 border-green-200',
};

export function AdminProjectAccessPage() {
  const { notify } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [tab, setTab] = useState<'empresas' | 'membros'>('empresas');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [chainStatus, setChainStatus] = useState<ChainStatus | null>(null);
  const [members, setMembers] = useState<MemberDetail[]>([]);
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);

  function loadProjects(selectId?: number) {
    api.get<{ projects: Project[] }>('/projects').then((r) => {
      setProjects(r.projects);
      if (selectId) setProjectId(selectId);
      else if (r.projects.length > 0 && projectId === null) setProjectId(r.projects[0].id);
    });
  }

  useEffect(() => {
    loadProjects();
    api.get<{ organizations: Organization[] }>('/organizations').then((r) => setOrganizations(r.organizations));
  }, []);

  function loadCompanies() {
    if (!projectId) return;
    api.get<{ companies: Company[]; chainStatus: ChainStatus }>(`/projects/${projectId}/companies`).then((r) => {
      setCompanies(r.companies);
      setChainStatus(r.chainStatus);
    });
  }

  function loadMembers() {
    if (!projectId) return;
    api.get<{ members: MemberDetail[]; chainStatus: ChainStatus }>(`/projects/${projectId}/member-companies`).then((r) => {
      setMembers(r.members);
      setChainStatus(r.chainStatus);
    });
  }

  useEffect(() => {
    loadCompanies();
    loadMembers();
  }, [projectId]);

  async function handleDeleteCompany(id: number) {
    try {
      await api.delete(`/projects/${projectId}/companies/${id}`);
      loadCompanies();
      loadMembers();
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao excluir empresa.', 'error');
    }
  }

  async function handleSetMemberCompanyAndLevel(userId: number, companyId: number | null, level: number) {
    try {
      await api.put(`/projects/${projectId}/member-companies/${userId}`, { companyId, level });
      loadMembers();
      notify('Vínculo atualizado.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao atualizar vínculo.', 'error');
    }
  }

  async function handleRemoveMember(userId: number) {
    if (!confirm('Remover este usuário do projeto?')) return;
    await api.delete(`/projects/${projectId}/member-companies/${userId}`);
    loadMembers();
  }

  async function handleUploadLogo(companyId: number, file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify('Selecione uma imagem JPG, PNG ou WEBP.', 'error');
      return;
    }
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/projects/${projectId}/companies/${companyId}/logo`, form);
      loadCompanies();
      notify('Logo atualizada.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao enviar a logo.', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Projetos &amp; Empresas</h2>
          <p className="text-gray-500">Empresas e níveis de acesso por projeto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowEditProject(true)} disabled={!projectId}>
            <Pencil className="w-4 h-4" /> Editar Projeto
          </Button>
          <Button onClick={() => setShowNewProject(true)}>
            <Plus className="w-4 h-4" /> Novo Projeto
          </Button>
        </div>
      </div>

      <div className="max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">Projeto</label>
        <select
          value={projectId ?? ''}
          onChange={(e) => setProjectId(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {chainStatus && (
        <Card className="p-4 flex flex-wrap gap-4 items-center text-sm">
          <StatusPill ok={chainStatus.hasConstrutora} labelOk="Construtora cadastrada" labelMissing="Sem Construtora — nenhum RDO poderá ser emitido" />
          <StatusPill
            ok={chainStatus.hasGerenciadora}
            labelOk="Gerenciadora cadastrada"
            labelMissing="Sem Gerenciadora (opcional)"
            neutralWhenMissing
          />
          <StatusPill ok={chainStatus.hasCliente} labelOk="Cliente cadastrado" labelMissing="Sem Cliente — RDOs não poderão ser submetidos para validação" />
        </Card>
      )}

      <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200 w-fit">
        {(
          [
            ['empresas', 'Empresas'],
            ['membros', 'Membros'],
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

      {tab === 'empresas' && (
        <Card className="overflow-x-auto">
          <div className="p-4 flex justify-end">
            <Button onClick={() => setShowNewCompany(true)}>
              <Plus className="w-4 h-4" /> Nova Empresa
            </Button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <CompanyLogoCell company={c} onUpload={(file) => handleUploadLogo(c.id, file)} />
                  </td>
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${TIPO_BADGE[c.tipo]}`}>{TIPO_LABELS[c.tipo]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDeleteCompany(c.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma empresa cadastrada neste projeto ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'membros' && (
        <Card className="overflow-x-auto">
          <div className="p-4 flex justify-end">
            <Button onClick={() => setShowAddMember(true)}>
              <Plus className="w-4 h-4" /> Adicionar Membro
            </Button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Empresa neste projeto</th>
                <th className="px-4 py-3">Nível</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.map((m) => (
                <MemberRow
                  key={m.user_id}
                  member={m}
                  members={members}
                  companies={companies}
                  onSave={handleSetMemberCompanyAndLevel}
                  onRemove={() => handleRemoveMember(m.user_id)}
                />
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Nenhum usuário vinculado a este projeto ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {showNewCompany && projectId && (
        <NewCompanyModal
          projectId={projectId}
          organizations={organizations}
          onOrganizationCreated={(org) => setOrganizations((prev) => [...prev, org])}
          onClose={() => setShowNewCompany(false)}
          onCreated={() => {
            setShowNewCompany(false);
            loadCompanies();
          }}
        />
      )}
      {showAddMember && projectId && (
        <AddMemberModal
          projectId={projectId}
          existingUserIds={members.map((m) => m.user_id)}
          onClose={() => setShowAddMember(false)}
          onAdded={() => {
            setShowAddMember(false);
            loadMembers();
          }}
        />
      )}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(id) => {
            setShowNewProject(false);
            loadProjects(id);
          }}
        />
      )}
      {showEditProject && projectId && (
        <EditProjectModal
          project={projects.find((p) => p.id === projectId)!}
          onClose={() => setShowEditProject(false)}
          onUpdated={() => {
            setShowEditProject(false);
            loadProjects(projectId);
          }}
        />
      )}
    </div>
  );
}

function StatusPill({
  ok,
  labelOk,
  labelMissing,
  neutralWhenMissing,
}: {
  ok: boolean;
  labelOk: string;
  labelMissing: string;
  neutralWhenMissing?: boolean;
}) {
  if (ok) {
    return (
      <span className="flex items-center gap-1.5 text-green-700">
        <CheckCircle2 className="w-4 h-4" /> {labelOk}
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-1.5 ${neutralWhenMissing ? 'text-gray-500' : 'text-amber-700'}`}>
      <AlertTriangle className="w-4 h-4" /> {labelMissing}
    </span>
  );
}

function MemberRow({
  member,
  members,
  companies,
  onSave,
  onRemove,
}: {
  member: MemberDetail;
  members: MemberDetail[];
  companies: Company[];
  onSave: (userId: number, companyId: number | null, level: number) => void;
  onRemove: () => void;
}) {
  const [companyId, setCompanyId] = useState<number | ''>(member.company_id ?? '');
  const [level, setLevel] = useState(String(member.level));

  useEffect(() => {
    setCompanyId(member.company_id ?? '');
    setLevel(String(member.level));
  }, [member.company_id, member.level]);

  const selectedCompany = companies.find((c) => c.id === companyId);
  const hint = selectedCompany ? levelRangeHint(members, selectedCompany.tipo, member.user_id) : null;

  const typedLevel = Number(level);
  const levelError = !companyId
    ? null
    : !Number.isFinite(typedLevel) || level.trim() === ''
    ? 'Informe um número.'
    : typedLevel < 1
    ? 'O nível precisa ser 1 ou mais.'
    : hint && typedLevel < hint.min
    ? `O nível precisa ser ${hint.min} ou maior.`
    : hint && hint.max !== null && typedLevel > hint.max
    ? `O nível precisa ser no máximo ${hint.max}.`
    : null;

  function handleCompanyChange(value: string) {
    if (!value) {
      setCompanyId('');
      setLevel('0');
      onSave(member.user_id, null, 0);
      return;
    }
    const id = Number(value);
    const company = companies.find((c) => c.id === id);
    const defaultLevel = company ? levelRangeHint(members, company.tipo, member.user_id).min : 1;
    setCompanyId(id);
    setLevel(String(defaultLevel));
    onSave(member.user_id, id, defaultLevel);
  }

  function handleLevelBlur() {
    if (!companyId || levelError) return;
    const n = Number(level);
    if (n === member.level) return;
    onSave(member.user_id, Number(companyId), n);
  }

  return (
    <tr>
      <td className="px-4 py-3 font-medium">{member.name}</td>
      <td className="px-4 py-3">{member.email}</td>
      <td className="px-4 py-3">
        <select
          value={companyId}
          onChange={(e) => handleCompanyChange(e.target.value)}
          className="px-2 py-1.5 border border-gray-300 rounded-md text-sm min-w-[220px]"
        >
          <option value="">Nível 0 — Visualizador (só leitura)</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {TIPO_LABELS[c.tipo]} — {c.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          min={0}
          disabled={!companyId}
          value={companyId ? level : '0'}
          onChange={(e) => setLevel(e.target.value)}
          onBlur={handleLevelBlur}
          className={`w-20 px-2 py-1.5 border rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-400 ${
            levelError ? 'border-red-400 bg-red-50 text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400' : 'border-gray-300'
          }`}
        />
        {levelError ? (
          <p className="text-[10px] text-red-600 font-medium mt-0.5">{levelError}</p>
        ) : (
          hint && (
            <p className="text-[10px] text-gray-400 mt-0.5">{hint.max !== null ? `Entre ${hint.min} e ${hint.max}` : `${hint.min} ou maior`}</p>
          )
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={onRemove} className="text-gray-400 hover:text-red-600">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

function CompanyLogoCell({ company, onUpload }: { company: Company; onUpload: (file: File) => Promise<void> }) {
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
      title={company.logo_path ? 'Trocar logo' : 'Enviar logo'}
      className="relative w-16 h-10 rounded border border-gray-200 bg-white flex items-center justify-center overflow-hidden hover:border-eqc-900 transition-colors disabled:opacity-60"
    >
      {company.logo_path && !broken ? (
        <img src={api.uploadUrl(company.logo_path)} alt="" className="max-w-full max-h-full object-contain" onError={() => setBroken(true)} />
      ) : (
        <ImagePlus className="w-4 h-4 text-gray-300" />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleChange(e.target.files)}
      />
    </button>
  );
}

function NewCompanyModal({
  projectId,
  organizations,
  onOrganizationCreated,
  onClose,
  onCreated,
}: {
  projectId: number;
  organizations: Organization[];
  onOrganizationCreated: (org: Organization) => void;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { notify } = useToast();
  const [tipo, setTipo] = useState<CompanyTipo>('construtora');
  const [organizationId, setOrganizationId] = useState<number | ''>('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newOrgNome, setNewOrgNome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setError(null);
    let orgId = organizationId;
    let nome = organizations.find((o) => o.id === organizationId)?.nome ?? '';

    setSaving(true);
    try {
      if (creatingNew) {
        if (!newOrgNome.trim()) {
          setError('Informe o nome da empresa.');
          setSaving(false);
          return;
        }
        const res = await api.post<{ organization: Organization }>('/organizations', { nome: newOrgNome.trim() });
        onOrganizationCreated(res.organization);
        orgId = res.organization.id;
        nome = res.organization.nome;
      } else if (!orgId) {
        setError('Selecione uma empresa.');
        setSaving(false);
        return;
      }

      await api.post(`/projects/${projectId}/companies`, { nome, tipo, organizationId: orgId });
      notify('Empresa cadastrada.');
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as CompanyTipo)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
            {(Object.keys(TIPO_LABELS) as CompanyTipo[]).map((t) => (
              <option key={t} value={t}>
                {TIPO_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
          {creatingNew ? (
            <div className="flex gap-2">
              <input
                value={newOrgNome}
                onChange={(e) => setNewOrgNome(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: Racional Engenharia"
                autoFocus
              />
              <Button variant="secondary" onClick={() => setCreatingNew(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value ? Number(e.target.value) : '')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecione...</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => setCreatingNew(true)}>
                + Nova
              </Button>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">Empresas são cadastradas globalmente e reutilizadas entre projetos.</p>
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

function AddMemberModal({
  projectId,
  existingUserIds,
  onClose,
  onAdded,
}: {
  projectId: number;
  existingUserIds: number[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const { notify } = useToast();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [userId, setUserId] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Eqtec@123');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<{ users: DirectoryUser[] }>('/users').then((r) => setUsers(r.users.filter((u) => !existingUserIds.includes(u.id))));
  }, []);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    try {
      let targetUserId = userId;
      if (creatingNew) {
        if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
          setError('Preencha nome, e-mail e senha.');
          setSaving(false);
          return;
        }
        const res = await api.post<{ user: { id: number } }>('/users', {
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
        });
        targetUserId = String(res.user.id);
      } else if (!userId) {
        setError('Selecione um usuário.');
        setSaving(false);
        return;
      }
      await api.put(`/projects/${projectId}/member-companies/${targetUserId}`, { companyId: null, level: 0 });
      notify(creatingNew ? 'Usuário criado e adicionado ao projeto.' : 'Usuário adicionado ao projeto.');
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao adicionar usuário.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Adicionar Membro" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Usuário</label>
          {creatingNew ? (
            <div className="space-y-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Nome"
                autoFocus
              />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="E-mail"
              />
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Senha inicial"
              />
              <button type="button" onClick={() => setCreatingNew(false)} className="text-xs text-eqc-900 underline">
                Selecionar usuário existente
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Selecione...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={() => setCreatingNew(true)}>
                + Novo
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">O usuário entra sem empresa vinculada (acesso só leitura); defina a empresa dele na tabela de membros em seguida.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [startDate, setStartDate] = useState('');
  const [construtoraNome, setConstrutoraNome] = useState('');
  const [clienteNome, setClienteNome] = useState('');
  const [gerenciadoraNome, setGerenciadoraNome] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const missing = !name.trim() || !city.trim() || !state.trim() || !country.trim() || !startDate || !construtoraNome.trim() || !clienteNome.trim();

  async function handleSubmit() {
    if (missing) {
      setError('Preencha nome, localização, data de início, Construtora e Cliente antes de salvar.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await api.post<{ project: { id: number }; geocoded: boolean }>('/projects', {
        name: name.trim(),
        code: code.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        startDate,
        construtoraNome: construtoraNome.trim(),
        clienteNome: clienteNome.trim(),
        gerenciadoraNome: gerenciadoraNome.trim() || undefined,
      });
      if (!res.geocoded) {
        notify('Projeto criado, mas não localizamos essa cidade — a previsão do tempo ficará indisponível até ajustar a localização.', 'error');
      } else {
        notify('Projeto criado.');
      }
      onCreated(res.project.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar projeto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Novo Projeto" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do projeto</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ex: Kronolog Extrema I" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Código (opcional)</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ex: KRO-EXT-01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ex: Extrema" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input value={state} onChange={(e) => setState(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ex: Minas Gerais" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-3">
          <p className="text-xs text-gray-500">Todo projeto precisa de uma empresa Construtora e uma Cliente. Gerenciadora é opcional.</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Construtora</label>
            <input value={construtoraNome} onChange={(e) => setConstrutoraNome(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ex: Kronolog Engenharia" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ex: Diase Participações" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gerenciadora (opcional)</label>
            <input value={gerenciadoraNome} onChange={(e) => setGerenciadoraNome(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Ex: EQC" />
          </div>
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

function EditProjectModal({ project, onClose, onUpdated }: { project: Project; onClose: () => void; onUpdated: () => void }) {
  const { notify } = useToast();
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code ?? '');
  const [city, setCity] = useState(project.city);
  const [state, setState] = useState(project.state);
  const [country, setCountry] = useState(project.country);
  const [startDate, setStartDate] = useState(project.start_date);
  const [plannedEndDate, setPlannedEndDate] = useState(project.planned_end_date ?? '');
  const [physicalProgressPct, setPhysicalProgressPct] = useState(String(project.physical_progress_pct));
  const [coverImageUrl, setCoverImageUrl] = useState(project.cover_image_url);
  const [ecowittApplicationKey, setEcowittApplicationKey] = useState(project.ecowitt_application_key ?? '');
  const [ecowittApiKey, setEcowittApiKey] = useState(project.ecowitt_api_key ?? '');
  const [ecowittMac, setEcowittMac] = useState(project.ecowitt_mac ?? '');
  const [cemadenStationCode, setCemadenStationCode] = useState(project.cemaden_station_code ?? '');
  const [cemadenCodibge, setCemadenCodibge] = useState(project.cemaden_codibge ?? '');
  const [cemadenStations, setCemadenStations] = useState<string[] | null>(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const missing = !name.trim() || !city.trim() || !state.trim() || !country.trim() || !startDate;

  async function handleCoverSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify('Selecione uma imagem JPG, PNG ou WEBP.', 'error');
      return;
    }
    setUploadingCover(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<{ project: Project }>(`/projects/${project.id}/cover`, form);
      setCoverImageUrl(res.project.cover_image_url);
      notify('Imagem de capa atualizada.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao enviar a imagem de capa.', 'error');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  }

  async function handleLoadStations() {
    setLoadingStations(true);
    setStationsError(null);
    try {
      const res = await api.get<{ stations: string[]; error?: string }>(
        `/projects/${project.id}/cemaden-stations?codibge=${cemadenCodibge.trim()}`
      );
      setCemadenStations(res.stations);
      if (res.error) setStationsError(res.error);
    } catch (err) {
      setStationsError(err instanceof ApiError ? err.message : 'Não foi possível consultar o CEMADEN.');
    } finally {
      setLoadingStations(false);
    }
  }

  async function handleSubmit() {
    if (missing) {
      setError('Preencha nome, localização e data de início antes de salvar.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await api.patch<{ project: Project }>(`/projects/${project.id}`, {
        name: name.trim(),
        code: code.trim() || undefined,
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        startDate,
        plannedEndDate: plannedEndDate || undefined,
        physicalProgressPct: physicalProgressPct.trim() === '' ? undefined : Number(physicalProgressPct),
        ecowittApplicationKey: ecowittApplicationKey.trim() || null,
        ecowittApiKey: ecowittApiKey.trim() || null,
        ecowittMac: ecowittMac.trim() || null,
        cemadenStationCode: cemadenStationCode.trim() || null,
        cemadenCodibge: cemadenCodibge.trim() || null,
      });
      const cityChanged = res.project.city !== project.city || res.project.state !== project.state || res.project.country !== project.country;
      if (cityChanged && !res.project.latitude) {
        notify('Projeto atualizado, mas não localizamos essa cidade — a previsão do tempo ficará indisponível até ajustar a localização.', 'error');
      } else {
        notify('Projeto atualizado.');
      }
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar projeto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar Projeto" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Imagem de capa</label>
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200 bg-gradient-to-br from-eqc-900 to-eqc-800 flex items-center justify-center disabled:opacity-60"
          >
            {coverImageUrl && (
              <img
                src={api.uploadUrl(coverImageUrl)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setCoverImageUrl(null)}
              />
            )}
            <span className="relative z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white text-sm font-medium px-3 py-1.5 rounded-full">
              <Camera className="w-4 h-4" /> {uploadingCover ? 'Enviando...' : coverImageUrl ? 'Trocar capa' : 'Adicionar capa'}
            </span>
          </button>
          <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverSelect(e.target.files)} />
          <p className="text-xs text-gray-400 mt-1">A imagem é enviada automaticamente ao selecionar. Aparece no card do projeto.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do projeto</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Código (opcional)</label>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <input value={state} onChange={(e) => setState(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Previsão de término (opcional)</label>
            <input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Avanço físico (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={physicalProgressPct}
              onChange={(e) => setPhysicalProgressPct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Fonte de dados de chuva</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Opcional. Cadastre uma estação para permitir o preenchimento automático da chuva acumulada no RDO. Deixe em branco para usar apenas o
              preenchimento manual.
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">Estação Pluviométrica Automática (Ecowitt)</p>
            <input
              value={ecowittApplicationKey}
              onChange={(e) => setEcowittApplicationKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="Application Key"
            />
            <input
              value={ecowittApiKey}
              onChange={(e) => setEcowittApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="API Key"
            />
            <input
              value={ecowittMac}
              onChange={(e) => setEcowittMac(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              placeholder="MAC da estação (ex: 34:94:54:XX:XX:XX)"
            />
            <p className="text-[11px] text-gray-400">Obtenha as chaves em ecowitt.net → User Center → Private Center → API Keys.</p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-gray-600">Estação CEMADEN (rede pública)</p>
            <div className="flex gap-2">
              <input
                value={cemadenCodibge}
                onChange={(e) => {
                  setCemadenCodibge(e.target.value);
                  setCemadenStations(null);
                  setStationsError(null);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Código IBGE do município (ex: 3125101)"
              />
              <Button variant="secondary" onClick={handleLoadStations} disabled={loadingStations || !/^\d{7}$/.test(cemadenCodibge.trim())}>
                {loadingStations ? 'Buscando...' : 'Buscar estações'}
              </Button>
            </div>
            {cemadenStations && cemadenStations.length > 0 ? (
              <select
                value={cemadenStationCode}
                onChange={(e) => setCemadenStationCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
              >
                <option value="">Selecione a estação...</option>
                {cemadenStations.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={cemadenStationCode}
                onChange={(e) => setCemadenStationCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Código da estação (ex: 312510101A)"
              />
            )}
            {cemadenStations && cemadenStations.length === 0 && (
              <p className="text-[11px] text-amber-700">Nenhuma estação do CEMADEN encontrada neste município.</p>
            )}
            {stationsError && <p className="text-[11px] text-amber-700">{stationsError}</p>}
            <p className="text-[11px] text-gray-400">
              O código IBGE do município está em ibge.gov.br/explica/codigos-dos-municipios.php. Depois de informá-lo, use &quot;Buscar estações&quot; para
              escolher a estação mais próxima da obra.
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-500">As empresas do projeto (Construtora/Gerenciadora/Cliente) são geridas na aba Empresas.</p>

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
