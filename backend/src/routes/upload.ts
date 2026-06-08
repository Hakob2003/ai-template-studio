import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload } from '../middleware/upload';
import { prisma } from '../config/db';
import { uploadToStorage } from '../utils/storage';
import sharp from 'sharp';
import fs from 'fs/promises';

const router = Router();

router.use(authenticate);

router.post('/', upload.single('image'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Оптимизация изображения
    const optimized = await sharp(req.file.path)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Загружаем в объектное хранилище
    const url = await uploadToStorage(
      optimized,
      `${req.userId}/${req.file.filename.replace(/\.[^.]+$/, '.jpg')}`,
      'image/jpeg'
    );

    // Удаляем временный файл
    await fs.unlink(req.file.path).catch(() => {});

    res.json({ url, size: optimized.length });
  } catch (error) {
    // Удаляем файл при ошибке
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
});

export default router;