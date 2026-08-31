import multer from 'multer';

const ALLOWED_FOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOCUMENTO_MIME = ['application/pdf'];

// multer's fileFilter reads req.body.tipo while the multipart stream is still
// parsing, so the 'tipo' field must be appended BEFORE the file fields on the
// client for it to be visible here.
export const uploadAnexos = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 20 },
  fileFilter: (req, file, cb) => {
    const tipo = req.body?.tipo === 'documento' ? 'documento' : 'foto';
    const allowed = tipo === 'documento' ? ALLOWED_DOCUMENTO_MIME : ALLOWED_FOTO_MIME;
    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error(
          tipo === 'documento' ? 'A aplicação só aceita documentos no formato PDF.' : `Tipo de arquivo não permitido: ${file.mimetype}`
        )
      );
    }
    cb(null, true);
  },
});

export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_FOTO_MIME.includes(file.mimetype)) {
      return cb(new Error(`Tipo de arquivo não permitido: ${file.mimetype}`));
    }
    cb(null, true);
  },
});
