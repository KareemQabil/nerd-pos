/**
 * Workflow 7: Close Session (Standard)
 *
 * Source: WORKFLOWS.md - Session Management Workflows
 *
 * Scenario: End of shift, cashier counts cash and closes session
 *
 * Success Criteria:
 * - Expected cash calculated correctly
 * - Variance calculated and checked against threshold
 * - Session status changes to CLOSED
 * - Z-Report data generated
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../../src/modules/sessions/sessions.repository';
import { SalesRepository } from '../../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../../src/core/prisma/prisma.service';
import { OutboxService } from '../../../../src/core/outbox/outbox.service';
import { IEventBus } from '../../../../src/core/event-bus/event-bus.interface';
import {
  BadRequestAppException,
  NotFoundAppException,
} from '../../../../src/common/exceptions';
import Decimal from 'decimal.js';
import { Prisma } from '@prisma/client';
import { SessionStatus } from '../../../../src/core/constants/enums';

describe('Workflow 7: Close Session', () => {
  let service: SessionsService;
  let mockRepo: jest.Mocked<SessionsRepository>;
  let mockSalesRepo: jest.Mocked<SalesRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockOutbox: jest.Mocked<OutboxService>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockTx: {
    $queryRaw: jest.Mock;
    registerSession: {
      update: jest.Mock;
    };
    denominationCount: {
      create: jest.Mock;
    };
  };

  const mockOpenSession = {
    id: 'session-123',
    sessionNumber: 'SES2026010001',
    userId: 'user-123',
    status: SessionStatus.OPEN,
    openingBalance: new Prisma.Decimal(500),
    expectedCash: new Prisma.Decimal(0),
    totalSales: new Prisma.Decimal(2000),
    totalCash: new Prisma.Decimal(1500),
    totalCashSales: new Prisma.Decimal(1500),
    totalCard: new Prisma.Decimal(500),
    totalCardSales: new Prisma.Decimal(500),
    totalOtherSales: new Prisma.Decimal(0),
    totalRefunds: new Prisma.Decimal(50),
    totalDrops: new Prisma.Decimal(0),
    totalPettyCash: new Prisma.Decimal(0),
    orderCount: 20,
    ordersCount: 20,
    openedAt: new Date(),
    terminalId: 'terminal-1',
    businessDate: new Date(),
  };

  beforeEach(async () => {
    mockRepo = {
      findById: jest.fn().mockResolvedValue({ ...mockOpenSession }),
      createDenomination: jest.fn().mockResolvedValue({}),
      findOpenSession: jest.fn(),
      create: jest.fn(),
      countByPrefix: jest.fn(),
      findWithDetails: jest.fn(),
      findByUser: jest.fn(),
    } as any;

    mockSalesRepo = {
      findBySessionAndStatus: jest.fn().mockResolvedValue([]),
    } as any;

    mockTx = {
      $queryRaw: jest.fn().mockResolvedValue(undefined),
      registerSession: {
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockOpenSession, ...data }),
        ),
      },
      denominationCount: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma = {
      $transaction: jest.fn((fn: any) => fn(mockTx)),
    } as any;

    mockOutbox = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      flushPending: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: SessionsRepository, useValue: mockRepo },
        { provide: SalesRepository, useValue: mockSalesRepo },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OutboxService, useValue: mockOutbox },
        { provide: 'IEventBus', useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  // Test 7.1: Calculate expected cash
  describe('7.1: Expected Balance Calculation', () => {
    it('should calculate expected = opening + cash sales - refunds', async () => {
      // Opening: 500, Cash: 1500, Refunds: 50
      // Expected: 500 + 1500 - 50 = 1950
      const denominations = [
        { value: 100, count: 19 }, // 1900
        { value: 50, count: 1 }, // 50
      ]; // Total: 1950 (exact match)

      const session = await service.closeSession({
        sessionId: 'session-123',
        denominations,
      });

      expect(session.discrepancy).toBe(0);
    });
  });

  // Test 7.2: Variance calculation
  describe('7.2: Variance Calculation', () => {
    it('should calculate variance = declared - expected', async () => {
      // Expected: 500 + 1500 - 50 = 1950
      // Declared: 1930 (shortage)
      const denominations = [
        { value: 100, count: 19 }, // 1900
        { value: 10, count: 3 }, // 30
      ]; // Total: 1930

      const session = await service.closeSession({
        sessionId: 'session-123',
        denominations,
      });

      // Variance: 1930 - 1950 = -20 (shortage)
      expect(session.discrepancy).toBe(-20);
    });

    it('should handle positive variance (overage)', async () => {
      // Declared: 2000 (overage)
      const denominations = [
        { value: 500, count: 4 }, // 2000
      ];

      const session = await service.closeSession({
        sessionId: 'session-123',
        denominations,
      });

      // Variance: 2000 - 1950 = 50 (overage)
      expect(session.discrepancy).toBe(50);
    });
  });

  // Test 7.3: Variance threshold alert
  describe('7.3: Variance Threshold Check', () => {
    it('should publish alert if variance > threshold (50)', async () => {
      // Declared: 1800 → Variance = -150 (exceeds 50 threshold)
      const denominations = [
        { value: 500, count: 3 }, // 1500
        { value: 100, count: 3 }, // 300
      ]; // Total: 1800

      await service.closeSession({
        sessionId: 'session-123',
        denominations,
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'SessionVarianceAlert',
        expect.objectContaining({
          sessionId: 'session-123',
        }),
      );
    });

    it('should NOT publish alert if variance within threshold', async () => {
      // Declared: 1930 → Variance = -20 (within 50 threshold)
      const denominations = [
        { value: 100, count: 19 },
        { value: 10, count: 3 },
      ]; // 1930

      mockEventBus.publish.mockClear();

      await service.closeSession({
        sessionId: 'session-123',
        denominations,
      });

      // SessionClosed should be enqueued via outbox
      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockTx,
        'SessionClosed',
        expect.anything(),
      );

      // SessionVarianceAlert should NOT be published
      const alertCall = mockEventBus.publish.mock.calls.find(
        (call) => call[0] === 'SessionVarianceAlert',
      );
      expect(alertCall).toBeUndefined();
    });
  });

  // Test 7.4: Session status update
  describe('7.4: Session Status Update', () => {
    it('should update session status to CLOSED', async () => {
      const denominations = [
        { value: 100, count: 19 },
        { value: 50, count: 1 },
      ];

      const session = await service.closeSession({
        sessionId: 'session-123',
        denominations,
      });

      expect(session.status).toBe(SessionStatus.CLOSED);
      expect(mockTx.registerSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'session-123' },
          data: expect.objectContaining({
            status: SessionStatus.CLOSED,
          }),
        }),
      );
    });

    it('should throw error if session already closed', async () => {
      mockRepo.findById.mockResolvedValue({
        ...mockOpenSession,
        status: SessionStatus.CLOSED,
      });

      await expect(
        service.closeSession({
          sessionId: 'session-123',
          denominations: [],
        }),
      ).rejects.toThrow(BadRequestAppException);
    });

    it('should throw error if session not found', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(
        service.closeSession({
          sessionId: 'nonexistent',
          denominations: [],
        }),
      ).rejects.toThrow(NotFoundAppException);
    });
  });

  // Test 7.5: Event publishing
  describe('7.5: SessionClosed Event', () => {
    it('should publish SessionClosed event with variance', async () => {
      const denominations = [
        { value: 100, count: 19 },
        { value: 50, count: 1 },
      ];

      await service.closeSession({
        sessionId: 'session-123',
        denominations,
      });

      expect(mockOutbox.enqueue).toHaveBeenCalledWith(
        mockTx,
        'SessionClosed',
        expect.objectContaining({
          sessionId: 'session-123',
        }),
      );
    });
  });
});
