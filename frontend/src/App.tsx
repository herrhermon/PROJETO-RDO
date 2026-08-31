import type { ReactNode } from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { ProjectSelectionPage } from './pages/ProjectSelectionPage';
import { ProjectLayout } from './pages/ProjectLayout';
import { DashboardPage } from './pages/DashboardPage';
import { RdosPage } from './pages/RdosPage';
import { RdoEditorPage } from './pages/RdoEditorPage';
import { CadastroPage } from './pages/CadastroPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminProjectAccessPage } from './pages/AdminProjectAccessPage';
import { AdminOrganizationsPage } from './pages/AdminOrganizationsPage';
import { AdminAuditPage } from './pages/AdminAuditPage';
import { NotFoundPage } from './pages/NotFoundPage';

function StaffOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.role === 'member') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function MasterOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ProjectSelectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <ProtectedRoute>
            <ProjectLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="rdos" element={<RdosPage />} />
        <Route path="rdos/:rdoId" element={<RdoEditorPage />} />
        <Route path="cadastro" element={<CadastroPage />} />
      </Route>
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <StaffOnly>
              <AdminShell>
                <AdminUsersPage />
              </AdminShell>
            </StaffOnly>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/project-access"
        element={
          <ProtectedRoute>
            <StaffOnly>
              <AdminShell>
                <AdminProjectAccessPage />
              </AdminShell>
            </StaffOnly>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/organizations"
        element={
          <ProtectedRoute>
            <MasterOnly>
              <AdminShell>
                <AdminOrganizationsPage />
              </AdminShell>
            </MasterOnly>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={
          <ProtectedRoute>
            <MasterOnly>
              <AdminShell>
                <AdminAuditPage />
              </AdminShell>
            </MasterOnly>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white' : 'text-blue-200 hover:bg-eqc-800 hover:text-white'}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-eqc-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <span className="font-bold tracking-wider">
            EQC<span className="font-light">Tec</span> — Administração
          </span>
          <nav className="flex gap-2">
            <NavLink to="/admin/users" className={tabClass}>
              Usuários
            </NavLink>
            <NavLink to="/admin/project-access" className={tabClass}>
              Projetos &amp; Empresas
            </NavLink>
            {user?.isAdmin && (
              <>
                <NavLink to="/admin/organizations" className={tabClass}>
                  Organizações
                </NavLink>
                <NavLink to="/admin/audit" className={tabClass}>
                  Auditoria
                </NavLink>
              </>
            )}
          </nav>
        </div>
        <a href="/" className="text-blue-200 hover:text-white text-sm">
          Voltar aos Projetos
        </a>
      </header>
      <div className="p-4 md:p-8">{children}</div>
    </div>
  );
}
