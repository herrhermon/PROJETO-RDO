import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { api, ApiError } from '../../lib/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import type { CurrentUser } from '../../lib/permissions';

export function EditProfileModal({ onClose }: { onClose: () => void }) {
  const { user, setUser } = useAuth();
  const { notify } = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  async function handleAvatarSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify('Selecione uma imagem JPG, PNG ou WEBP.', 'error');
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post<{ user: CurrentUser }>('/auth/me/avatar', form);
      setUser(res.user);
      notify('Foto de perfil atualizada.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao enviar a foto.', 'error');
    } finally {
      setUploadingAvatar(false);
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSaveProfile() {
    if (!name.trim()) {
      notify('Informe seu nome.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await api.patch<{ user: CurrentUser }>('/auth/me', { name: name.trim(), phone: phone.trim() || undefined });
      setUser(res.user);
      notify('Cadastro atualizado.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao salvar cadastro.', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      notify('Preencha a senha atual e a nova senha.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      notify('A nova senha precisa ter pelo menos 6 caracteres.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('A confirmação não confere com a nova senha.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Senha alterada com sucesso.');
    } catch (err) {
      notify(err instanceof ApiError ? err.message : 'Erro ao trocar a senha.', 'error');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <Modal title="Editar Cadastro" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow disabled:opacity-60"
            disabled={uploadingAvatar}
            title="Trocar foto"
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <Avatar name={user?.name ?? ''} avatarPath={user?.avatarPath} size="lg" />
            )}
            <span className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center transition-colors">
              <Camera className="w-5 h-5 text-white opacity-0 hover:opacity-100" />
            </span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarSelect(e.target.files)} />
          <div>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="text-sm text-eqc-900 font-medium hover:underline disabled:opacity-60">
              {uploadingAvatar ? 'Enviando foto...' : 'Trocar foto'}
            </button>
            <p className="text-xs text-gray-400 mt-1">A foto é enviada automaticamente ao selecionar.</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-200 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            <p className="text-xs text-gray-400 mt-1">Usado futuramente para verificação em duas etapas.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-bold text-gray-700">Trocar senha</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
