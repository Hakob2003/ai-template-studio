import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { checkCredits } from '../middleware/credits';
import { prisma } from '../config/db';
import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { Provider } from '@prisma/client';

const router = express.Router();
const generationQueue = new Queue('image-generation', { connection: redis as any });

// GET /api/arena/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const stats = await prisma.providerStats.findMany({
      orderBy: {
        eloRating: 'desc',
      },
    });
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/arena/match
router.post(
  '/match',
  authenticate,
  checkCredits(2), // Arena requires 2 generations
  validate([
    body('prompt').isString().notEmpty().withMessage('Prompt is required'),
    body('templateId').optional().isString(),
  ]),
  async (req, res) => {
    try {
      const { prompt, templateId } = req.body;
      const userId = (req as any).user.userId;

      // Получаем активные коннекторы юзера
      const connections = await prisma.aIConnection.findMany({
        where: { userId, isActive: true },
      });

      if (connections.length < 2) {
        return res.status(400).json({ error: 'You need at least 2 active AI connectors to play Arena' });
      }

      // Выбираем 2 случайных провайдера из доступных
      const shuffled = connections.sort(() => 0.5 - Math.random());
      const connA = shuffled[0];
      const connB = shuffled[1];

      // Если есть templateId, проверим, есть ли он и какие у него параметры
      let paramsA: any = {};
      let paramsB: any = {};
      let finalPrompt = prompt;

      if (templateId) {
        const template = await prisma.template.findUnique({
          where: { id: templateId },
          include: { compatibleProviders: true },
        });

        if (template) {
          finalPrompt = `${template.systemPrompt} ${prompt}`;
          
          const tpA = template.compatibleProviders.find(tp => tp.provider === connA.provider);
          if (tpA) paramsA = tpA.params || {};

          const tpB = template.compatibleProviders.find(tp => tp.provider === connB.provider);
          if (tpB) paramsB = tpB.params || {};
        }
      }

      // Создаём генерации
      const genA = await prisma.generation.create({
        data: {
          userId,
          templateId,
          prompt: finalPrompt,
          provider: connA.provider,
          modelId: connA.modelId || 'default',
          params: paramsA,
          status: 'PENDING',
        },
      });

      const genB = await prisma.generation.create({
        data: {
          userId,
          templateId,
          prompt: finalPrompt,
          provider: connB.provider,
          modelId: connB.modelId || 'default',
          params: paramsB,
          status: 'PENDING',
        },
      });

      // Создаём ArenaMatch
      const match = await prisma.arenaMatch.create({
        data: {
          userId,
          templateId,
          prompt: finalPrompt,
          modelA: connA.provider,
          modelB: connB.provider,
          generationAId: genA.id,
          generationBId: genB.id,
        },
      });

      // Отправляем в очередь
      await generationQueue.add('generate', { generationId: genA.id });
      await generationQueue.add('generate', { generationId: genB.id });

      // Списываем кредиты (2)
      await prisma.subscription.update({
        where: { userId },
        data: { usedCredits: { increment: 2 } },
      });

      // Возвращаем данные без указания имён моделей
      res.status(201).json({
        matchId: match.id,
        generationAId: genA.id,
        generationBId: genB.id,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Эло рейтинг K-фактор
const K = 32;
function getExpectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// POST /api/arena/match/:id/vote
router.post(
  '/match/:id/vote',
  authenticate,
  validate([
    body('vote').isIn(['A', 'B', 'TIE', 'BOTH_BAD']),
  ]),
  async (req, res) => {
    try {
      const matchId = req.params.id;
      const { vote } = req.body;
      const userId = (req as any).user.userId;

      const match = await prisma.arenaMatch.findUnique({
        where: { id: matchId },
      });

      if (!match) return res.status(404).json({ error: 'Match not found' });
      if (match.userId !== userId) return res.status(403).json({ error: 'Access denied' });
      if (match.winner) return res.status(400).json({ error: 'Already voted' });

      // Обновляем матч
      await prisma.arenaMatch.update({
        where: { id: matchId },
        data: { winner: vote },
      });

      // Обновляем статистику (создаём если нет)
      let statA = await prisma.providerStats.findUnique({ where: { provider: match.modelA } });
      if (!statA) {
        statA = await prisma.providerStats.create({ data: { provider: match.modelA } });
      }
      
      let statB = await prisma.providerStats.findUnique({ where: { provider: match.modelB } });
      if (!statB) {
        statB = await prisma.providerStats.create({ data: { provider: match.modelB } });
      }

      // Пересчёт ELO
      const expectedA = getExpectedScore(statA.eloRating, statB.eloRating);
      const expectedB = getExpectedScore(statB.eloRating, statA.eloRating);

      let scoreA = 0.5;
      let scoreB = 0.5;
      let updateA: any = { ties: { increment: 1 }, matchesPlayed: { increment: 1 } };
      let updateB: any = { ties: { increment: 1 }, matchesPlayed: { increment: 1 } };

      if (vote === 'A') {
        scoreA = 1; scoreB = 0;
        updateA = { wins: { increment: 1 }, matchesPlayed: { increment: 1 } };
        updateB = { losses: { increment: 1 }, matchesPlayed: { increment: 1 } };
      } else if (vote === 'B') {
        scoreA = 0; scoreB = 1;
        updateA = { losses: { increment: 1 }, matchesPlayed: { increment: 1 } };
        updateB = { wins: { increment: 1 }, matchesPlayed: { increment: 1 } };
      } else if (vote === 'BOTH_BAD') {
        scoreA = 0; scoreB = 0;
        updateA = { losses: { increment: 1 }, matchesPlayed: { increment: 1 } };
        updateB = { losses: { increment: 1 }, matchesPlayed: { increment: 1 } };
      }

      const newRatingA = Math.round(statA.eloRating + K * (scoreA - expectedA));
      const newRatingB = Math.round(statB.eloRating + K * (scoreB - expectedB));

      updateA.eloRating = newRatingA;
      updateB.eloRating = newRatingB;

      await prisma.providerStats.update({ where: { provider: match.modelA }, data: updateA });
      await prisma.providerStats.update({ where: { provider: match.modelB }, data: updateB });

      // Возвращаем результаты и кто есть кто
      res.json({
        modelA: match.modelA,
        modelB: match.modelB,
        newRatingA,
        newRatingB
      });

    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
