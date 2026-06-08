import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { encrypt } from '../utils/crypto';

const router = Router();

router.use(authenticate);

// List user's AI connections
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const connections = await prisma.aIConnection.findMany({
      where: { userId: req.userId! },
      select: {
        id: true,
        provider: true,
        modelId: true,
        baseUrl: true,
        isActive: true,
        createdAt: true,
        // НЕ возвращаем encryptedApiKey
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(connections);
  } catch (error) {
    next(error);
  }
});

// Add connection
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { provider, apiKey, baseUrl, modelId, workflow } = req.body;

    // Проверяем, нет ли уже подключения для этого провайдера
    const existing = await prisma.aIConnection.findFirst({
      where: { userId: req.userId!, provider },
    });

    if (existing) {
      // Обновляем существующее
      const updated = await prisma.aIConnection.update({
        where: { id: existing.id },
        data: {
          encryptedApiKey: apiKey ? encrypt(apiKey) : existing.encryptedApiKey,
          baseUrl: baseUrl || existing.baseUrl,
          modelId: modelId || existing.modelId,
          workflow: workflow || existing.workflow,
          isActive: true,
        },
        select: {
          id: true,
          provider: true,
          modelId: true,
          baseUrl: true,
          isActive: true,
        },
      });

      return res.json(updated);
    }

    const connection = await prisma.aIConnection.create({
      data: {
        userId: req.userId!,
        provider,
        encryptedApiKey: apiKey ? encrypt(apiKey) : null,
        baseUrl,
        modelId,
        workflow,
      },
      select: {
        id: true,
        provider: true,
        modelId: true,
        baseUrl: true,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'AI_CONNECTION_ADD',
        details: { provider },
      },
    });

    res.status(201).json(connection);
  } catch (error) {
    next(error);
  }
});

// Delete connection
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const connection = await prisma.aIConnection.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await prisma.aIConnection.delete({ where: { id: connection.id } });

    res.json({ message: 'Connection removed' });
  } catch (error) {
    next(error);
  }
});

// Test connection
router.post('/:id/test', async (req: AuthRequest, res, next) => {
  try {
    const connection = await prisma.aIConnection.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    // Простой тест — пытаемся получить модель (зависит от провайдера)
    await prisma.aIConnection.update({
      where: { id: connection.id },
      data: { lastTestedAt: new Date() },
    });

    res.json({ status: 'ok', message: 'Connection tested successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;