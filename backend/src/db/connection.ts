import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { env } from '../config/env';

fs.mkdirSync(path.dirname(env.dbPath), { recursive: true });

export const db = new DatabaseSync(env.dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');
