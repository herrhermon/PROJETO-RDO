import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Avatar } from '../ui/Avatar';
import { EditProfileModal } from './EditProfileModal';

export function UserMenu({ profileLabel }: { profileLabel: string }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-800">{user?.name}</p>
          <p className="text-xs text-gray-500">{profileLabel}</p>
        </div>
        <Avatar name={user?.name ?? ''} avatarPath={user?.avatarPath} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
          <div className="px-4 py-2 border-b border-gray-100 sm:hidden">
            <p className="text-sm font-bold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500">{profileLabel}</p>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setShowEdit(true);
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" /> Editar Cadastro
          </button>
          <button onClick={() => logout()} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Sair do Sistema
          </button>
        </div>
      )}

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
    </div>
  );
}
