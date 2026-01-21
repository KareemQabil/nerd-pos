// Sessions Service
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Handles: Open/Close sessions, Blind close, Denomination count, Variance tracking
// BLOCK 1 FIX: Added $transaction for atomic session close
// BLOCK 3 FIX: Replaced magic strings with SessionStatus enum

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';
import { SalesRepository } from '../sales/sales.repository'; // BLOCK 2 FIX
import { PrismaService } from '../../core/prisma/prisma.service'; // BLOCK 1
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { OpenSessionDto, CloseSessionDto, DenominationDto } from './dto';
import {
  SessionOpenedEvent,
  SessionClosedEvent,
  SessionVarianceAlertEvent,
} from './events/sessions.events';
import { Session, Denomination } from './entities/sessions.entity';
import { SessionStatus, OrderStatus } from '../../core/constants/enums';
import Decimal from 'decimal.js';

@Injectable()
export class SessionsService {
  // Variance threshold for alerts (50 SAR)
  private readonly varianceAlertThreshold = new Decimal(50);

  constructor(
    private readonly repo: SessionsRepository,
    private readonly prisma: PrismaService, // BLOCK 1: Added for $transaction
    private readonly salesRepo: SalesRepository, // BLOCK 2 FIX: Added for pending order check
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) { }

  // ==================== OPEN SESSION ====================

  async openSession(dto: OpenSessionDto): Promise<Session> {
    // Check for existing open session
    const existingSession = await this.repo.findOpenSession(dto.userId);
    if (existingSession) {
      throw new BadRequestException(
        `User already has an open session: ${existingSession.sessionNumber}`,
      );
    }

    const sessionNumber = await this.generateSessionNumber();
    const openingBalance = new Decimal(dto.openingBalance);

    const session = await this.repo.create({
      sessionNumber,
      userId: dto.userId,
      openingBalance: openingBalance.toNumber(),
      status: SessionStatus.OPEN,
      openedAt: new Date(),
      totalSales: 0,
      totalCash: 0,
      totalCard: 0,
      totalRefunds: 0,
      orderCount: 0,
    });

    await this.eventBus.publish(
      'SessionOpened',
      new SessionOpenedEvent(session.id, dto.userId, openingBalance.toNumber()),
    );

    return session;
  }

  // ==================== CLOSE SESSION ====================

  // BLOCK 1 FIX: Atomic transaction for session close with denominations
  async closeSession(dto: CloseSessionDto): Promise<Session> {
    const session = await this.repo.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    if (session.status === SessionStatus.CLOSED) {
      throw new BadRequestException('Session already closed');
    }

    // FORENSIC AUDIT FIX: Check for pending DRAFT orders
    const draftOrders = await this.salesRepo.findBySessionAndStatus(
      dto.sessionId,
      OrderStatus.DRAFT,
    );

    if (draftOrders.length > 0) {
      throw new BadRequestException(
        `Cannot close session: ${draftOrders.length} draft order(s) pending. ` +
        `Order numbers: ${draftOrders.map((o) => o.orderNumber).join(', ')}`,
      );
    }

    // Calculate expected balance from session data (outside transaction - read only)
    // Expected = Opening + Cash Sales - Cash Refunds
    const expectedBalance = new Decimal(session.openingBalance)
      .plus(session.totalCash || 0)
      .minus(session.totalRefunds);

    // ATOMIC TRANSACTION: Create all denominations + update session together
    const { closedSession, declaredBalance } = await this.prisma.$transaction(
      async (tx) => {
        // 1. Process denomination count (blind close)
        let total = new Decimal(0);
        for (const denom of dto.denominations) {
          const value = new Decimal(denom.value);
          const count = denom.count;
          const denominationTotal = value.times(count);

          await (tx as any).denominationCount.create({
            data: {
              sessionId: session.id,
              denomination: value.toNumber(),
              count,
              total: denominationTotal.toNumber(),
            },
          });

          total = total.plus(denominationTotal);
        }

        // 2. Calculate variance
        const variance = total.minus(expectedBalance);

        // 3. Update session atomically
        const updated = await (tx as any).registerSession.update({
          where: { id: session.id },
          data: {
            status: SessionStatus.CLOSED,
            closedAt: new Date(),
            actualClosingBalance: total.toNumber(),
            discrepancy: variance.toNumber(),
          },
        });

        return { closedSession: updated, declaredBalance: total };
      },
    );

    // Events emitted AFTER transaction commits
    const variance = declaredBalance.minus(expectedBalance);

    await this.eventBus.publish(
      'SessionClosed',
      new SessionClosedEvent(
        session.id,
        variance.toNumber(),
        declaredBalance.toNumber(),
      ),
    );

    // Alert if variance exceeds threshold
    if (variance.abs().greaterThan(this.varianceAlertThreshold)) {
      await this.eventBus.publish(
        'SessionVarianceAlert',
        new SessionVarianceAlertEvent(
          session.id,
          variance.toNumber(),
          this.varianceAlertThreshold.toNumber(),
        ),
      );
    }

    return closedSession;
  }

  // ==================== DENOMINATION PROCESSING ====================
  // Note: processDenominations kept for backward compatibility but not used in new closeSession

  private async processDenominations(
    sessionId: string,
    denominations: DenominationDto[],
  ): Promise<Decimal> {
    let total = new Decimal(0);

    for (const denom of denominations) {
      const value = new Decimal(denom.value);
      const count = denom.count;
      const denominationTotal = value.times(count);

      await this.repo.createDenomination({
        sessionId,
        denomination: value.toNumber(),
        count,
        total: denominationTotal.toNumber(),
      });

      total = total.plus(denominationTotal);
    }

    return total;
  }

  // ==================== QUERIES ====================

  async getCurrentSession(userId: string): Promise<Session | null> {
    return this.repo.findOpenSession(userId);
  }

  async findById(id: string): Promise<Session> {
    const session = await this.repo.findById(id);
    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }
    return session;
  }

  async findByIdWithDetails(id: string): Promise<Session> {
    const session = await this.repo.findWithDetails(id);
    if (!session) {
      throw new NotFoundException(`Session ${id} not found`);
    }
    return session;
  }

  async findByUser(userId: string): Promise<Session[]> {
    return this.repo.findByUser(userId);
  }

  // ==================== SESSION NUMBER GENERATION ====================

  private async generateSessionNumber(): Promise<string> {
    const date = new Date();
    const prefix = `SES${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    const count = await this.repo.countByPrefix(prefix);
    return `${prefix}${(count + 1).toString().padStart(4, '0')}`;
  }

  // ==================== SESSION STATS UPDATE ====================
  // Called by event handlers when payments/sales occur

  async updateSessionStats(
    sessionId: string,
    saleAmount: number,
    cashAmount: number,
    cardAmount: number,
  ): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session || session.status !== SessionStatus.OPEN) return;

    await this.repo.update(sessionId, {
      totalSales: new Decimal(session.totalSales || 0)
        .plus(saleAmount)
        .toNumber(),
      totalCash: new Decimal(session.totalCash || 0)
        .plus(cashAmount)
        .toNumber(),
      totalCard: new Decimal(session.totalCard || 0)
        .plus(cardAmount)
        .toNumber(),
      orderCount: (session.orderCount || 0) + 1,
    });
  }

  async updateRefundStats(
    sessionId: string,
    refundAmount: number,
  ): Promise<void> {
    const session = await this.repo.findById(sessionId);
    if (!session || session.status !== SessionStatus.OPEN) return;

    await this.repo.update(sessionId, {
      totalRefunds: new Decimal(session.totalRefunds)
        .plus(refundAmount)
        .toNumber(),
    });
  }
}
