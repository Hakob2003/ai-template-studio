import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import templateRoutes from './routes/templates';
import generationRoutes from './routes/generations';
import adminRoutes from './routes/admin';
import connectorRoutes from './routes/connectors';
import profileRoutes from './routes/profile';
import uploadRoutes from './routes/upload';
import marketplaceRoutes from './routes/marketplace';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';

const app = express();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Debug middleware for POST requests
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    console.log(`[${req.method}] ${req.path} - Content-Type: ${req.headers['content-type']}`);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use('/api/', apiLimiter);

// Static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/generations', generationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// HTTP + WebSocket сервер
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  pingTimeout: 60000,
});

// WebSocket аутентификация
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const payload = jwt.verify(token as string, process.env.JWT_SECRET!) as { userId: string; role: string };
    (socket as any).userId = payload.userId;
    (socket as any).role = payload.role;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${(socket as any).userId}`);

  socket.on('subscribe:generation', (generationId: string) => {
    socket.join(`generation:${generationId}`);
    console.log(`User ${(socket as any).userId} subscribed to generation ${generationId}`);
  });

  socket.on('unsubscribe:generation', (generationId: string) => {
    socket.leave(`generation:${generationId}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${(socket as any).userId}`);
  });
});

export { app, httpServer, io };
