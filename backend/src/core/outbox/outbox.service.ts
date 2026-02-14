// Transactional Outbox Service
// Ensures critical domain events are persisted before publication

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IEventBus } from '../event-bus/event-bus.interface';

type TxClient = Prisma.TransactionClient;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}

  async enqueue(
    tx: TxClient,
    eventName: string,
    payload: Prisma.InputJsonValue,
  ): Promise<void> {
    await (tx as unknown as PrismaClient).outboxEvent.create({
      data: {
        eventName,
        payload,
        status: 'PENDING',
      },
    });
  }

  async flushPending(limit: number = 25): Promise<void> {
    const events = await this.prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    for (const event of events) {
      try {
        const basePayload =
          event.payload &&
          typeof event.payload === 'object' &&
          !Array.isArray(event.payload)
            ? (event.payload as Record<string, unknown>)
            : { value: event.payload };
        await this.eventBus.publish(event.eventName, {
          ...basePayload,
          _eventId: event.id,
          _eventType: event.eventName,
        });
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: 'PROCESSED', processedAt: new Date() },
        });
      } catch (error) {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            attempts: { increment: 1 },
            lastError: (error as Error).message,
          },
        });
        this.logger.error(
          `Outbox publish failed for ${event.eventName}`,
          (error as Error).stack,
        );
      }
    }
  }
}
