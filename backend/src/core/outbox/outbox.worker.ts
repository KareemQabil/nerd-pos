// Outbox Worker
// Claims events with SKIP LOCKED and processes outside of DB transactions.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma, OutboxStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { IEventBus } from '../event-bus/event-bus.interface';

type OutboxRow = {
  id: string;
  event_name: string;
  payload: Prisma.JsonValue;
  attempts: number;
};

@Injectable()
export class OutboxWorker {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly instanceId = randomUUID();
  private readonly batchSize = 50;
  private readonly maxAttempts = 5;
  private readonly staleLockMs = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}

  @Cron('*/5 * * * * *')
  async processOutbox(): Promise<void> {
    await this.requeueStaleLocks();

    // Fetch-process loop
    // Lock is only held during claim, processing happens outside tx
    while (true) {
      const batch = await this.claimBatch();
      if (batch.length === 0) break;

      for (const event of batch) {
        await this.processEvent(event);
      }

      if (batch.length < this.batchSize) break;
    }
  }

  private async claimBatch(): Promise<OutboxRow[]> {
    const rows = await this.prisma.$queryRaw<OutboxRow[]>(Prisma.sql`
      UPDATE outbox_events
      SET status = 'PROCESSING',
          locked_at = NOW(),
          locked_by = ${this.instanceId},
          attempts = attempts + 1
      WHERE id IN (
        SELECT id
        FROM outbox_events
        WHERE status IN ('PENDING', 'RETRY')
          AND (next_run_at IS NULL OR next_run_at <= NOW())
        ORDER BY created_at ASC
        LIMIT ${this.batchSize}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, event_name, payload, attempts
    `);

    return rows ?? [];
  }

  private async processEvent(event: OutboxRow): Promise<void> {
    const payload = this.decoratePayload(event);

    try {
      await this.eventBus.publish(event.event_name, payload);

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.PROCESSED,
          processedAt: new Date(),
          lockedAt: null,
          lockedBy: null,
          lastError: null,
          nextRunAt: null,
        },
      });
    } catch (error) {
      const attempts = event.attempts ?? 1;
      const lastError = (error as Error).message;

      if (attempts >= this.maxAttempts) {
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxStatus.DEAD,
            deadAt: new Date(),
            lockedAt: null,
            lockedBy: null,
            lastError,
          },
        });
        this.logger.error(
          `Outbox event ${event.event_name} moved to DEAD after ${attempts} attempts`,
        );
        return;
      }

      const nextRunAt = new Date(Date.now() + this.computeBackoffMs(attempts));
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.RETRY,
          nextRunAt,
          lockedAt: null,
          lockedBy: null,
          lastError,
        },
      });
    }
  }

  private async requeueStaleLocks(): Promise<void> {
    const cutoff = new Date(Date.now() - this.staleLockMs);
    const result = await this.prisma.outboxEvent.updateMany({
      where: {
        status: OutboxStatus.PROCESSING,
        lockedAt: { lt: cutoff },
      },
      data: {
        status: OutboxStatus.RETRY,
        nextRunAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: 'Stale lock requeued',
      },
    });

    if (result.count > 0) {
      this.logger.warn(`Requeued ${result.count} stale outbox events`);
    }
  }

  private computeBackoffMs(attempts: number): number {
    const base = 1000; // 1s
    const max = 5 * 60_000; // 5m
    return Math.min(max, Math.pow(2, attempts) * base);
  }

  private decoratePayload(event: OutboxRow): Record<string, unknown> {
    const basePayload =
      event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
        ? (event.payload as Record<string, unknown>)
        : { value: event.payload };

    return {
      ...basePayload,
      _eventId: event.id,
      _eventType: event.event_name,
    };
  }
}
