import { useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, UserX } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../lib/permissions';
import type { Organization } from '../lib/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organization_id: number | null;
  is_active: number;
}

const ROLE_LABELS: Record<UserRole, string> = { master: 'Master', org_admin: 'Admin de Empresa', member: 'Membro' };
const ROLE_BADGE: Record<UserRole, string> = {
  master: 'bg-blue-50 text-eqc-900',
  org_admin: 'bg-purple-50 text-purple-700',
  member: 'bg-gray-100 text-gray-500',
};

export function AdminUsersPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const isMaster = !!user?.isAdmin;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  function load() {
    api.get<{ users: AdminUser[] }>('/users').then((r) => setUsers(r.users));
  }

  useEffect(load, []);
  useEffect(() => {
    if (isMaster) api.get<{ organizations: Organization[] }>('/organizations').then((r) => setOrganizations(r.organizations));
  }, [isMaster]);

  async function toggleActive(u: AdminUser) {
    await api.patch(`/users/${u.id}`, { isActive: !u.is_active });
    load();
  }

  async function updateRole(u: AdminUser, role: UserRole, organizationId: number | null) {
    try {
      await api.patch(`/users/${u.id}`, { role, organizationId: role === 'master' ? null : organizationId });
      load();
      notify('Papel atualizado.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao atualizar papel.', 'error');
    }
  }

  async function resetPassword(u: AdminUser) {
    const newPassword = prompt(`Nova senha temporária para ${u.name}:`, 'Eqtec@123');
    if (!newPassword) return;
    await api.post(`/users/${u.id}/reset-password`, { newPassword });
    notify('Senha redefinida.');
  }

  function orgName(id: number | null) {
    return organizations.find((o) => o.id === id)?.nome ?? '-';
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{isMaster ? 'Diretório de Usuários' : 'Minha Equipe'}</h2>
          <p className="text-gray-500">
            {isMaster
              ? 'Cadastro global de contas. O vínculo com projetos e nível de cada usuário é feito em '
              : 'Usuários da sua empresa. O vínculo com projetos e nível é feito em '}
            <span className="font-medium">Projetos &amp; Empresas</span>.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">E-mail</th>
              <th className="px-4 py-3">Papel</th>
              {isMaster && <th className="px-4 py-3">Empresa</th>}
              <th className="px-4 py-3">Status</th>
              {isMaster && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={u.is_active ? '' : 'opacity-50'}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3">{u.email}</td>
                <td className="px-4 py-3">
                  {isMaster ? (
                    <RoleCell user={u} organizations={organizations} onChange={(role, orgId) => updateRole(u, role, orgId)} />
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role]}`}>
                      {u.role === 'master' && <ShieldCheck className="w-3 h-3" />} {ROLE_LABELS[u.role]}
                    </span>
                  )}
                </td>
                {isMaster && <td className="px-4 py-3 text-gray-500">{orgName(u.organization_id)}</td>}
                <td className="px-4 py-3">{u.is_active ? 'Ativo' : 'Inativo'}</td>
                {isMaster && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditingUser(u)} title="Editar nome/e-mail" className="text-gray-400 hover:text-eqc-900 mr-2">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => resetPassword(u)} title="Redefinir senha" className="text-gray-400 hover:text-eqc-900 mr-2">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(u)} title={u.is_active ? 'Desativar' : 'Reativar'} className="text-gray-400 hover:text-red-600">
                      <UserX className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={isMaster ? 6 : 4} className="px-4 py-8 text-center text-gray-400">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {showCreate && (
        <CreateUserModal
          isMaster={isMaster}
          organizations={organizations}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const { notify } = useToast();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      setError('Preencha nome e e-mail.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, { name: name.trim(), email: email.trim() });
      notify('Usuário atualizado.');
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar usuário.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar Usuário" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
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

function RoleCell({
  user,
  organizations,
  onChange,
}: {
  user: AdminUser;
  organizations: Organization[];
  onChange: (role: UserRole, organizationId: number | null) => void;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [organizationId, setOrganizationId] = useState<number | ''>(user.organization_id ?? '');

  useEffect(() => {
    setRole(user.role);
    setOrganizationId(user.organization_id ?? '');
  }, [user.role, user.organization_id]);

  function handleRoleChange(value: UserRole) {
    setRole(value);
    if (value === 'master') {
      onChange('master', null);
    } else if (organizationId !== '') {
      onChange(value, Number(organizationId));
    }
  }

  function handleOrgChange(value: string) {
    const orgId = value ? Number(value) : '';
    setOrganizationId(orgId);
    if (role !== 'master' && orgId !== '') onChange(role, Number(orgId));
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={role}
        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
        className="px-2 py-1 border border-gray-300 rounded-md text-xs"
      >
        <option value="master">Master</option>
        <option value="org_admin">Admin de Empresa</option>
        <option value="member">Membro</option>
      </select>
      {role !== 'master' && (
        <select value={organizationId} onChange={(e) => handleOrgChange(e.target.value)} className="px-2 py-1 border border-gray-300 rounded-md text-xs">
          <option value="">Sem empresa</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function CreateUserModal({
  isMaster,
  organizations,
  onClose,
  onCreated,
}: {
  isMaster: boolean;
  organizations: Organization[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Eqtec@123');
  const [role, setRole] = useState<UserRole>('member');
  const [organizationId, setOrganizationId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      await api.post('/users', {
        name,
        email,
        password,
        ...(isMaster ? { role, organizationId: role === 'master' ? undefined : organizationId || undefined } : {}),
      });
      notify('Usuário criado.');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar usuário.');
    }
  }

  return (
    <Modal title="Novo Usuário" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha inicial</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        {isMaster ? (
          <div className="flex gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="member">Membro</option>
                <option value="org_admin">Admin de Empresa</option>
                <option value="master">Master</option>
              </select>
            </div>
            {role !== 'master' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                <select
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Sem empresa</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">O usuário será criado como Membro da sua empresa.</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !email || !password}>
            Criar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
