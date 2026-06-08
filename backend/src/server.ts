import { httpServer } from './app';
import { prisma } from './config/db';

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    // Connect to database first
    await prisma.$connect();
    console.log('Database connected');

    // Start listening IMMEDIATELY so Render sees the port binding
    // (Render has a 60-second timeout for port binding on free tier)
    httpServer.listen(PORT as number, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
    });

    // Start job queue worker in background (non-blocking)
    // This way, even if Redis is slow, the server is already up
    try {
      const workerModule = await import('./services/queue/worker');
      const worker = workerModule.default;
      await Promise.race([
        worker.waitUntilReady(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Worker start timeout')), 15000)),
      ]);
      console.log('Generation worker ready');
    } catch (workerError) {
      console.warn('Worker startup issue (non-fatal):', (workerError as Error).message);
      console.warn('Generation queue will retry when Redis is available');
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error during shutdown:', e);
  }
  process.exit(0);
});

main();

