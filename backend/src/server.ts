import { httpServer } from './app';
import { prisma } from './config/db';
import worker from './services/queue/worker';

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    // Start job queue worker
    console.log('Starting generation worker...');
    await worker.waitUntilReady();
    console.log('Generation worker ready');

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down...');
  try {
    await worker.close();
    await prisma.$disconnect();
  } catch (e) {
    console.error('Error during shutdown:', e);
  }
  process.exit(0);
});

main();
