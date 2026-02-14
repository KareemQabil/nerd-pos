/**
 * Workflow 6: Open Session
 *
 * Source: WORKFLOWS.md - Session Management Workflows
 *
 * Scenario: Cashier starts shift, opens session
 * Tests: Service logic with mocked repository
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../../src/modules/sessions/sessions.repository';
import { SalesRepository } from '../../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../../src/core/prisma/prisma.service';
import { OutboxService } from '../../../../src/core/outbox/outbox.service';
import { IEventBus } from '../../../../src/core/event-bus/event-bus.interface';
import { BadRequestAppException } from '../../../../src/common/exceptions';
import Decimal from 'decimal.js';
import { SessionStatus } from '../../../../src/core/constants/enums';

describe('Workflow 6: Open Session', () => {
  let service: SessionsService;
  let mockRepo: jest.Mocked<SessionsRepository>;
  let mockSalesRepo: jest.Mocked<SalesRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;
  let mockOutbox: jest.Mocked<OutboxService>;
  let mockEventBus: jest.Mocked<IEventBus>;
  let mockTx: {
    $executeRaw: jest.Mock;
    registerSession: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let sessionCounter = 0;

  beforeEach(async () => {
    sessionCounter = 0;

    mockRepo = {
      findOpenSession: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          id: `session-${Date.now()}-${++sessionCounter}`,
          ...data,
        }),
      ),
      findById: jest.fn(),
      update: jest.fn(),
      createDenomination: jest.fn(),
      findWithDetails: jest.fn(),
      findByUser: jest.fn(),
    } as any;

    mockSalesRepo = {
      findBySessionAndStatus: jest.fn().mockResolvedValue([]),
    } as any;

    mockTx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      registerSession: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => {
          const now = new Date();
          const y = now.getFullYear().toString();
          const m = (now.getMonth() + 1).toString().padStart(2, '0');
          const seq = (++sessionCounter).toString().padStart(4, '0');
          return Promise.resolve({
            id: `session-${Date.now()}-${sessionCounter}`,
            sessionNumber: `SES${y}${m}${seq}`,
            ...data,
          });
        }),
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

  // Test 6.1: Create session with opening balance
  describe('6.1: Create Session with Opening Balance', () => {
    it('should create session with correct opening balance', async () => {
      const userId = 'user-123';
      const openingBalance = 500;
      const terminalId = 'terminal-1';

      const session = await service.openSession(
        { openingBalance, terminalId },
        userId,
      );

      expect(session).toBeDefined();
      expect(session.status).toBe(SessionStatus.OPEN);
      expect(new Decimal(session.openingBalance).equals(new Decimal(500))).toBe(
        true,
      );
      expect(session.userId).toBe(userId);
      expect(session.terminalId).toBe(terminalId);
    });

    it('should initialize session with zero sales', async () => {
      const session = await service.openSession(
        { openingBalance: 500, terminalId: 'terminal-2' },
        'user-456',
      );

      expect(session.totalCashSales).toBe(0);
      expect(session.totalCardSales).toBe(0);
      expect(session.totalOtherSales).toBe(0);
      expect(session.ordersCount).toBe(0);
    });

    it('should publish SessionOpened event', async () => {
      await service.openSession(
        { openingBalance: 500, terminalId: 'terminal-3' },
        'user-789',
      );

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'SessionOpened',
        expect.objectContaining({
          userId: 'user-789',
          openingBalance: 500,
        }),
      );
    });
  });

  // Test 6.2: Terminal locked (no duplicate session)
  describe('6.2: Duplicate Session Blocked', () => {
    it('should throw error when user already has open session', async () => {
      // First call: no existing session
      mockTx.registerSession.findFirst.mockResolvedValueOnce(null);

      await service.openSession(
        { openingBalance: 500, terminalId: 'terminal-4' },
        'user-existing',
      );

      // Second call: existing session found
      mockTx.registerSession.findFirst.mockResolvedValueOnce({
        id: 'existing-session',
        sessionNumber: 'SES20260100001',
        status: SessionStatus.OPEN,
      } as any);

      await expect(
        service.openSession(
          { openingBalance: 500, terminalId: 'terminal-4' },
          'user-existing',
        ),
      ).rejects.toThrow(BadRequestAppException);
    });

    it('should allow different users to open sessions', async () => {
      mockTx.registerSession.findFirst.mockResolvedValue(null);

      const session1 = await service.openSession(
        { openingBalance: 500, terminalId: 'terminal-5' },
        'user-1',
      );

      const session2 = await service.openSession(
        { openingBalance: 300, terminalId: 'terminal-5' },
        'user-2',
      );

      expect(session1).toBeDefined();
      expect(session2).toBeDefined();
      expect(session1.id).not.toBe(session2.id);
    });
  });

  // Test 6.3: Session number generation
  describe('6.3: Session Number Generation', () => {
    it('should generate session number in correct format', async () => {
      const session = await service.openSession(
        { openingBalance: 100, terminalId: 'terminal-6' },
        'user-gen',
      );

      // Format: SESYYYYMMNNNN (e.g., SES2026010001)
      expect(session.sessionNumber).toBeDefined();
      expect(session.sessionNumber).toMatch(/^SES\d{6}\d{4}$/);
    });

    it('should acquire an advisory lock during session open', async () => {
      await service.openSession(
        { openingBalance: 100, terminalId: 'terminal-6' },
        'user-count',
      );

      expect(mockTx.$executeRaw).toHaveBeenCalled();
    });
  });
});
