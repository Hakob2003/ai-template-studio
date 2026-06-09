import { Router } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authLimiter, loginLimiter } from '../middleware/rateLimit';
import * as authService from '../services/auth.service';
import { prisma } from '../config/db';
import { getClientIp } from '../utils/helpers';

const router = Router();

// Relaxed rate limit for all auth routes (refresh, me, logout, etc.)
router.use(authLimiter);

// Test endpoint for debugging
router.post('/test', (req, res) => {
  console.log('Test endpoint hit');
  console.log('Body:', req.body);
  console.log('Body type:', typeof req.body);
  res.json({ received: req.body, success: true });
});

// Register
router.post(
  '/register',
  loginLimiter,
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').optional().trim().isLength({ max: 100 }),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await authService.registerUser(
        req.body.email,
        req.body.password,
        req.body.name
      );

      await prisma.auditLog.create({
        data: {
          action: 'USER_REGISTER',
          details: { email: req.body.email },
          ip: getClientIp(req),
        },
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Login
router.post(
  '/login',
  loginLimiter,
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await authService.loginUser(req.body.email, req.body.password);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/auth',
      });

      await prisma.auditLog.create({
        data: {
          userId: result.user.id,
          action: 'USER_LOGIN',
          ip: getClientIp(req),
        },
      });

      res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Refresh token
router.post('/refresh', async (req: AuthRequest, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    res.json({
      accessToken: result.accessToken,
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    res.clearCookie('refreshToken', { path: '/api/auth' });

    if (req.userId) {
      await prisma.auditLog.create({
        data: {
          userId: req.userId,
          action: 'USER_LOGOUT',
          ip: getClientIp(req),
        },
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// Verify email
router.get('/verify/:token', async (req: AuthRequest, res, next) => {
  try {
    await authService.verifyEmail(req.params.token);
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

// Forgot password
router.post(
  '/forgot-password',
  validate([body('email').isEmail()]),
  async (req: AuthRequest, res, next) => {
    try {
      await authService.forgotPassword(req.body.email);
      res.json({ message: 'If the email exists, a reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  }
);

// Reset password
router.post(
  '/reset-password',
  validate([
    body('token').notEmpty(),
    body('password').isLength({ min: 8 }),
  ]),
  async (req: AuthRequest, res, next) => {
    try {
      await authService.resetPassword(req.body.token, req.body.password);
      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        subscription: {
          select: {
            tier: true,
            credits: true,
            usedCredits: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

export default router;
