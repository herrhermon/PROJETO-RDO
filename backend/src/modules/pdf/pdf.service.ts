import fs from 'node:fs';
import path from 'node:path';
import puppeteer, { type Browser } from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { db } from '../../db/connection';
import { env } from '../../config/env';
import { HttpError } from '../../middleware/errorHandler';
import { renderRdoReportHtml } from './templates/rdo-report.template';

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  }
  return browserPromise;
}

function fileToDataUri(absPath: string): string {
  const buf = fs.readFileSync(absPath);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}

export async function generateRdoPdf(projectId: number, rdoId: number): Promise<Buffer> {
  const projectRow = db.prepare('SELECT name, city, state, code FROM projects WHERE id = ?').get(projectId) as any;
  const rdo = db.prepare('SELECT * FROM rdos WHERE id = ? AND project_id = ?').get(rdoId, projectId) as any;
  if (!rdo || !projectRow) throw new HttpError(404, 'RDO não encontrado.');
  const project = { name: projectRow.name, code: projectRow.code, location: [projectRow.city, projectRow.state].filter(Boolean).join(', ') || null };

  const signedByName = rdo.signed_by
    ? (db.prepare('SELECT name FROM users WHERE id = ?').get(rdo.signed_by) as any)?.name ?? null
    : null;
  const efetivo = db.prepare('SELECT * FROM rdo_efetivo WHERE rdo_id = ? ORDER BY ordem, id').all(rdoId) as any[];
  const equipamentos = db.prepare('SELECT * FROM rdo_equipamentos WHERE rdo_id = ? ORDER BY ordem, id').all(rdoId) as any[];
  const servicos = db.prepare('SELECT * FROM rdo_servicos WHERE rdo_id = ? ORDER BY ordem, id').all(rdoId) as any[];
  const comentarios = db
    .prepare(`SELECT c.*, u.name as author_name FROM rdo_comentarios c LEFT JOIN users u ON u.id = c.author_id WHERE c.rdo_id = ? ORDER BY c.created_at`)
    .all(rdoId) as any[];
  const fotosRows = db.prepare("SELECT * FROM rdo_anexos WHERE rdo_id = ? AND tipo = 'foto' ORDER BY id").all(rdoId) as any[];
  const documentosRows = db.prepare("SELECT * FROM rdo_anexos WHERE rdo_id = ? AND tipo = 'documento' ORDER BY id").all(rdoId) as any[];

  const fotos = fotosRows.map((f) => {
    const abs = path.join(env.uploadsDir, f.storage_path);
    return { file_name: f.file_name, legenda: f.legenda, dataUri: fs.existsSync(abs) ? fileToDataUri(abs) : '' };
  });

  const html = renderRdoReportHtml({
    project,
    rdo,
    signedByName,
    efetivo,
    equipamentos,
    servicos,
    comentarios,
    fotos,
    documentos: documentosRows.map((d) => ({ file_name: d.file_name })),
  });

  const browser = await getBrowser();
  const page = await browser.newPage();
  let reportBuffer: Buffer;
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const buffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', bottom: '16mm', left: '12mm', right: '12mm' } });
    reportBuffer = Buffer.from(buffer);
  } finally {
    await page.close();
  }

  if (documentosRows.length === 0) return reportBuffer;

  try {
    const mergedPdf = await PDFDocument.load(reportBuffer);
    for (const doc of documentosRows) {
      const abs = path.join(env.uploadsDir, doc.storage_path);
      if (!fs.existsSync(abs)) continue;
      try {
        const attachedBytes = fs.readFileSync(abs);
        const attachedPdf = await PDFDocument.load(attachedBytes);
        const copiedPages = await mergedPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
        for (const copiedPage of copiedPages) mergedPdf.addPage(copiedPage);
      } catch (err) {
        console.warn(`Não foi possível mesclar o documento anexado "${doc.file_name}":`, err);
      }
    }
    const mergedBytes = await mergedPdf.save();
    return Buffer.from(mergedBytes);
  } catch (err) {
    console.warn('Falha ao mesclar documentos anexados no relatório, retornando apenas o relatório principal:', err);
    return reportBuffer;
  }
}
