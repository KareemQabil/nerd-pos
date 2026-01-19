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
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../../../src/modules/payments/payments.service';
import { PaymentsRepository } from '../../../../src/modules/payments/payments.repository';
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

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PaymentsRepository, useValue: repo },
        { provide: 'IEventBus', useValue: eventBus },
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
      repo.create.mockResolvedValue({
        id: 'pay-1',
        method: 'CASH',
        amount: 100,
        receivedAmount: 150,
        changeAmount: 50,
        status: 'COMPLETED',
      });

      const result = await service.createPayment({
        orderId: 'order-1',
        method: 'CASH',
        amount: 100,
        receivedAmount: 150,
        createdBy: 'cashier-1',
      });

      expect(result.changeAmount).toBe(50);
      expect(result.status).toBe('COMPLETED');
      expect(eventBus.publish).toHaveBeenCalledWith(
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
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== 9.2: CARD PAYMENT ====================
  describe('9.2: Card Payment', () => {
    it('should process card payment', async () => {
      repo.create.mockResolvedValue({
        id: 'pay-1',
        method: 'CARD',
        amount: 100,
        cardLast4: '1234',
        cardType: 'VISA',
        status: 'COMPLETED',
      });

      const result = await service.createPayment({
        orderId: 'order-1',
        method: 'CARD',
        amount: 100,
        cardLast4: '1234',
        cardType: 'VISA',
        transactionId: 'tx-123',
        createdBy: 'cashier-1',
      });

      expect(result.cardLast4).toBe('1234');
    });
  });

  // ==================== 9.3: SPLIT PAYMENT ====================
  describe('9.3: Split Payment', () => {
    it('should process split payment', async () => {
      repo.create
        .mockResolvedValueOnce({
          id: 'pay-1',
          method: 'CASH',
          amount: 50,
          status: 'COMPLETED',
        })
        .mockResolvedValueOnce({
          id: 'pay-2',
          method: 'CARD',
          amount: 50,
          status: 'COMPLETED',
        });

      const result = await service.processSplitPayment({
        orderId: 'order-1',
        userId: 'cashier-1',
        payments: [
          { method: 'CASH', amount: 50, receivedAmount: 50 },
          { method: 'CARD', amount: 50 },
        ],
      });

      expect(result).toHaveLength(2);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'PaymentCompleted',
        expect.anything(),
      );
    });
  });

  // ==================== 9.4: REFUND CREATION ====================
  describe('9.4: Refund Creation', () => {
    it('should auto-approve small refunds (< 100 SAR)', async () => {
      repo.findById
        .mockResolvedValueOnce({ id: 'pay-1', amount: 200, refundedAmount: 0 }) // Initial
        .mockResolvedValueOnce({ id: 'pay-1', amount: 200, refundedAmount: 0 }); // After approve call

      repo.createRefund.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        status: 'PENDING',
      });
      repo.findRefundById.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 50,
        status: 'PENDING',
      });
      repo.updateRefund.mockResolvedValue({
        id: 'ref-1',
        status: 'APPROVED',
      });
      repo.update.mockResolvedValue({});

      const result = await service.processRefund({
        paymentId: 'pay-1',
        amount: 50,
        reason: 'Customer request',
        userId: 'cashier-1',
      });

      expect(result.status).toBe('APPROVED');
    });

    it('should require approval for large refunds (>= 100 SAR)', async () => {
      repo.findById.mockResolvedValue({
        id: 'pay-1',
        amount: 500,
        refundedAmount: 0,
      });
      repo.createRefund.mockResolvedValue({
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
      repo.findById.mockResolvedValue({
        id: 'pay-1',
        amount: 100,
        refundedAmount: 50,
      });

      await expect(
        service.processRefund({
          paymentId: 'pay-1',
          amount: 100, // Only 50 refundable
          reason: 'Test',
          userId: 'cashier-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== 9.5: REFUND APPROVAL ====================
  describe('9.5: Refund Approval', () => {
    it('should approve pending refund', async () => {
      repo.findRefundById.mockResolvedValue({
        id: 'ref-1',
        paymentId: 'pay-1',
        amount: 200,
        status: 'PENDING',
      });
      repo.updateRefund.mockResolvedValue({
        id: 'ref-1',
        status: 'APPROVED',
      });
      repo.findById.mockResolvedValue({
        id: 'pay-1',
        amount: 500,
        refundedAmount: 0,
      });
      repo.update.mockResolvedValue({});

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
