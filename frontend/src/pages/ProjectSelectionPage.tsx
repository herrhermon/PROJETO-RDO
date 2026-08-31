import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, LogOut, MapPin } from 'lucide-react';
import { api } from '../lib/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { Project } from '../lib/types';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { AdminPanelLink } from '../components/layout/AdminPanelLink';

const STATUS_LABELS: Record<string, string> = {
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  pausado: 'Pausado',
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  em_andamento: 'bg-blue-500/90',
  concluido: 'bg-green-500/90',
  pausado: 'bg-amber-500/90',
};

export function ProjectSelectionPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ projects: Project[] }>('/projects')
      .then((res) => setProjects(res.projects))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-eqc-900 text-white p-6 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded flex items-center justify-center font-bold text-eqc-900 text-sm">EQC</div>
          <span className="text-lg font-light tracking-widest">PORTAL CORPORATIVO</span>
        </div>
        <div className="flex items-center gap-3">
          {user && user.role !== 'member' && <AdminPanelLink dark />}
          <div className="text-right hidden md:block">
            <p className="text-sm font-bold">{user?.name}</p>
            <p className="text-xs text-blue-300">
              {user?.isAdmin ? 'Perfil: Administrador' : user?.role === 'org_admin' ? 'Perfil: Admin de Empresa' : 'Perfil: Usuário'}
            </p>
          </div>
          <Avatar name={user?.name ?? ''} avatarPath={user?.avatarPath} />
          <button onClick={() => logout()} title="Sair" className="text-blue-200 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Seus Projetos</h2>
          <p className="text-gray-500 mt-2">Selecione uma obra para acessar o painel de gestão.</p>
        </div>

        {loading && <p className="text-gray-500">Carregando projetos...</p>}
        {!loading && projects.length === 0 && <p className="text-gray-500">Nenhum projeto vinculado ao seu usuário.</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/dashboard`)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
            >
              <div className="h-48 bg-gradient-to-br from-eqc-900 to-eqc-800 relative flex items-end p-4 overflow-hidden">
                {project.cover_image_url && (
                  <>
                    <img
                      src={api.uploadUrl(project.cover_image_url)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  </>
                )}
                <div
                  className={`absolute top-3 right-3 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full ${
                    STATUS_BADGE_CLASSES[project.status] ?? 'bg-black/40'
                  }`}
                >
                  {STATUS_LABELS[project.status] ?? project.status.replace('_', ' ')}
                </div>
                <h3 className="relative text-xl font-bold text-white">{project.name}</h3>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
                  <MapPin className="w-4 h-4" /> {project.city}, {project.state}
                </p>
                <div className="mb-4">
                  <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                    <span>Avanço Físico</span>
                    <span>{project.physical_progress_pct}%</span>
                  </div>
                  <ProgressBar value={project.physical_progress_pct} colorClass={project.physical_progress_pct >= 100 ? 'bg-green-500' : 'bg-blue-600'} />
                </div>
                <button className="w-full flex items-center justify-center gap-2 bg-gray-50 group-hover:bg-blue-50 text-eqc-900 font-medium py-2 rounded-lg border border-gray-200 transition-colors">
                  Acessar Painel <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
