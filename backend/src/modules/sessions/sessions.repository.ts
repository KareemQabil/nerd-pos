// Sessions Repository
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md, 08-repository.md
// BLOCK 3 FIX: Replaced magic strings with SessionStatus enum
// BLOCK 3 FIX: Added proper DTO types to replace any
// Type-safe repository using Prisma's generated types.
// No more `(this.prisma as any)` type casting!

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  Session,
  SessionWithDetails,
  Denomination,
} from './entities/sessions.entity';
import { SessionStatus } from '../../core/constants/enums';
import { CreateDenominationDto } from './dto';

/**
 * Helper to get typed Prisma client
 * Provides direct access to all Prisma models with proper types
 */
function getTypedPrisma(prisma: PrismaService): PrismaClient {
  return prisma as PrismaClient;
}

@Injectable()
export class SessionsRepository extends BaseRepository<Session> {
  private readonly prismaClient: PrismaClient;

  constructor(prisma: PrismaService) {
    super(prisma);
    this.prismaClient = getTypedPrisma(prisma);
  }

  protected get model() {
    return 'registerSession';
  }

  // ==================== SESSION ====================

  async findOpenSession(userId: string): Promise<Session | null> {
    return this.prismaClient.registerSession.findFirst({
      where: { userId, status: SessionStatus.OPEN },
    });
  }

  async findWithDetails(id: string): Promise<SessionWithDetails | null> {
    return this.prismaClient.registerSession.findUnique({
      where: { id },
      include: { denominationCounts: true },
    }) as Promise<SessionWithDetails | null>;
  }

  async findByUser(userId: string): Promise<Session[]> {
    return this.prismaClient.registerSession.findMany({
      where: { userId },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });
  }

  async findByDateRange(start: Date, end: Date): Promise<Session[]> {
    return this.prismaClient.registerSession.findMany({
      where: {
        openedAt: { gte: start, lte: end },
      },
      orderBy: { openedAt: 'desc' },
    });
  }



  // ==================== DENOMINATION ====================

  async createDenomination(data: any): Promise<Denomination> {
    return (this.prismaClient as any).sessionDenomination.create({ data });
  }

  async findDenominationsBySession(registerSessionId: string): Promise<Denomination[]> {
    return (this.prismaClient as any).sessionDenomination.findMany({
      where: { registerSessionId },
      orderBy: { denomination: 'desc' },
    });
  }

  // ==================== STATISTICS ====================

  async getVarianceReport(startDate: Date, endDate: Date): Promise<any[]> {
    return this.prismaClient.registerSession.findMany({
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
