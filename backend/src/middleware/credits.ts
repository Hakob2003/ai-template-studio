import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../config/db';

export async function checkCredits(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Админы безлимитны
  if (req.role === 'ADMIN') {
    return next();
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.userId },
  });

  if (!subscription) {
    return res.status(402).json({
      error: 'No subscription found',
      code: 'NO_SUBSCRIPTION',
    });
  }

  const remainingCredits = subscription.credits - subscription.usedCredits;
  if (remainingCredits <= 0) {
    return res.status(402).json({
      error: 'Insufficient credits. Please upgrade your plan.',
      code: 'INSUFFICIENT_CREDITS',
      remaining: 0,
      tier: subscription.tier,
    });
  }

  (req as any).subscription = subscription;
  next();
}

export async function deductCredit(userId: string): Promise<void> {
  await prisma.subscription.update({
    where: { userId },
    data: {
      usedCredits: { increment: 1 },
    },
  });
}