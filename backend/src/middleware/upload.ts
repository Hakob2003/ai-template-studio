import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Request } from 'express';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req: Request, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueName}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and AVIF are allowed.'));
    return;
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});