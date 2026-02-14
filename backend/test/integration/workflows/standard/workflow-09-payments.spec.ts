/**
 * Workflow 9: Payments & Refunds
 *
 * Source: WORKFLOWS.md - Payment Workflows
 *
 * Tests:
 * - Single payment (cash with change)
 * - Split payment
 * - Refund workflow (auto-approve threshold)
 * - Refund approval/rejection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestAppException } from '../../../../src/common/exceptions';
import { PaymentsService } from '../../../../src/modules/payments/payments.service';
import { PaymentsRepository } from '../../../../src/modules/payments/payments.repository';
import { PrismaService } from '../../../../src/core/prisma/prisma.service';
import { OutboxService } from '../../../../src/core/outbox/outbox.service';
import { createMockPrismaService } from '../../../helpers/prisma.mock';
import Decimal from 'decimal.js';

// Mock Repository
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

describe('Workflow 9: Payments & Refunds', () => {
  let service: PaymentsService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let outbox: { enqueue: jest.Mock; flushPending: jest.Mock };

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();
    prisma = createMockPrismaService();
    outbox = { enqueue: jest.fn(), flushPending: jest.fn() };

    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
    prisma.payment.aggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { amount: 0 } });
    prisma.payment.count = jest.fn().mockResolvedValue(0);
    prisma.refund.aggregate = jest
      .fn()
      .mockResolvedValue({ _sum: { amount: 0 } });
    prisma.paymentMethod.findFirst.mockResolvedValue({
      requiresReference: false,
      requiresTerminal: false,
    });
    prisma.salesOrder.findUnique.mockResolvedValue({
      id: 'order-1',
      grandTotal: new Decimal(100),
      status: 'CONFIRMED',
      sessionId: 'session-1',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
        { provide: 'IEventBus', useValue: eventBus },
        { provide: OutboxService, useValue: outbox },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 9.1: CASH PAYMENT ====================
  describe('9.1: Cash Payment', () => {
    it('should process cash payment with change', async () => {
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        paymentMethod: 'CASH',
        amount: 100,
        amountReceived: 150,
        changeGiven: 50,
        status: 'COMPLETED',
        paymentDate: new Date(),
      });

      const result = await service.createPayment({
        orderId: 'order-1',
        method: 'CASH',
        amount: 100,
        receivedAmount: 150,
        createdBy: 'cashier-1',
        sessionId: 'session-1',
      });

      expect(result.changeAmount).toBe(50);
      expect(result.status).toBe('COMPLETED');
      expect(outbox.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        'PaymentCreated',
        expect.anything(),
      );
    });

    it('should throw if cash received insufficient', async () => {
      await expect(
        service.createPayment({
          orderId: 'order-1',
          method: 'CASH',
          amount: 100,
          receivedAmount: 80,
          createdBy: 'cashier-1',
          sessionId: 'session-1',
        }),
      ).rejects.toThrow(BadRequestAppException);
    });
  });

  // ==================== 9.2: CARD PAYMENT ====================
  describe('9.2: Card Payment', () => {
    it('should process card payment', async () => {
      prisma.payment.create.mockResolvedValue({
        id: 'pay-1',
        paymentMethod: 'CARD',
        amount: 100,
        metadata: { cardLast4: '1234', cardType: 'VISA' },
        status: 'COMPLETED',
        paymentDate: new Date(),
      });

      const result = await service.createPayment({
        orderId: 'order-1',
        method: 'CARD',
        amount: 100,
        cardLast4: '1234',
        cardType: 'VISA',
        transactionId: 'tx-123',
        createdBy: 'cashier-1',
        sessionId: 'session-1',
      });

      expect(result.cardLast4).toBe('1234');
    });
  });

  // ==================== 9.3: SPLIT PAYMENT ====================
  describe('9.3: Split Payment', () => {
    it('should process split payment', async () => {
      prisma.payment.create
        .mockResolvedValueOnce({
          id: 'pay-1',
          paymentMethod: 'CASH',
          amount: 50,
          status: 'COMPLETED',
        })
        .mockResolvedValueOnce({
          id: 'pay-2',
          paymentMethod: 'CARD',
          amount: 50,
          status: 'COMPLETED',
        });

      const result = await service.processSplitPayment({
        orderId: 'order-1',
        sessionId: 'session-1',
        userId: 'cashier-1',
        payments: [
          { method: 'CASH', amount: 50, receivedAmount: 50 },
          { method: 'CARD', amount: 50 },
        ],
      });

      expect(result).toHaveLength(2);
      expect(outbox.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        'PaymentCompleted',
        expect.anything(),
      );
    });
  });

  // ==================== 9.4: REFUND CREATION ====================
  describe('9.4: Refund Creation', () => {
    it('should auto-approve small refunds (< 100 SAR)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        amount: 200,
      });
      prisma.refund.create.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        status: 'PENDING',
      });
      prisma.refund.findUnique.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        status: 'PENDING',
      });
      prisma.refund.update.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        status: 'APPROVED',
      });
      prisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        refundedAmount: 50,
        status: 'COMPLETED',
      });

      const result = await service.processRefund({
        paymentId: 'pay-1',
        amount: 50,
        reason: 'Customer request',
        userId: 'cashier-1',
      });

      expect(result.status).toBe('APPROVED');
    });

    it('should require approval for large refunds (>= 100 SAR)', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        amount: 500,
      });
      prisma.refund.create.mockResolvedValue({
        id: 'ref-1',
        amount: 200,
        status: 'PENDING',
      });

      const result = await service.processRefund({
        paymentId: 'pay-1',
        amount: 200,
        reason: 'Customer request',
        userId: 'cashier-1',
      });

      expect(result.status).toBe('PENDING');
    });

    it('should throw if refund exceeds payment', async () => {
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        amount: 100,
      });
      prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: 50 } });

      await expect(
        service.processRefund({
          paymentId: 'pay-1',
          amount: 100, // Only 50 refundable
          reason: 'Test',
          userId: 'cashier-1',
        }),
      ).rejects.toThrow(BadRequestAppException);
    });
  });

  // ==================== 9.5: REFUND APPROVAL ====================
  describe('9.5: Refund Approval', () => {
    it('should approve pending refund', async () => {
      prisma.refund.findUnique.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 200,
        status: 'PENDING',
      });
      prisma.refund.update.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 200,
        status: 'APPROVED',
      });
      prisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        amount: 500,
      });
      prisma.payment.update.mockResolvedValue({
        id: 'pay-1',
        refundedAmount: 200,
        status: 'COMPLETED',
      });

      const result = await service.approveRefund('ref-1', 'manager-1');

      expect(result.status).toBe('APPROVED');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'RefundProcessed',
        expect.anything(),
      );
    });

    it('should reject refund', async () => {
      repo.findRefundById.mockResolvedValue({
        id: 'ref-1',
        status: 'PENDING',
      });
      repo.updateRefund.mockResolvedValue({
        id: 'ref-1',
        status: 'REJECTED',
      });

      const result = await service.rejectRefund(
        'ref-1',
        'manager-1',
        'No valid reason',
      );

      expect(result.status).toBe('REJECTED');
    });
  });

  // ==================== 9.6: PAYMENT QUERIES ====================
  describe('9.6: Payment Queries', () => {
    it('should find payments by order', async () => {
      repo.findByOrder.mockResolvedValue([
        { id: 'pay-1', orderId: 'order-1' },
        { id: 'pay-2', orderId: 'order-1' },
      ]);

      const result = await service.findByOrder('order-1');

      expect(result).toHaveLength(2);
    });

    it('should get pending refunds', async () => {
      repo.findPendingRefunds.mockResolvedValue([
        { id: 'ref-1', status: 'PENDING' },
      ]);

      const result = await service.getPendingRefunds();

      expect(result).toHaveLength(1);
    });
  });
});
