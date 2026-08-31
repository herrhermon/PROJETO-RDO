import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export function AdminPanelLink({ dark }: { dark?: boolean }) {
  return (
    <Link
      to="/admin/users"
      className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
        dark ? 'text-blue-200 hover:bg-white/10 hover:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-eqc-900'
      }`}
    >
      <ShieldCheck className="w-4 h-4" /> Painel ADM
    </Link>
  );
}
