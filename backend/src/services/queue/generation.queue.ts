import { Queue } from 'bullmq';
import { redis } from '../../config/redis';

export const generationQueue = new Queue('image-generation', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // хранить выполненные 1 час
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // хранить проваленные 24 часа
    },
  },
});

// Очистка старых задач (можно запускать по расписанию)
export async function cleanOldJobs() {
  await generationQueue.clean(3600 * 1000, 10000, 'completed');
  await generationQueue.clean(86400 * 1000, 10000, 'failed');
}