import { Queue, Worker, type Job } from 'bullmq';
import {
  createProducer,
  publishEvent,
  KAFKA_TOPICS,
} from '@trust-network/kafka-client';
import { getRedis } from '../utils/redis';
import { runPageRank, detectSybilClusters } from './pagerank.service';
import { logger } from '../utils/logger';

const QUEUE_NAME = 'trust-computation';

let queue: Queue | null = null;
let worker: Worker | null = null;

export function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedis(),
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 20,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    });
  }

  return queue;
}

export async function startScheduler(): Promise<void> {
  const q = getQueue();

  await q.add(
    'pagerank',
    { type: 'pagerank' },
    {
      repeat: { every: 30000 },
      jobId: 'pagerank-recurring',
    }
  );

  await q.add(
    'sybil-detection',
    { type: 'sybil' },
    {
      repeat: { every: 300000 },
      jobId: 'sybil-recurring',
    }
  );

  worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      if (job.data.type === 'pagerank') {
        await runPageRank();
      }

      if (job.data.type === 'sybil') {
        const clusters = await detectSybilClusters();

        if (clusters.length > 0) {
          logger.warn('Sybil clusters detected', { count: clusters.length });
          const producer = await createProducer();

          try {
            for (const cluster of clusters) {
              for (const userId of cluster) {
                await publishEvent(
                  producer,
                  KAFKA_TOPICS.FRAUD_DETECTED,
                  {
                    userId,
                    fraudType: 'SYBIL',
                    confidence: 0.85,
                    evidence: {
                      clusterSize: cluster.length,
                      clusterIds: cluster,
                    },
                    timestamp: new Date().toISOString(),
                  },
                  userId
                );
              }
            }
          } finally {
            await producer.disconnect();
          }
        }
      }
    },
    {
      connection: getRedis(),
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => logger.info('Job completed', { jobName: job.name }));
  worker.on('failed', (job, error) =>
    logger.error('Job failed', { jobName: job?.name, error })
  );

  logger.info('Trust computation scheduler started');
}

export async function stopScheduler(): Promise<void> {
  await worker?.close();
  await queue?.close();
  worker = null;
  queue = null;
}
