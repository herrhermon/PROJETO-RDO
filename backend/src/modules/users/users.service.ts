import { db } from '../../db/connection';
import { hashPassword } from '../auth/auth.service';
import type { UserRole } from '../../types/express';

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organization_id: number | null;
  is_active: number;
  must_reset_password: number;
  created_at: string;
}

const baseSelect = 'SELECT id, name, email, role, organization_id, is_active, must_reset_password, created_at FROM users';
const listUsersStmt = db.prepare(`${baseSelect} ORDER BY name`);
const listUsersByOrgStmt = db.prepare(`${baseSelect} WHERE organization_id = ? ORDER BY name`);
const getUserByIdStmt = db.prepare(`${baseSelect} WHERE id = ?`);

export function listUsers(scopeOrganizationId?: number | null): UserSummary[] {
  if (scopeOrganizationId != null) {
    return listUsersByOrgStmt.all(scopeOrganizationId) as unknown as UserSummary[];
  }
  return listUsersStmt.all() as unknown as UserSummary[];
}

export function getUserDetail(id: number): UserSummary | null {
  return (getUserByIdStmt.get(id) as unknown as UserSummary | undefined) ?? null;
}

export function createUser(input: { name: string; email: string; password: string; role?: UserRole; organizationId?: number | null }): number {
  const passwordHash = hashPassword(input.password);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role, organization_id, must_reset_password) VALUES (?, ?, ?, ?, ?, 1)')
    .run(input.name, input.email, passwordHash, input.role ?? 'member', input.organizationId ?? null);
  return Number(result.lastInsertRowid);
}

export function updateUser(id: number, input: { name?: string; email?: string; isActive?: boolean; role?: UserRole; organizationId?: number | null }) {
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
  if (!current) return false;
  db.prepare("UPDATE users SET name = ?, email = ?, is_active = ?, role = ?, organization_id = ?, updated_at = datetime('now') WHERE id = ?").run(
    input.name ?? current.name,
    input.email ?? current.email,
    input.isActive === undefined ? current.is_active : input.isActive ? 1 : 0,
    input.role ?? current.role,
    input.organizationId === undefined ? current.organization_id : input.organizationId,
    id
  );
  return true;
}

export function resetUserPassword(userId: number, newPassword: string) {
  const hash = hashPassword(newPassword);
  db.prepare("UPDATE users SET password_hash = ?, must_reset_password = 1, updated_at = datetime('now') WHERE id = ?").run(hash, userId);
}

export function emailExists(email: string, excludeId?: number): boolean {
  const row = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id != ?').get(email, excludeId ?? -1);
  return !!row;
}
