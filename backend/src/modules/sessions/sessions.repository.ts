// Sessions Repository
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md, 08-repository.md
// BLOCK 3 FIX: Replaced magic strings with SessionStatus enum
// BLOCK 3 FIX: Added proper DTO types to replace any

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  Session,
  SessionWithDetails,
  Denomination,
} from './entities/sessions.entity';
import { SessionStatus } from '../../core/constants/enums';
import { CreateDenominationDto } from './dto';

@Injectable()
export class SessionsRepository extends BaseRepository<Session> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return 'registerSession';
  }

  // ==================== SESSION ====================

  async findOpenSession(userId: string): Promise<Session | null> {
    return (this.prisma as any).registerSession.findFirst({
      where: { userId, status: SessionStatus.OPEN },
    });
  }

  async findWithDetails(id: string): Promise<SessionWithDetails | null> {
    return (this.prisma as any).registerSession.findUnique({
      where: { id },
      include: { denominationCounts: true },
    });
  }

  async findByUser(userId: string): Promise<Session[]> {
    return (this.prisma as any).registerSession.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }

  async findByDateRange(start: Date, end: Date): Promise<Session[]> {
    return (this.prisma as any).registerSession.findMany({
      where: {
        openedAt: { gte: start, lte: end },
      },
      orderBy: { openedAt: 'desc' },
    });
  }



  // ==================== DENOMINATION ====================

  async createDenomination(data: CreateDenominationDto): Promise<Denomination> {
    return (this.prisma as any).denominationCount.create({ data });
  }

  async findDenominationsBySession(sessionId: string): Promise<Denomination[]> {
    return (this.prisma as any).denominationCount.findMany({
      where: { sessionId },
      orderBy: { denomination: 'desc' },
    });
  }

  // ==================== STATISTICS ====================

  async getVarianceReport(startDate: Date, endDate: Date): Promise<any[]> {
    return (this.prisma as any).registerSession.findMany({
      where: {
        status: SessionStatus.CLOSED,
        closedAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        userId: true,
        terminalId: true,
        closedAt: true,
        expectedCash: true,
        actualClosingBalance: true,
        discrepancy: true,
      },
      orderBy: { closedAt: 'desc' },
    });
  }
}
