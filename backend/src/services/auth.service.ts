import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-secret';

export async function registerUser(email: string, password: string, name?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('User already exists', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      subscription: {
        create: {
          tier: 'FREE',
          credits: 20,
        },
      },
    },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { accessToken, refreshToken } = generateTokens(user.id, user.role);
  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string; role: string };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    
    if (!user) {
      throw new Error();
    }

    const tokens = generateTokens(user.id, user.role);
    return tokens;
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({ where: { verifyToken: token } });
  if (!user) {
    throw new AppError('Invalid verification token', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null },
  });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Don't reveal if user exists

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken: token,
      resetTokenExp: new Date(Date.now() + 3600000),
    },
  });

  // Here you would send an email...
}

export async function resetPassword(token: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExp: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExp: null,
    },
  });
}

function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ userId, role }, REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function sanitizeUser(user: any) {
  const { passwordHash, verifyToken, resetToken, resetTokenExp, ...rest } = user;
  return rest;
}
