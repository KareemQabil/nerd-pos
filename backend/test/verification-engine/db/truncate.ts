import type { PrismaClient } from '@prisma/client';
import { TRANSACTIONAL_TABLES } from './transactional-tables';

const assertSafeToTruncate = (): void => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('truncateTransactional requires NODE_ENV=test.');
  }

  if (process.env.E2E_ALLOW_TRUNCATE !== 'true') {
    throw new Error(
      'truncateTransactional requires E2E_ALLOW_TRUNCATE=true.',
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for truncateTransactional.');
  }

  const allowlist = (process.env.E2E_DB_ALLOWLIST || '').toLowerCase();
  if (!allowlist) {
    throw new Error('E2E_DB_ALLOWLIST is required for truncateTransactional.');
  }

  const urlLower = databaseUrl.toLowerCase();
  const allowlisted = allowlist.length > 0 && urlLower.includes(allowlist);

  if (!allowlisted) {
    throw new Error(
      'DATABASE_URL failed verification. E2E_DB_ALLOWLIST must be present in the connection string.',
    );
  }
};

export const truncateTransactional = async (
  prisma: PrismaClient,
): Promise<void> => {
  assertSafeToTruncate();

  if (TRANSACTIONAL_TABLES.length === 0) {
    return;
  }

  for (const table of TRANSACTIONAL_TABLES) {
    if (!/^[a-z0-9_]+$/.test(table)) {
      throw new Error(`Invalid table name detected: ${table}`);
    }
  }

  const tables = TRANSACTIONAL_TABLES.map((name) => `"${name}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
};
