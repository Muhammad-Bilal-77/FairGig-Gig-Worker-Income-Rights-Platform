import type { FastifyInstance } from 'fastify';
import type { SocketStream } from '@fastify/websocket';
import { createConsumer, KAFKA_TOPICS } from '@trust-network/kafka-client';
import { logger } from '../utils/logger';

const connections = new Map<string, Set<WebSocket>>();

export function registerWebSocketRoutes(fastify: FastifyInstance): void {
  fastify.get(
    '/ws/trust/:userId',
    { websocket: true },
    (connection: SocketStream, request: { params: { userId: string } }) => {
      const { userId } = request.params;
      const socket = connection.socket;

      if (!connections.has(userId)) {
        connections.set(userId, new Set());
      }

      connections.get(userId)?.add(socket);
      logger.info('WebSocket client connected', { userId });

      socket.send(
        JSON.stringify({
          type: 'connected',
          userId,
          message: 'Subscribed to trust score updates',
        })
      );

      socket.onclose = () => {
        connections.get(userId)?.delete(socket);
        if (connections.get(userId)?.size === 0) {
          connections.delete(userId);
        }
        logger.info('WebSocket client disconnected', { userId });
      };
    }
  );
}

export function broadcastTrustUpdate(
  userId: string,
  score: number,
  tier: string,
  oldScore: number
): void {
  const clients = connections.get(userId);
  if (!clients || clients.size === 0) {
    return;
  }

  const payload = JSON.stringify({
    type: 'trust_update',
    userId,
    score: Math.round(score * 100) / 100,
    tier,
    oldScore: Math.round(oldScore * 100) / 100,
    delta: Math.round((score - oldScore) * 100) / 100,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export async function startTrustUpdateConsumer(): Promise<void> {
  const consumer = await createConsumer('trust-engine-ws-group');

  await consumer.subscribe({
    topic: KAFKA_TOPICS.TRUST_UPDATED,
    fromBeginning: false,
  });

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || '{}') as {
          userId: string;
          newScore: number;
          newTier: string;
          oldScore: number;
        };

        broadcastTrustUpdate(event.userId, event.newScore, event.newTier, event.oldScore);
      } catch (error) {
        logger.error('WS broadcast error', { error });
      }
    },
  });
}
