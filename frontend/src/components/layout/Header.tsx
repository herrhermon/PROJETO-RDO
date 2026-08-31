import { useMemo, useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { Project, ProjectCompany } from '../../lib/types';
import type { ProjectMe } from '../../lib/permissions';
import { api } from '../../lib/apiClient';
import { UserMenu } from './UserMenu';
import { AdminPanelLink } from './AdminPanelLink';

const COMPANY_TIPO_LABELS: Record<string, string> = {
  construtora: 'Construtora',
  gerenciadora: 'Gerenciadora',
  cliente: 'Cliente',
};

const LOGO_ORDER: ProjectCompany['tipo'][] = ['cliente', 'gerenciadora', 'construtora'];

export function Header({
  project,
  me,
  companies,
  mobileOpen,
  onToggleMobile,
}: {
  project?: Project | null;
  me?: ProjectMe | null;
  companies?: ProjectCompany[];
  mobileOpen: boolean;
  onToggleMobile: () => void;
}) {
  const profileLabel = me?.isAdmin
    ? 'Administrador'
    : me?.canManageProject
    ? 'Admin de Empresa'
    : me?.companyTipo
    ? COMPANY_TIPO_LABELS[me.companyTipo]
    : 'Sem empresa vinculada';
  const [brokenIds, setBrokenIds] = useState<Set<number>>(new Set());
  const allLogos = useMemo(
    () => LOGO_ORDER.map((tipo) => companies?.find((c) => c.tipo === tipo && c.logo_path)).filter((c): c is ProjectCompany => !!c),
    [companies]
  );
  const logos = allLogos.filter((c) => !brokenIds.has(c.id));

  return (
    <>
      <div className="md:hidden bg-eqc-900 text-white p-4 flex justify-between items-center">
        <div className="font-bold text-xl">Intranet EQC</div>
        <button onClick={onToggleMobile}>{mobileOpen ? <X /> : <Menu />}</button>
      </div>
      <header className="bg-white shadow-sm border-b px-6 py-4 hidden md:flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="text-gray-500 text-sm font-medium">
            {project && (
              <>
                Projeto Selecionado: <span className="text-eqc-900 font-bold bg-blue-50 px-2 py-1 rounded ml-2">{project.name}</span>
              </>
            )}
          </div>
          {logos.length > 0 && (
            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              {logos.map((c) => (
                <img
                  key={c.id}
                  src={api.uploadUrl(c.logo_path!)}
                  alt={c.nome}
                  title={`${COMPANY_TIPO_LABELS[c.tipo]}: ${c.nome}`}
                  className="h-9 max-w-[110px] object-contain"
                  onError={() => setBrokenIds((prev) => new Set(prev).add(c.id))}
                />
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {me?.canManageProject && <AdminPanelLink />}
          <UserMenu profileLabel={profileLabel} />
        </div>
      </header>
    </>
  );
}
