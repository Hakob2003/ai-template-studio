import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';

const router = Router();

router.use(authenticate);

// Get user profile
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      include: {
        subscription: true,
        aiConnections: {
          select: {
            id: true,
            provider: true,
            modelId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
      connectors: user.aiConnections,
      remainingCredits: user.subscription 
        ? user.subscription.credits - user.subscription.usedCredits 
        : 0,
    });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/', async (req: AuthRequest, res, next) => {
  try {
    const { name } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        name: name || undefined,
      },
      include: {
        subscription: true,
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
