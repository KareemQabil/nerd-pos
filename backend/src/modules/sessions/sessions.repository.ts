// Sessions Repository
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md, 08-repository.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  Session,
  SessionWithDetails,
  Denomination,
} from './entities/sessions.entity';

@Injectable()
export class SessionsRepository extends BaseRepository<Session> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return 'session';
  }

  // ==================== SESSION ====================

  async findOpenSession(userId: string): Promise<Session | null> {
    return (this.prisma as any).session.findFirst({
      where: { userId, status: 'OPEN' },
    });
  }

  async findWithDetails(id: string): Promise<SessionWithDetails | null> {
    return (this.prisma as any).session.findUnique({
      where: { id },
      include: { denominations: true },
    });
  }

  async findByUser(userId: string): Promise<Session[]> {
    return (this.prisma as any).session.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }

  async findByDateRange(start: Date, end: Date): Promise<Session[]> {
    return (this.prisma as any).session.findMany({
      where: {
        openedAt: { gte: start, lte: end },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  async countByPrefix(prefix: string): Promise<number> {
    return (this.prisma as any).session.count({
      where: { sessionNumber: { startsWith: prefix } },
    });
  }

  // ==================== DENOMINATION ====================

  async createDenomination(data: any): Promise<Denomination> {
    return (this.prisma as any).denomination.create({ data });
  }

  async findDenominationsBySession(sessionId: string): Promise<Denomination[]> {
    return (this.prisma as any).denomination.findMany({
      where: { sessionId },
      orderBy: { value: 'desc' },
    });
  }

  // ==================== STATISTICS ====================

  async getVarianceReport(startDate: Date, endDate: Date): Promise<any[]> {
    return (this.prisma as any).session.findMany({
      where: {
        status: 'CLOSED',
        closedAt: { gte: startDate, lte: endDate },
      },
      select: {
        sessionNumber: true,
        userId: true,
        closedAt: true,
        expectedBalance: true,
        closingBalance: true,
        variance: true,
      },
      orderBy: { closedAt: 'desc' },
    });
  }
}
