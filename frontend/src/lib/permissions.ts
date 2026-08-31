export type UserRole = 'master' | 'org_admin' | 'member';

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatarPath: string | null;
  role: UserRole;
  organizationId: number | null;
  isAdmin: boolean;
  mustResetPassword: boolean;
}

export type CompanyTipo = 'construtora' | 'gerenciadora' | 'cliente';

export interface ProjectMe {
  isAdmin: boolean;
  companyTipo: CompanyTipo | null;
  canIssue: boolean;
  canValidate: boolean;
  validationLevel: number | null;
  canManageProject: boolean;
}

export function isStaff(user: CurrentUser | null): boolean {
  return !!user && user.role !== 'member';
}

export function canEditRdo(me: ProjectMe | null): boolean {
  return !!me && (me.isAdmin || me.canIssue);
}

export function validationLevelFor(me: ProjectMe | null): number | null {
  return me?.validationLevel ?? null;
}

export function canValidate(me: ProjectMe | null): boolean {
  return !!me && (me.isAdmin || me.canValidate);
}
