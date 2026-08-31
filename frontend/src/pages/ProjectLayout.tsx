import { useEffect, useState } from 'react';
import { Navigate, Outlet, useOutletContext, useParams } from 'react-router-dom';
import { api } from '../lib/apiClient';
import type { Project, ProjectCompany } from '../lib/types';
import type { ProjectMe } from '../lib/permissions';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';

interface ProjectContextValue {
  project: Project;
  me: ProjectMe;
  reloadProject: () => void;
}

export function useProjectContext() {
  return useOutletContext<ProjectContextValue>();
}

export function ProjectLayout() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [me, setMe] = useState<ProjectMe | null>(null);
  const [companies, setCompanies] = useState<ProjectCompany[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function load() {
    if (!projectId) return;
    api
      .get<{ project: Project }>(`/projects/${projectId}`)
      .then((res) => setProject(res.project))
      .catch(() => setNotFound(true));
    api.get<{ me: ProjectMe }>(`/projects/${projectId}/me`).then((res) => setMe(res.me));
    api.get<{ companies: ProjectCompany[] }>(`/projects/${projectId}/companies`).then((res) => setCompanies(res.companies));
  }

  useEffect(load, [projectId]);

  if (notFound) return <Navigate to="/" replace />;
  if (!project || !me) return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando projeto...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-gray-800">
      <Sidebar mobileOpen={mobileOpen} me={me} onNavigate={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        <Header project={project} me={me} companies={companies} mobileOpen={mobileOpen} onToggleMobile={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet context={{ project, me, reloadProject: load } satisfies ProjectContextValue} />
        </main>
      </div>
    </div>
  );
}
