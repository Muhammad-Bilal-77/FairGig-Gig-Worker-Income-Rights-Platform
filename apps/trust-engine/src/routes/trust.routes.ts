import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getTrustTier } from '@trust-network/shared-types';
import { getSession } from '../utils/neo4j';
import { getTrustScore, getTrustTierCached } from '../utils/redis';
import { upsertUserNode, addTrustEdge, runPageRank } from '../services/pagerank.service';
import { logger } from '../utils/logger';

const upsertSchema = z.object({
  userId: z.string().uuid(),
  did: z.string().min(5),
  initialScore: z.number().min(0).max(100).optional(),
});

const edgeSchema = z.object({
  actorId: z.string().uuid(),
  targetId: z.string().uuid(),
  weight: z.number(),
});

export async function trustRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/trust/:userId', async (request, reply) => {
    const params = request.params as { userId: string };
    const { userId } = params;

    try {
      const cached = await getTrustScore(userId);

      if (cached !== null) {
        const tier = (await getTrustTierCached(userId)) || getTrustTier(cached);
        return reply.send({
          success: true,
          data: { userId, score: cached, tier, source: 'cache' },
        });
      }

      const session = getSession();
      try {
        const result = await session.run(
          'MATCH (u:User { id: $userId }) RETURN u.trustScore AS score',
          { userId }
        );

        if (result.records.length === 0) {
          return reply.status(404).send({
            success: false,
            error: 'User not in trust graph',
          });
        }

        const raw = result.records[0].get('score');
        const score = typeof raw === 'number' ? raw : Number(raw?.toString() || '0');
        const tier = getTrustTier(score);

        return reply.send({
          success: true,
          data: { userId, score, tier, source: 'graph' },
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      logger.error('Trust score fetch error', { error, userId });
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  fastify.get('/trust/:userId/graph', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const session = getSession();

    try {
      const result = await session.run(
        `
        MATCH (u:User { id: $userId })
        OPTIONAL MATCH (u)-[r:TRUSTS]->(out:User)
        OPTIONAL MATCH (inn:User)-[ri:TRUSTS]->(u)
        RETURN
          u.trustScore AS myScore,
          collect(DISTINCT {
            id: out.id,
            score: out.trustScore,
            weight: r.effectiveWeight
          }) AS trusting,
          collect(DISTINCT {
            id: inn.id,
            score: inn.trustScore,
            weight: ri.effectiveWeight
          }) AS trustedBy
      `,
        { userId }
      );

      if (result.records.length === 0) {
        return reply.status(404).send({ success: false, error: 'Not found in graph' });
      }

      const record = result.records[0];
      return reply.send({
        success: true,
        data: {
          userId,
          myScore: record.get('myScore'),
          trusting: record.get('trusting'),
          trustedBy: record.get('trustedBy'),
        },
      });
    } finally {
      await session.close();
    }
  });

  fastify.post('/trust/upsert-user', async (request, reply) => {
    const parsed = upsertSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.flatten(),
      });
    }

    const { userId, did, initialScore } = parsed.data;

    try {
      await upsertUserNode(userId, did, initialScore || 50);
      return reply.send({
        success: true,
        data: { message: 'User upserted in trust graph' },
      });
    } catch (error) {
      logger.error('Upsert user failed', { error, userId });
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  fastify.post('/trust/edge', async (request, reply) => {
    const parsed = edgeSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: parsed.error.flatten(),
      });
    }

    const { actorId, targetId, weight } = parsed.data;

    try {
      await addTrustEdge(actorId, targetId, weight);
      return reply.send({
        success: true,
        data: { message: 'Trust edge added' },
      });
    } catch (error) {
      logger.error('Add edge failed', { error, actorId, targetId });
      return reply.status(500).send({ success: false, error: 'Internal server error' });
    }
  });

  fastify.post('/trust/compute', async (_request, reply) => {
    try {
      await runPageRank();
      return reply.send({
        success: true,
        data: { message: 'PageRank computation triggered' },
      });
    } catch (error) {
      logger.error('Manual computation failed', { error });
      return reply.status(500).send({ success: false, error: 'Computation failed' });
    }
  });

  fastify.get('/trust/leaderboard', async (_request, reply) => {
    const session = getSession();

    try {
      const result = await session.run(`
        MATCH (u:User)
        RETURN u.id AS id, u.trustScore AS score
        ORDER BY u.trustScore DESC
        LIMIT 20
      `);

      const leaderboard = result.records.map((record) => {
        const rawScore = record.get('score');
        const score =
          typeof rawScore === 'number' ? rawScore : Number(rawScore?.toString() || '0');

        return {
          userId: record.get('id') as string,
          score,
          tier: getTrustTier(score),
        };
      });

      return reply.send({ success: true, data: leaderboard });
    } finally {
      await session.close();
    }
  });
}
