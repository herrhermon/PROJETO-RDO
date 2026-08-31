import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Building, ClipboardList, FileText, Home } from 'lucide-react';
import { canEditRdo, type ProjectMe } from '../../lib/permissions';

export function Sidebar({ mobileOpen, me, onNavigate }: { mobileOpen: boolean; me: ProjectMe; onNavigate?: () => void }) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const menuItems = [
    { to: `/projects/${projectId}/dashboard`, label: 'Dashboard Geral', icon: <Home className="w-5 h-5" /> },
    { to: `/projects/${projectId}/rdos`, label: 'Diário de Obras (RDO)', icon: <FileText className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={`${mobileOpen ? 'block' : 'hidden'} md:flex md:h-screen md:sticky md:top-0 w-full md:w-64 bg-eqc-900 text-white flex-shrink-0 shadow-xl z-20 flex flex-col`}
    >
      <div className="p-6 border-b border-blue-900/50 hidden md:block">
        <h1 className="text-2xl font-bold tracking-wider cursor-pointer" onClick={() => navigate('/')} title="Voltar aos Projetos">
          EQC<span className="font-light">Tec</span>
        </h1>
        <p className="text-blue-300 text-xs mt-1 uppercase tracking-widest">Portal Corporativo</p>
      </div>
      <nav className="p-4 space-y-2 mt-4 flex-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                isActive ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200 hover:bg-eqc-800 hover:text-white'
              }`
            }
          >
            {item.icon} <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-blue-900/50 space-y-2 flex-shrink-0">
        {canEditRdo(me) && (
          <NavLink
            to={`/projects/${projectId}/cadastro`}
            onClick={onNavigate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition bg-eqc-800 hover:bg-blue-700 text-white"
          >
            <ClipboardList className="w-4 h-4" /> Cadastro
          </NavLink>
        )}
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition border border-blue-800 text-blue-200 hover:bg-eqc-800 hover:text-white"
        >
          <Building className="w-4 h-4" /> Trocar de Projeto
        </button>
      </div>
    </aside>
  );
}
