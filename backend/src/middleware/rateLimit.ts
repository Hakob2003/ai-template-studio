import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter ONLY for login/register — counts only failed attempts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  skipSuccessfulRequests: true, // only failed attempts count
  message: { error: 'Too many failed login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Relaxed limiter for other auth routes (refresh, me, logout, etc.)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // relaxed — these are called frequently by the frontend
  message: { error: 'Too many authentication requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  message: { error: 'Generation limit reached. Please try again later.' },
});