import { Worker, Job } from 'bullmq';
import { redis } from '../../config/redis';
import { prisma } from '../../config/db';
import { createConnector } from '../ai-connectors';
import { analyzeImage } from '../../utils/image-analysis';
import { buildPrompt } from '../../utils/prompt-builder';
import { uploadToStorage } from '../../utils/storage';
import { io } from '../../app';
import axios from 'axios';

const worker = new Worker(
  'image-generation',
  async (job: Job) => {
    const { generationId } = job.data;

    const gen = await prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        user: { include: { aiConnections: true } },
        template: {
          include: {
            compatibleProviders: true,
          },
        },
      },
    });

    if (!gen) {
      throw new Error(`Generation ${generationId} not found`);
    }

    const startTime = Date.now();

    try {
      // Обновляем статус
      await updateProgress(generationId, 'PROCESSING', 10);

      // Находим AI подключение
      const connection = gen.user.aiConnections.find(
        c => c.provider === gen.provider && c.isActive
      );

      if (!connection) {
        throw new Error(`No active connection for provider: ${gen.provider}`);
      }

      // Создаём коннектор
      const connector = createConnector(connection);

      // Анализ входного изображения
      let finalPrompt = gen.prompt || gen.template?.systemPrompt || '';
      let finalNegative = gen.negativePrompt || gen.template?.negativePrompt || '';

      if (gen.inputImageUrl) {
        await updateProgress(generationId, 'PROCESSING', 20);

        const imageBuffer = await fetchImage(gen.inputImageUrl);
        const analysis = await analyzeImage(
          imageBuffer,
          connection.encryptedApiKey
            ? (await import('../../utils/crypto')).decrypt(connection.encryptedApiKey)
            : null
        );

        if (finalPrompt) {
          finalPrompt = buildPrompt(finalPrompt, analysis, finalNegative);
        }

        await prisma.generation.update({
          where: { id: generationId },
          data: { prompt: finalPrompt },
        });
      }

      await updateProgress(generationId, 'PROCESSING', 40);

      // Генерация изображения
      const inputImage = gen.inputImageUrl
        ? await fetchImage(gen.inputImageUrl)
        : undefined;

      const params = (gen.params as any) || {};
      const templateProvider = gen.template?.compatibleProviders.find(
        tp => tp.provider === gen.provider
      );
      const mergedParams = { ...(templateProvider?.params as any || {}), ...params };

      const resultBuffer = await connector.generate(
        finalPrompt,
        finalNegative,
        mergedParams,
        inputImage
      );

      await updateProgress(generationId, 'PROCESSING', 80);

      // Сохраняем результат
      const generatedUrl = await uploadToStorage(
        resultBuffer,
        `${gen.userId}/${generationId}.png`,
        'image/png'
      );

      const duration = Math.round((Date.now() - startTime) / 1000);

      await prisma.generation.update({
        where: { id: generationId },
        data: {
          generatedUrl,
          status: 'COMPLETED',
          progress: 100,
          duration,
        },
      });

      // Обновляем счётчик скачиваний шаблона
      if (gen.templateId) {
        await prisma.template.update({
          where: { id: gen.templateId },
          data: { downloadCount: { increment: 1 } },
        });
      }

      // Отправляем уведомление через WebSocket
      io.to(`generation:${generationId}`).emit('generation:complete', {
        generationId,
        generatedUrl,
        duration,
      });

      console.log(`Generation ${generationId} completed in ${duration}s`);
    } catch (error: any) {
      const attemptsMade = job.attemptsMade;
      const maxAttempts = job.opts.attempts || 5;

      console.error(
        `Generation ${generationId} failed (attempt ${attemptsMade + 1}/${maxAttempts}):`,
        error.message
      );

      if (attemptsMade >= maxAttempts - 1) {
        // Последняя попытка — помечаем как FAILED
        await prisma.generation.update({
          where: { id: generationId },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            progress: 0,
          },
        });

        io.to(`generation:${generationId}`).emit('generation:failed', {
          generationId,
          error: error.message,
        });
      }

      throw error; // Пробрасываем для retry
    }
  },
  {
    connection: redis as any,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

async function updateProgress(
  generationId: string,
  status: string,
  progress: number
) {
  await prisma.generation.update({
    where: { id: generationId },
    data: { status: status as any, progress },
  });

  io.to(`generation:${generationId}`).emit('generation:progress', {
    generationId,
    status,
    progress,
  });
}

async function fetchImage(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
}

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error.message);
});

export default worker;