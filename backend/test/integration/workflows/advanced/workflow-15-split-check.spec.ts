/**
 * Workflow 15: Split Check
 *
 * Source: WORKFLOWS.md - Advanced Workflows
 * Tests splitting orders across multiple bills
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../../../src/modules/payments/payments.service';
import { PaymentsRepository } from '../../../../src/modules/payments/payments.repository';
import { PrismaService } from '../../../../src/core/prisma/prisma.service';
import { OutboxService } from '../../../../src/core/outbox/outbox.service';

function createMockRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByOrder: jest.fn(),
    findBySession: jest.fn(),
    createRefund: jest.fn(),
    findRefundById: jest.fn(),
    updateRefund: jest.fn(),
    findPendingRefunds: jest.fn(),
    findAllMethods: jest.fn(),
    createMethod: jest.fn(),
    updateMethod: jest.fn(),
  };
}

function createMockEventBus() {
  return { publish: jest.fn(), subscribe: jest.fn() };
}

describe('Workflow 15: Split Check', () => {
  let service: PaymentsService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let outbox: { enqueue: jest.Mock; flushPending: jest.Mock };

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();
    outbox = { enqueue: jest.fn().mockResolvedValue(undefined), flushPending: jest.fn() };

    const prismaMock: any = {
      $transaction: jest.fn((fn: any) =>
        fn({
          salesOrder: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'order-1',
              grandTotal: 150,
              status: 'CONFIRMED',
              sessionId: 'session-1',
            }),
          },
          payment: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
            count: jest.fn().mockResolvedValue(0),
            create: jest.fn().mockImplementation(({ data }: { data: any }) =>
              Promise.resolve({ id: `pay-${Math.random()}`, ...data }),
            ),
          },
          paymentMethod: {
            findFirst: jest.fn().mockResolvedValue({
              requiresReference: false,
              requiresTerminal: false,
            }),
          },
          $queryRaw: jest.fn().mockResolvedValue(undefined),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: repo },
        { provide: PrismaService, useValue: prismaMock },
        { provide: OutboxService, useValue: outbox },
        { provide: 'IEventBus', useValue: eventBus },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ==================== 15.1: SPLIT PAYMENT ====================
  describe('15.1: Split Payment', () => {
    it('should process split payment with multiple methods', async () => {
      repo.create.mockImplementation((data) =>
        Promise.resolve({
          id: `pay-${Math.random()}`,
          ...data,
          status: 'COMPLETED',
        }),
      );

      const result = await service.processSplitPayment({
        orderId: 'order-1',
        sessionId: 'session-1',
        userId: 'cashier-1',
        payments: [
          { method: 'CASH', amount: 75, receivedAmount: 75 },
          { method: 'CARD', amount: 75 },
        ],
      });

      expect(result).toHaveLength(2);
      expect(outbox.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        'PaymentCompleted',
        expect.anything(),
      );
    });

    it('should distribute payments correctly', async () => {
      const result = await service.processSplitPayment({
        orderId: 'order-1',
        sessionId: 'session-1',
        userId: 'cashier-1',
        payments: [
          { method: 'CASH', amount: 50 },
          { method: 'CARD', amount: 50 },
          { method: 'CARD', amount: 50 },
        ],
      });

      expect(result).toHaveLength(3);
      const total = result.reduce((sum, p) => sum + Number(p.amount), 0);
      expect(total).toBe(150);
    });
  });

  // ==================== 15.2: PAYMENT METHODS ====================
  describe('15.2: Payment Methods', () => {
    it('should get all payment methods', async () => {
      repo.findAllMethods.mockResolvedValue([
        { id: 'method-1', name: 'Cash', code: 'CASH' },
        { id: 'method-2', name: 'MADA', code: 'MADA' },
        { id: 'method-3', name: 'Visa', code: 'VISA' },
      ]);

      const result = await service.getAllPaymentMethods();

      expect(result).toHaveLength(3);
    });

    it('should create payment method', async () => {
      repo.createMethod.mockResolvedValue({
        id: 'method-new',
        code: 'WALLET',
        name: 'Apple Pay',
        type: 'WALLET',
      });

      const result = await service.createPaymentMethod({
        code: 'WALLET',
        name: 'Apple Pay',
        nameAr: 'أبل باي',
        type: 'WALLET',
        isActive: true,
      });

      expect(result.type).toBe('WALLET');
    });
  });

  // ==================== 15.3: FIND PAYMENTS ====================
  describe('15.3: Find Payments', () => {
    it('should find payments by order', async () => {
      repo.findByOrder.mockResolvedValue([
        { id: 'pay-1', method: 'CASH', amount: 50 },
        { id: 'pay-2', method: 'CARD', amount: 50 },
      ]);

      const result = await service.findByOrder('order-1');

      expect(result).toHaveLength(2);
    });
  });
});

