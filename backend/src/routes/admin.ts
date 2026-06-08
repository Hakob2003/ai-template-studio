import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Add credits to user (admin only)
router.post('/credits/add', async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
    });

    if (user?.role !== 'ADMIN') {
      throw new AppError('Access denied', 403);
    }

    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      throw new AppError('Invalid userId or amount', 400);
    }

    const subscription = await prisma.subscription.update({
      where: { userId },
      data: {
        credits: { increment: amount },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.userId,
        action: 'ADMIN_ADD_CREDITS',
        details: { targetUserId: userId, amount },
      },
    });

    res.json({
      message: `Added ${amount} credits to user ${userId}`,
      subscription,
    });
  } catch (error) {
    next(error);
  }
});

// Reset subscription credits for testing
router.post('/subscription/reset-for-testing', async (req: AuthRequest, res, next) => {
  try {
    const subscription = await prisma.subscription.update({
      where: { userId: req.userId! },
      data: {
        credits: 1000,
        usedCredits: 0,
      },
    });

    res.json({
      message: 'Subscription reset for testing. You now have 1000 credits.',
      subscription,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
