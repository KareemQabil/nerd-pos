import { randomUUID } from 'crypto';
import { resetTransactionalState } from '../../db/sandbox';
import { getPrisma } from '../../runtime/test-context';

describe('workflow: inbox idempotency', () => {
  beforeAll(async () => {
    await resetTransactionalState();
  });

  it('rejects duplicate inbox events for the same consumer', async () => {
    const prisma = await getPrisma();
    const tableCheck = await prisma.$queryRaw<
      Array<{ exists: string | null }>
    >`SELECT table_name as exists
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'inbox_events'`;

    if (!tableCheck[0]?.exists) {
      throw new Error('inbox_events table is missing in the target database.');
    }

    const consumer = 'verification.inbox.test';
    const eventId = randomUUID();
    const eventType = 'VerificationEvent';

    await prisma.inboxEvent.create({
      data: {
        id: randomUUID(),
        consumer,
        eventId,
        eventType,
        payload: {},
        processedAt: new Date(),
        createdAt: new Date(),
      },
    });

    let duplicateError: unknown;
    try {
      await prisma.inboxEvent.create({
        data: {
          id: randomUUID(),
          consumer,
          eventId,
          eventType,
        payload: {},
          processedAt: new Date(),
          createdAt: new Date(),
        },
      });
    } catch (error) {
      duplicateError = error;
    }

    expect(duplicateError).toBeTruthy();
  });
});
