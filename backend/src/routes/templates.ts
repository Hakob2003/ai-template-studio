import { Router } from 'express';
import { authenticate, requireAdmin, optionalAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';

const router = Router();

// List templates (with filtering, sorting, pagination)
router.get('/', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const {
      category,
      search,
      provider,
      page = '1',
      limit = '20',
      sort = 'popular',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      isPublic: true,
      isApproved: true,
    };

    if (category) {
      where.category = { in: (category as string).split(',') };
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (provider) {
      where.compatibleProviders = {
        some: {
          provider: provider as any,
        },
      };
    }

    const orderBy: any = {};
    switch (sort) {
      case 'newest':
        orderBy.createdAt = 'desc';
        break;
      case 'popular':
        orderBy.downloadCount = 'desc';
        break;
      case 'rating':
        orderBy.avgRating = 'desc';
        break;
      default:
        orderBy.downloadCount = 'desc';
    }

    const [templates, total] = await Promise.all([
      prisma.template.findMany({
        where,
        include: {
          compatibleProviders: {
            select: { provider: true, modelId: true },
          },
          _count: {
            select: { favorites: true, purchases: true },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.template.count({ where }),
    ]);

    // Если пользователь авторизован, получаем его избранное
    let favoriteIds: string[] = [];
    if (req.userId) {
      const favs = await prisma.templateFav.findMany({
        where: { userId: req.userId },
        select: { templateId: true },
      });
      favoriteIds = favs.map(f => f.templateId);
    }

    const enriched = templates.map(t => ({
      ...t,
      isFavorite: favoriteIds.includes(t.id),
    }));

    res.json({
      templates: enriched,
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

// Get single template
router.get('/:id', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const template = await prisma.template.findUnique({
      where: { id: req.params.id },
      include: {
        compatibleProviders: true,
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        _count: {
          select: { favorites: true, purchases: true, generations: true },
        },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    let isFavorite = false;
    if (req.userId) {
      const fav = await prisma.templateFav.findUnique({
        where: {
          userId_templateId: {
            userId: req.userId,
            templateId: template.id,
          },
        },
      });
      isFavorite = !!fav;
    }

    res.json({ ...template, isFavorite });
  } catch (error) {
    next(error);
  }
});

// Create template (admin only)
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { compatibleProviders, ...templateData } = req.body;

    const template = await prisma.template.create({
      data: {
        ...templateData,
        createdBy: req.userId,
        isApproved: true,
        compatibleProviders: compatibleProviders
          ? {
              create: compatibleProviders.map((p: any) => ({
                provider: p.provider,
                modelId: p.modelId,
                params: p.params,
                priority: p.priority || 0,
              })),
            }
          : undefined,
      },
      include: { compatibleProviders: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'TEMPLATE_CREATE',
        details: { templateId: template.id, name: template.name },
      },
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

// Update template
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    const { compatibleProviders, ...templateData } = req.body;

    // Удаляем старые провайдеры и создаём новые
    if (compatibleProviders) {
      await prisma.templateProvider.deleteMany({
        where: { templateId: req.params.id },
      });
    }

    const template = await prisma.template.update({
      where: { id: req.params.id },
      data: {
        ...templateData,
        compatibleProviders: compatibleProviders
          ? {
              create: compatibleProviders.map((p: any) => ({
                provider: p.provider,
                modelId: p.modelId,
                params: p.params,
                priority: p.priority || 0,
              })),
            }
          : undefined,
      },
      include: { compatibleProviders: true },
    });

    res.json(template);
  } catch (error) {
    next(error);
  }
});

// Delete template
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res, next) => {
  try {
    await prisma.template.delete({ where: { id: req.params.id } });

    await prisma.auditLog.create({
      data: {
        userId: req.userId!,
        action: 'TEMPLATE_DELETE',
        details: { templateId: req.params.id },
      },
    });

    res.json({ message: 'Template deleted' });
  } catch (error) {
    next(error);
  }
});

// Toggle favorite
router.post('/:id/favorite', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const existing = await prisma.templateFav.findUnique({
      where: {
        userId_templateId: {
          userId: req.userId!,
          templateId: req.params.id,
        },
      },
    });

    if (existing) {
      await prisma.templateFav.delete({ where: { id: existing.id } });
      res.json({ isFavorite: false });
    } else {
      await prisma.templateFav.create({
        data: {
          userId: req.userId!,
          templateId: req.params.id,
        },
      });
      res.json({ isFavorite: true });
    }
  } catch (error) {
    next(error);
  }
});

export default router;