// Sessions Service
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Handles: Open/Close sessions, Blind close, Denomination count, Variance tracking

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { SessionsRepository } from './sessions.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { OpenSessionDto, CloseSessionDto, DenominationDto } from './dto';
import { SessionOpenedEvent, SessionClosedEvent, SessionVarianceAlertEvent } from './events/sessions.events';
import { Session, Denomination } from './entities/sessions.entity';
import Decimal from 'decimal.js';

@Injectable()
export class SessionsService {
    // Variance threshold for alerts (50 SAR)
    private readonly varianceAlertThreshold = new Decimal(50);

    constructor(
        private readonly repo: SessionsRepository,
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
            status: 'OPEN',
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

    async closeSession(dto: CloseSessionDto): Promise<Session> {
        const session = await this.repo.findById(dto.sessionId);
        if (!session) {
            throw new NotFoundException(`Session ${dto.sessionId} not found`);
        }

        if (session.status === 'CLOSED') {
            throw new BadRequestException('Session already closed');
        }

        // Process denomination count (blind close - calculate declared total)
        const declaredBalance = await this.processDenominations(
            session.id,
            dto.denominations,
        );

        // Calculate expected balance from session data
        // Expected = Opening + Cash Sales - Cash Refunds
        const expectedBalance = new Decimal(session.openingBalance)
            .plus(session.totalCash || 0)
            .minus(session.totalRefunds);

        // Calculate variance
        const variance = declaredBalance.minus(expectedBalance);

        // Update session
        const closedSession = await this.repo.update(session.id, {
            status: 'CLOSED',
            closedAt: new Date(),
            closingBalance: declaredBalance.toNumber(),
            expectedBalance: expectedBalance.toNumber(),
            variance: variance.toNumber(),
        });

        await this.eventBus.publish(
            'SessionClosed',
            new SessionClosedEvent(session.id, variance.toNumber(), declaredBalance.toNumber()),
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
                value: value.toNumber(),
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
        if (!session || session.status !== 'OPEN') return;

        await this.repo.update(sessionId, {
            totalSales: new Decimal(session.totalSales || 0).plus(saleAmount).toNumber(),
            totalCash: new Decimal(session.totalCash || 0).plus(cashAmount).toNumber(),
            totalCard: new Decimal(session.totalCard || 0).plus(cardAmount).toNumber(),
            orderCount: (session.orderCount || 0) + 1,
        });
    }

    async updateRefundStats(sessionId: string, refundAmount: number): Promise<void> {
        const session = await this.repo.findById(sessionId);
        if (!session || session.status !== 'OPEN') return;

        await this.repo.update(sessionId, {
            totalRefunds: new Decimal(session.totalRefunds).plus(refundAmount).toNumber(),
        });
    }
}
