// Inbox Service
// Provides database-enforced idempotency for event handlers.

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  async executeIdempotently<T>(
    consumer: string,
    eventId: string,
    eventType: string,
    payload: unknown,
    handler: () => Promise<T>,
  ): Promise<{ processed: boolean; result?: T }> {
    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          await tx.inboxEvent.create({
            data: {
              consumer,
              eventId,
              eventType,
              payload: payload as Prisma.InputJsonValue,
            },
          });

          const handlerResult = await handler();
          return handlerResult;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return { processed: true, result };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { processed: false };
      }
      throw error;
    }
  }
}
