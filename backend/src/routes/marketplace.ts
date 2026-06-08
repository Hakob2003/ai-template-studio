import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';

const router = Router();

// List marketplace templates
router.get('/templates', async (req, res, next) => {
  try {
    const { page = '1', category, search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limit = 20;

    const where: any = {
      isPublic: true,
      isApproved: true,
      price: { not: null },
    };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        include: {
          compatibleProviders: { select: { provider: true, modelId: true } },
          _count: { select: { purchases: true, reviews: true } },
        },
        orderBy: { downloadCount: 'desc' },
        skip: (pageNum - 1) * limit,
        take: limit,
      }),
      prisma.template.count({ where }),
    ]);

    res.json({ templates, pagination: { page: pageNum, limit, total } });
  } catch (error) {
    next(error);
  }
});

// Purchase template
router.post('/purchase/:templateId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.templateId },
    });

    if (!template || !template.price) {
      return res.status(404).json({ error: 'Template not found or not for sale' });
    }

    // Проверяем, не куплен ли уже
    const existing = await prisma.templatePurchase.findFirst({
      where: {
        templateId: template.id,
        buyerId: req.userId!,
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'You already own this template' });
    }

    const purchase = await prisma.templatePurchase.create({
      data: {
        templateId: template.id,
        buyerId: req.userId!,
        sellerId: template.createdBy || 'system',
        price: template.price,
        commission: 0.1,
      },
    });

    res.status(201).json(purchase);
  } catch (error) {
    next(error);
  }
});

// Review template
router.post('/review/:templateId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { rating, comment } = req.body;

    const existing = await prisma.templateReview.findFirst({
      where: {
        templateId: req.params.templateId,
        userId: req.userId!,
      },
    });

    let review;
    if (existing) {
      review = await prisma.templateReview.update({
        where: { id: existing.id },
        data: { rating, comment },
      });
    } else {
      review = await prisma.templateReview.create({
        data: {
          templateId: req.params.templateId,
          userId: req.userId!,
          rating,
          comment,
        },
      });
    }

    // Обновляем средний рейтинг шаблона
    const avg = await prisma.templateReview.aggregate({
      where: { templateId: req.params.templateId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.template.update({
      where: { id: req.params.templateId },
      data: {
        avgRating: avg._avg.rating || 0,
        reviewCount: avg._count.rating,
      },
    });

    res.json(review);
  } catch (error) {
    next(error);
  }
});

export default router;