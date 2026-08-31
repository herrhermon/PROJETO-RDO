import { db } from '../../db/connection';
import { HttpError } from '../../middleware/errorHandler';

export interface OrganizationRow {
  id: number;
  nome: string;
  logo_path: string | null;
  created_at: string;
  updated_at: string;
}

export function listAllOrganizations(): OrganizationRow[] {
  return db.prepare('SELECT * FROM organizations ORDER BY nome').all() as unknown as OrganizationRow[];
}

export function getOrganization(id: number): OrganizationRow | undefined {
  return db.prepare('SELECT * FROM organizations WHERE id = ?').get(id) as unknown as OrganizationRow | undefined;
}

export function createOrganization(nome: string): OrganizationRow {
  const existing = db.prepare('SELECT id FROM organizations WHERE nome = ? COLLATE NOCASE').get(nome);
  if (existing) throw new HttpError(409, 'Já existe uma empresa com esse nome.');
  const result = db.prepare('INSERT INTO organizations (nome) VALUES (?)').run(nome);
  return getOrganization(Number(result.lastInsertRowid))!;
}

export function updateOrganization(id: number, nome: string): OrganizationRow | null {
  const current = getOrganization(id);
  if (!current) return null;
  const existing = db.prepare('SELECT id FROM organizations WHERE nome = ? COLLATE NOCASE AND id != ?').get(nome, id);
  if (existing) throw new HttpError(409, 'Já existe uma empresa com esse nome.');
  db.prepare("UPDATE organizations SET nome = ?, updated_at = datetime('now') WHERE id = ?").run(nome, id);
  return getOrganization(id)!;
}

export function setOrganizationLogo(id: number, logoPath: string): OrganizationRow | null {
  const current = getOrganization(id);
  if (!current) return null;
  db.prepare("UPDATE organizations SET logo_path = ?, updated_at = datetime('now') WHERE id = ?").run(logoPath, id);
  return getOrganization(id)!;
}
