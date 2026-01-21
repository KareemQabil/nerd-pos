/**
 * SessionsService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 * BLOCK 3.5 FIX: Updated to use SessionStatus enum
 *
 * Applied Error Fixing Workflow:
 * - Verified service methods from sessions.service.ts
 * - Verified repository methods from sessions.repository.ts
 * - Verified DTOs from dto/index.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { SessionsRepository } from './sessions.repository';
import { SalesRepository } from '../sales/sales.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SessionStatus } from '../../core/constants/enums';
import Decimal from 'decimal.js';

// Mock Repository - methods from sessions.repository.ts
function createMockRepository() {
  return {
    // BaseRepository methods
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    // Session methods
    findOpenSession: jest.fn(),
    findWithDetails: jest.fn(),
    findByUser: jest.fn(),
    findByDateRange: jest.fn(),
    countByPrefix: jest.fn(),
    // Denomination methods
    createDenomination: jest.fn(),
    findDenominationsBySession: jest.fn(),
    // Statistics
    getVarianceReport: jest.fn(),
  };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
}

// Mock PrismaService with $transaction support
function createMockPrismaService() {
  const mockPrisma: any = {
    denominationCount: {
      create: jest.fn(),
    },
    registerSession: {
      update: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((callback: (tx: any) => Promise<any>) =>
    callback(mockPrisma),
  );
  return mockPrisma;
}

// Mock SalesRepository
function createMockSalesRepository() {
  return {
    findBySessionAndStatus: jest.fn(),
  };
}

describe('SessionsService', () => {
  let service: SessionsService;
  let repo: ReturnType<typeof createMockRepository>;
  let salesRepo: ReturnType<typeof createMockSalesRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    repo = createMockRepository();
    salesRepo = createMockSalesRepository();
    eventBus = createMockEventBus();
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: SessionsRepository, useValue: repo },
        { provide: SalesRepository, useValue: salesRepo },
        { provide: PrismaService, useValue: prisma },
        { provide: 'IEventBus', useValue: eventBus },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== OPEN SESSION TESTS ====================

  describe('openSession', () => {
    it('should open session with opening balance', async () => {
      const dto = {
        userId: 'user-1',
        openingBalance: 500.0,
      };

      const mockSession = {
        id: 'session-1',
        sessionNumber: 'SES2026010001',
        userId: dto.userId,
        openingBalance: 500.0,
        status: SessionStatus.OPEN,
        totalSales: 0,
        totalCash: 0,
        totalCard: 0,
        totalRefunds: 0,
        orderCount: 0,
      };

      repo.findOpenSession.mockResolvedValue(null);
      repo.countByPrefix.mockResolvedValue(0);
      repo.create.mockResolvedValue(mockSession);

      const result = await service.openSession(dto);

      expect(result.status).toBe(SessionStatus.OPEN);
      expect(result.openingBalance).toBe(500.0);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'SessionOpened',
        expect.anything(),
      );
    });

    it('should throw error if user already has open session', async () => {
      const existingSession = {
        id: 'session-1',
        sessionNumber: 'SES2026010001',
        status: SessionStatus.OPEN,
      };

      repo.findOpenSession.mockResolvedValue(existingSession);

      await expect(
        service.openSession({
          userId: 'user-1',
          openingBalance: 500.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== CLOSE SESSION TESTS ====================

  describe('closeSession', () => {
    it('should close session with denomination count', async () => {
      const mockSession = {
        id: 'session-1',
        status: SessionStatus.OPEN,
        openingBalance: 500.0,
        totalCash: 1000.0,
        totalRefunds: 50.0,
      };

      const dto = {
        sessionId: 'session-1',
        denominations: [
          { value: 200, count: 5 }, // 1000
          { value: 100, count: 4 }, // 400
          { value: 50, count: 1 }, // 50
        ],
      };
      // Declared = 1450

      const closedSession = {
        ...mockSession,
        status: SessionStatus.CLOSED,
        closingBalance: 1450,
        expectedBalance: 1450, // 500 + 1000 - 50
        variance: 0,
      };

      repo.findById.mockResolvedValue(mockSession);
      // Mock salesRepo
      salesRepo.findBySessionAndStatus.mockResolvedValue([]);
      // Mock prisma operations inside $transaction
      prisma.denominationCount.create.mockResolvedValue({});
      prisma.registerSession.update.mockResolvedValue(closedSession);

      const result = await service.closeSession(dto);

      expect(result.status).toBe(SessionStatus.CLOSED);
      expect(prisma.denominationCount.create).toHaveBeenCalledTimes(3);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'SessionClosed',
        expect.anything(),
      );
    });

    it('should throw error for already closed session', async () => {
      const closedSession = {
        id: 'session-1',
        status: SessionStatus.CLOSED,
      };

      repo.findById.mockResolvedValue(closedSession);

      await expect(
        service.closeSession({
          sessionId: 'session-1',
          denominations: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent session', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.closeSession({
          sessionId: 'non-existent',
          denominations: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should publish variance alert for large variance', async () => {
      const mockSession = {
        id: 'session-1',
        status: SessionStatus.OPEN,
        openingBalance: 500.0,
        totalCash: 1000.0,
        totalRefunds: 0,
      };

      const dto = {
        sessionId: 'session-1',
        denominations: [
          { value: 100, count: 13 }, // 1300 (expected 1500, variance = -200)
        ],
      };

      repo.findById.mockResolvedValue(mockSession);
      salesRepo.findBySessionAndStatus.mockResolvedValue([]);
      repo.createDenomination.mockResolvedValue({});
      repo.update.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.CLOSED,
        closingBalance: 1300,
        expectedBalance: 1500,
        variance: -200,
      });

      await service.closeSession(dto);

      // Should publish both SessionClosed and SessionVarianceAlert
      expect(eventBus.publish).toHaveBeenCalledTimes(2);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'SessionVarianceAlert',
        expect.anything(),
      );
    });
  });

  // ==================== QUERY TESTS ====================

  describe('getCurrentSession', () => {
    it('should return open session for user', async () => {
      const session = { id: 'session-1', status: SessionStatus.OPEN };
      repo.findOpenSession.mockResolvedValue(session);

      const result = await service.getCurrentSession('user-1');

      expect(result?.status).toBe(SessionStatus.OPEN);
    });

    it('should return null if no open session', async () => {
      repo.findOpenSession.mockResolvedValue(null);

      const result = await service.getCurrentSession('user-1');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return session', async () => {
      const session = { id: 'session-1' };
      repo.findById.mockResolvedValue(session);

      const result = await service.findById('session-1');

      expect(result.id).toBe('session-1');
    });

    it('should throw NotFoundException', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUser', () => {
    it('should return sessions for user', async () => {
      const sessions = [{ id: 'session-1' }, { id: 'session-2' }];
      repo.findByUser.mockResolvedValue(sessions);

      const result = await service.findByUser('user-1');

      expect(result).toHaveLength(2);
    });
  });

  // ==================== SESSION STATS TESTS ====================

  describe('updateSessionStats', () => {
    it('should update running session totals', async () => {
      const session = {
        id: 'session-1',
        status: SessionStatus.OPEN,
        totalSales: 100,
        totalCash: 50,
        totalCard: 50,
        orderCount: 5,
      };

      repo.findById.mockResolvedValue(session);
      repo.update.mockResolvedValue({});

      await service.updateSessionStats('session-1', 75, 25, 50);

      expect(repo.update).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          totalSales: 175,
          totalCash: 75,
          totalCard: 100,
          orderCount: 6,
        }),
      );
    });

    it('should not update closed session', async () => {
      const session = {
        id: 'session-1',
        status: SessionStatus.CLOSED,
      };

      repo.findById.mockResolvedValue(session);

      await service.updateSessionStats('session-1', 100, 100, 0);

      expect(repo.update).not.toHaveBeenCalled();
    });
  });

  describe('updateRefundStats', () => {
    it('should update refund total', async () => {
      const session = {
        id: 'session-1',
        status: SessionStatus.OPEN,
        totalRefunds: 50,
      };

      repo.findById.mockResolvedValue(session);
      repo.update.mockResolvedValue({});

      await service.updateRefundStats('session-1', 25);

      expect(repo.update).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          totalRefunds: 75,
        }),
      );
    });
  });
});
