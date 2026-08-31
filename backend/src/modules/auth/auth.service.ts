import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../../db/connection';
import { env } from '../../config/env';
import type { AuthenticatedUser, UserRole } from '../../types/express';

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  phone: string | null;
  avatar_path: string | null;
  role: UserRole;
  organization_id: number | null;
  is_active: number;
  must_reset_password: number;
}

const getUserByEmailStmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
const insertSessionStmt = db.prepare(`
  INSERT INTO sessions (id, user_id, expires_at, user_agent, ip_address)
  VALUES (@id, @userId, @expiresAt, @userAgent, @ipAddress)
`);
const deleteSessionStmt = db.prepare('DELETE FROM sessions WHERE id = ?');
const getSessionStmt = db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?');
const getUserByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');

function toAuthenticatedUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    avatarPath: row.avatar_path,
    role: row.role,
    organizationId: row.organization_id,
    isAdmin: row.role === 'master',
    mustResetPassword: !!row.must_reset_password,
  };
}

export function verifyCredentials(email: string, password: string): AuthenticatedUser | null {
  const row = getUserByEmailStmt.get(email) as UserRow | undefined;
  if (!row || !row.is_active) return null;
  const ok = bcrypt.compareSync(password, row.password_hash);
  if (!ok) return null;
  return toAuthenticatedUser(row);
}

export function createSession(userId: number, userAgent?: string, ipAddress?: string): { id: string; expiresAt: string } {
  const id = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + env.sessionTtlHours * 3600 * 1000).toISOString();
  insertSessionStmt.run({ id, userId, expiresAt, userAgent: userAgent ?? null, ipAddress: ipAddress ?? null });
  return { id, expiresAt };
}

export function destroySession(sessionId: string) {
  deleteSessionStmt.run(sessionId);
}

export function getUserFromSession(sessionId: string): AuthenticatedUser | null {
  const session = getSessionStmt.get(sessionId) as { user_id: number; expires_at: string } | undefined;
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    deleteSessionStmt.run(sessionId);
    return null;
  }
  const row = getUserByIdStmt.get(session.user_id) as UserRow | undefined;
  if (!row || !row.is_active) return null;
  return toAuthenticatedUser(row);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function updateOwnProfile(userId: number, input: { name?: string; phone?: string }): AuthenticatedUser | null {
  const current = getUserByIdStmt.get(userId) as UserRow | undefined;
  if (!current) return null;
  db.prepare("UPDATE users SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?").run(
    input.name ?? current.name,
    input.phone === undefined ? current.phone : input.phone,
    userId
  );
  return toAuthenticatedUser(getUserByIdStmt.get(userId) as unknown as UserRow);
}

export function setOwnAvatar(userId: number, avatarPath: string): AuthenticatedUser | null {
  const current = getUserByIdStmt.get(userId) as UserRow | undefined;
  if (!current) return null;
  db.prepare("UPDATE users SET avatar_path = ?, updated_at = datetime('now') WHERE id = ?").run(avatarPath, userId);
  return toAuthenticatedUser(getUserByIdStmt.get(userId) as unknown as UserRow);
}

export function changeOwnPassword(userId: number, currentPassword: string, newPassword: string): 'ok' | 'wrong_password' | 'not_found' {
  const row = getUserByIdStmt.get(userId) as UserRow | undefined;
  if (!row) return 'not_found';
  if (!bcrypt.compareSync(currentPassword, row.password_hash)) return 'wrong_password';
  db.prepare("UPDATE users SET password_hash = ?, must_reset_password = 0, updated_at = datetime('now') WHERE id = ?").run(hashPassword(newPassword), userId);
  return 'ok';
}
