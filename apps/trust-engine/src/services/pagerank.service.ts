import { getTrustTier } from '@trust-network/shared-types';
import {
  createProducer,
  publishEvent,
  KAFKA_TOPICS,
} from '@trust-network/kafka-client';
import { getSession } from '../utils/neo4j';
import { setTrustScore } from '../utils/redis';
import { logger } from '../utils/logger';

const DAMPING_FACTOR = 0.85;
const MAX_ITERATIONS = 20;
const CONVERGENCE_THRESHOLD = 0.0001;
const DECAY_LAMBDA = 0.001;

export async function runPageRank(): Promise<void> {
  const session = getSession();
  const producer = await createProducer();

  try {
    logger.info('PageRank computation started');
    const startTime = Date.now();

    await session.run(`
      MATCH ()-[r:TRUSTS]->()
      WITH r,
           duration.inSeconds(r.createdAt, datetime()).seconds / 3600.0 AS hoursAgo
      SET r.effectiveWeight = r.weight * exp(-${DECAY_LAMBDA} * hoursAgo)
    `);

    const usersResult = await session.run(`
      MATCH (u:User)
      RETURN u.id AS id, u.trustScore AS score
    `);

    if (usersResult.records.length === 0) {
      logger.info('No users in graph yet. Skipping PageRank');
      return;
    }

    let iteration = 0;
    let maxDelta = Number.POSITIVE_INFINITY;

    while (iteration < MAX_ITERATIONS && maxDelta > CONVERGENCE_THRESHOLD) {
      const result = await session.run(`
        MATCH (u:User)
        OPTIONAL MATCH (v:User)-[r:TRUSTS]->(u)
        WITH u,
             collect({
               score: coalesce(v.trustScore, 50.0),
               weight: coalesce(r.effectiveWeight, r.weight, 1.0),
               outDeg: coalesce(size((v)-[:TRUSTS]->()), 1)
             }) AS inboundList
        WITH u,
             ${1 - DAMPING_FACTOR} + ${DAMPING_FACTOR} *
             reduce(s = 0.0, x IN inboundList |
               s + (x.score * x.weight / x.outDeg)
             ) AS newScore
        WITH u,
             CASE
               WHEN newScore < 0 THEN 0.0
               WHEN newScore > 100 THEN 100.0
               ELSE newScore
             END AS clampedScore,
             abs(newScore - coalesce(u.trustScore, 50.0)) AS delta
        SET u.trustScore = clampedScore
        RETURN max(delta) AS maxDelta
      `);

      const rawDelta = result.records[0]?.get('maxDelta');
      maxDelta = typeof rawDelta === 'number' ? rawDelta : Number(rawDelta?.toString() || '0');
      iteration += 1;
    }

    logger.info('PageRank converged', { iterations: iteration, maxDelta });

    const finalScores = await session.run(`
      MATCH (u:User)
      RETURN u.id AS id, u.trustScore AS score, u.previousScore AS prevScore
    `);

    for (const record of finalScores.records) {
      const userId = record.get('id') as string;
      const scoreVal = record.get('score');
      const prevVal = record.get('prevScore');
      const score = typeof scoreVal === 'number' ? scoreVal : Number(scoreVal?.toString() || '50');
      const prevScore =
        typeof prevVal === 'number' ? prevVal : Number(prevVal?.toString() || '50');
      const tier = getTrustTier(score);
      const prevTier = getTrustTier(prevScore);

      await setTrustScore(userId, score, tier);

      if (Math.abs(score - prevScore) > 0.5) {
        await publishEvent(
          producer,
          KAFKA_TOPICS.TRUST_UPDATED,
          {
            userId,
            oldScore: prevScore,
            newScore: score,
            oldTier: prevTier,
            newTier: tier,
            reason: 'pagerank_computation',
            timestamp: new Date().toISOString(),
          },
          userId
        );
      }
    }

    await session.run(`
      MATCH (u:User)
      SET u.previousScore = u.trustScore
    `);

    const elapsed = Date.now() - startTime;
    logger.info('PageRank complete', {
      usersProcessed: finalScores.records.length,
      elapsedMs: elapsed,
    });
  } catch (error) {
    logger.error('PageRank error', { error });
    throw error;
  } finally {
    await session.close();
    await producer.disconnect();
  }
}

export async function upsertUserNode(
  userId: string,
  did: string,
  initialScore = 50
): Promise<void> {
  const session = getSession();

  try {
    await session.run(
      `
      MERGE (u:User { id: $userId })
      ON CREATE SET
        u.did = $did,
        u.trustScore = $initialScore,
        u.previousScore = $initialScore,
        u.createdAt = datetime()
      ON MATCH SET
        u.updatedAt = datetime()
    `,
      { userId, did, initialScore }
    );
  } finally {
    await session.close();
  }
}

export async function addTrustEdge(
  actorId: string,
  targetId: string,
  weight: number
): Promise<void> {
  const session = getSession();

  try {
    await session.run(
      `
      MATCH (a:User { id: $actorId }), (b:User { id: $targetId })
      MERGE (a)-[r:TRUSTS]->(b)
      ON CREATE SET
        r.weight = $weight,
        r.effectiveWeight = $weight,
        r.createdAt = datetime(),
        r.count = 1
      ON MATCH SET
        r.weight = r.weight + ($weight * 0.5),
        r.count = r.count + 1,
        r.updatedAt = datetime()
    `,
      { actorId, targetId, weight }
    );
  } finally {
    await session.close();
  }
}

export async function removeTrustEdge(actorId: string, targetId: string): Promise<void> {
  const session = getSession();

  try {
    await session.run(
      `
      MATCH (a:User { id: $actorId })-[r:TRUSTS]->(b:User { id: $targetId })
      DELETE r
    `,
      { actorId, targetId }
    );
  } finally {
    await session.close();
  }
}

export async function detectSybilClusters(): Promise<string[][]> {
  const session = getSession();

  try {
    const result = await session.run(`
      MATCH (a:User)-[:TRUSTS]->(b:User)-[:TRUSTS]->(a)
      WHERE a.trustScore < 35 AND b.trustScore < 35
        AND a.id <> b.id
      RETURN collect(DISTINCT a.id) + collect(DISTINCT b.id) AS cluster
      LIMIT 50
    `);

    return result.records
      .map((record) => record.get('cluster'))
      .filter((cluster): cluster is string[] => Array.isArray(cluster));
  } finally {
    await session.close();
  }
}
