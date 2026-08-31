import 'express';

export type UserRole = 'master' | 'org_admin' | 'member';

export interface AuthenticatedUser {
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

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
