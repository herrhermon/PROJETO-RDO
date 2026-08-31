import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router } from 'express';
import sharp from 'sharp';
import { db } from '../../db/connection';
import { env } from '../../config/env';
import { recordAudit } from '../../utils/audit';
import { uploadAnexos } from '../../middleware/upload';
import { getRdo, assertRdoEditable } from './rdos.service';

export const anexosRouter = Router({ mergeParams: true });

const MAX_DIMENSION = 1920;
const THUMBNAIL_DIMENSION = 320;

anexosRouter.get('/', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  const rows = db.prepare('SELECT * FROM rdo_anexos WHERE rdo_id = ? ORDER BY id').all(rdoId);
  res.json({ anexos: rows });
});

anexosRouter.post('/', uploadAnexos.array('files', 20), async (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  const tipo = req.body?.tipo === 'documento' ? 'documento' : 'foto';
  const userId = (req as any).user.id;

  const dir = path.join(env.uploadsDir, 'rdos', String(rdoId));
  fs.mkdirSync(dir, { recursive: true });

  const created: any[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const legendaField = req.body?.[`legenda_${i}`];
    const legenda = typeof legendaField === 'string' && legendaField.trim() ? legendaField.trim() : null;
    const isImage = file.mimetype.startsWith('image/');
    const baseName = crypto.randomUUID();

    if (isImage) {
      const fileName = `${baseName}.jpg`;
      const thumbName = `${baseName}_thumb.jpg`;
      const filePath = path.join(dir, fileName);
      const thumbPath = path.join(dir, thumbName);

      const image = sharp(file.buffer).rotate();
      const resized = image.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 });
      await resized.toFile(filePath);
      await sharp(file.buffer).rotate().resize({ width: THUMBNAIL_DIMENSION, height: THUMBNAIL_DIMENSION, fit: 'inside' }).jpeg({ quality: 70 }).toFile(thumbPath);
      const meta = await sharp(filePath).metadata();

      const result = db
        .prepare(
          `INSERT INTO rdo_anexos (rdo_id, tipo, file_name, storage_path, mime_type, size_bytes, width_px, height_px, thumbnail_path, legenda, uploaded_by)
           VALUES (?, ?, ?, ?, 'image/jpeg', ?, ?, ?, ?, ?, ?)`
        )
        .run(
          rdoId,
          tipo,
          file.originalname,
          `rdos/${rdoId}/${fileName}`,
          fs.statSync(filePath).size,
          meta.width ?? null,
          meta.height ?? null,
          `rdos/${rdoId}/${thumbName}`,
          legenda,
          userId
        );
      created.push(db.prepare('SELECT * FROM rdo_anexos WHERE id = ?').get(result.lastInsertRowid));
    } else {
      const ext = path.extname(file.originalname) || '';
      const fileName = `${baseName}${ext}`;
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      const result = db
        .prepare(
          `INSERT INTO rdo_anexos (rdo_id, tipo, file_name, storage_path, mime_type, size_bytes, legenda, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(rdoId, tipo, file.originalname, `rdos/${rdoId}/${fileName}`, file.mimetype, file.size, legenda, userId);
      created.push(db.prepare('SELECT * FROM rdo_anexos WHERE id = ?').get(result.lastInsertRowid));
    }
  }

  recordAudit({ entityType: 'rdo_anexos', action: 'create', userId, projectId, detail: { count: created.length } });
  res.status(201).json({ anexos: created });
});

anexosRouter.delete('/:itemId', (req, res) => {
  const projectId = Number((req.params as any).projectId);
  const rdoId = Number((req.params as any).rdoId);
  const rdo = getRdo(projectId, rdoId);
  if (!rdo) return res.status(404).json({ error: 'RDO não encontrado.' });
  assertRdoEditable(rdo);
  const current = db.prepare('SELECT * FROM rdo_anexos WHERE id = ? AND rdo_id = ?').get((req.params as any).itemId, rdoId) as any;
  if (!current) return res.status(404).json({ error: 'Anexo não encontrado.' });
  db.prepare('DELETE FROM rdo_anexos WHERE id = ?').run(current.id);
  for (const relPath of [current.storage_path, current.thumbnail_path]) {
    if (!relPath) continue;
    const abs = path.join(env.uploadsDir, relPath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
  recordAudit({ entityType: 'rdo_anexos', entityId: current.id, action: 'delete', userId: (req as any).user.id, projectId });
  res.json({ ok: true });
});
