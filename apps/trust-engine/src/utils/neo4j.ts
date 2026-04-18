import neo4j, { type Driver, type Session } from 'neo4j-driver';
import { logger } from './logger';

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'neo4j_secret_123'
      ),
      {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 10000,
      }
    );
    logger.info('Neo4j driver initialized');
  }

  return driver;
}

export function getSession(): Session {
  return getNeo4jDriver().session({ defaultAccessMode: neo4j.session.WRITE });
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

export async function initializeGraphSchema(): Promise<void> {
  const session = getSession();

  try {
    await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);

    await session.run(`
      CREATE CONSTRAINT user_did_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.did IS UNIQUE
    `);

    await session.run(`
      CREATE INDEX user_trust_score IF NOT EXISTS
      FOR (u:User) ON (u.trustScore)
    `);

    logger.info('Neo4j schema initialized');
  } finally {
    await session.close();
  }
}
