import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { checkCredits, deductCredit } from '../middleware/credits';
import { generationLimiter } from '../middleware/rateLimit';
import { prisma } from '../config/db';
import { generationQueue } from '../services/queue/generation.queue';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);
router.use(generationLimiter);

// Create generation task
router.post('/', checkCredits, async (req: AuthRequest, res, next) => {
  try {
    const { templateId, provider, modelId, inputImageUrl, inputGenerationId, params } = req.body;

    // Removed AIConnection check - using global API keys

    // Получаем шаблон если указан
    let template = null;
    let prompt = '';
    let negativePrompt = '';

    if (templateId) {
      template = await prisma.template.findUnique({
        where: { id: templateId },
        include: {
          compatibleProviders: {
            where: { provider },
          },
        },
      });

      if (!template) {
        throw new AppError('Template not found', 404);
      }

      prompt = template.systemPrompt;
      negativePrompt = template.negativePrompt || '';
    }

    // Если используем результат предыдущей генерации
    let finalInputImageUrl = inputImageUrl;
    if (inputGenerationId) {
      const prevGeneration = await prisma.generation.findUnique({
        where: { id: inputGenerationId },
      });

      if (!prevGeneration || prevGeneration.userId !== req.userId) {
        throw new AppError('Cannot access this generation', 403);
      }

      if (!prevGeneration.generatedUrl) {
        throw new AppError('Previous generation has no output image', 400);
      }

      finalInputImageUrl = prevGeneration.generatedUrl;
    }

    // Списываем кредит
    await deductCredit(req.userId!);

    // Создаём запись генерации
    const generation = await prisma.generation.create({
      data: {
        userId: req.userId!,
        templateId: templateId || null,
        provider,
        modelId: modelId || 'default',
        inputImageUrl: finalInputImageUrl || null,
        prompt: prompt || '',
        negativePrompt: negativePrompt || '',
        params: params || {},
        status: 'PENDING',
      },
    });

    // Добавляем в очередь
    await generationQueue.add(
      'generate',
      { generationId: generation.id },
      {
        jobId: generation.id,
        removeOnComplete: 100,
        removeOnFail: 500,
      }
    );

    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'GENERATION_CREATE',
        details: {
          generationId: generation.id,
          templateId,
          provider,
          modelId,
        },
      },
    });

    res.status(201).json(generation);
  } catch (error) {
    next(error);
  }
});

// Get generation status
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const generation = await prisma.generation.findUnique({
      where: { id: req.params.id },
    });

    if (!generation) {
      throw new AppError('Generation not found', 404);
    }

    if (generation.userId !== req.userId) {
      throw new AppError('Access denied', 403);
    }

    res.json(generation);
  } catch (error) {
    next(error);
  }
});

// List user's generations
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, parseInt(limit as string));
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId: req.userId! };
    if (status) {
      where.status = status;
    }

    const [generations, total] = await Promise.all([
      prisma.generation.findMany({
        where,
        include: {
          template: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.generation.count({ where }),
    ]);

    res.json({
      generations,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Cancel generation
router.post('/:id/cancel', async (req: AuthRequest, res, next) => {
  try {
    const generation = await prisma.generation.findUnique({
      where: { id: req.params.id },
    });

    if (!generation || generation.userId !== req.userId) {
      throw new AppError('Generation not found', 404);
    }

    if (generation.status !== 'PENDING' && generation.status !== 'PROCESSING') {
      throw new AppError('Generation cannot be cancelled', 400);
    }

    // Удаляем из очереди
    await generationQueue.remove(req.params.id);

    await prisma.generation.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });

    // Возвращаем кредит
    await prisma.subscription.update({
      where: { userId: req.userId! },
      data: { usedCredits: { decrement: 1 } },
    });

    res.json({ message: 'Generation cancelled' });
  } catch (error) {
    next(error);
  }
});

export default router;
