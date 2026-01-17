/**
 * PaymentsService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 * 
 * Applied Error Fixing Workflow:
 * - Verified service methods from payments.service.ts
 * - Verified repository methods from payments.repository.ts
 * - Verified DTOs from dto/index.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsRepository } from './payments.repository';
import Decimal from 'decimal.js';

// Mock Repository - methods from payments.repository.ts
function createMockRepository() {
    return {
        // BaseRepository methods
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        // Payment methods
        findWithRefunds: jest.fn(),
        findByOrder: jest.fn(),
        findByTransaction: jest.fn(),
        findBySession: jest.fn(),
        findByStatus: jest.fn(),
        // Payment Method methods
        findAllMethods: jest.fn(),
        findMethodById: jest.fn(),
        createMethod: jest.fn(),
        updateMethod: jest.fn(),
        // Refund methods
        findRefundById: jest.fn(),
        findRefundsByPayment: jest.fn(),
        findPendingRefunds: jest.fn(),
        createRefund: jest.fn(),
        updateRefund: jest.fn(),
        // Statistics
        getDailyPaymentTotal: jest.fn(),
        getPaymentsByMethod: jest.fn(),
    };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
    return {
        publish: jest.fn(),
        subscribe: jest.fn(),
    };
}

describe('PaymentsService', () => {
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

    // ==================== SINGLE PAYMENT TESTS (BR-002) ====================

    describe('createPayment', () => {
        it('should create cash payment with change calculation', async () => {
            const dto = {
                orderId: 'order-1',
                method: 'CASH' as const,
                amount: 75.00,
                receivedAmount: 100.00,
                createdBy: 'user-1',
            };

            const mockPayment = {
                id: 'payment-1',
                orderId: dto.orderId,
                method: 'CASH',
                amount: 75.00,
                receivedAmount: 100.00,
                changeAmount: 25.00,
                status: 'COMPLETED',
            };

            repo.create.mockResolvedValue(mockPayment);

            const result = await service.createPayment(dto);

            expect(result.amount).toBe(75.00);
            expect(result.changeAmount).toBe(25.00);
            expect(eventBus.publish).toHaveBeenCalledWith('PaymentCreated', expect.anything());
        });

        it('should throw error for insufficient cash', async () => {
            const dto = {
                orderId: 'order-1',
                method: 'CASH' as const,
                amount: 100.00,
                receivedAmount: 50.00,
                createdBy: 'user-1',
            };

            await expect(service.createPayment(dto))
                .rejects.toThrow(BadRequestException);
        });

        it('should create card payment', async () => {
            const dto = {
                orderId: 'order-1',
                method: 'CARD' as const,
                amount: 150.00,
                cardLast4: '4242',
                cardType: 'VISA',
                transactionId: 'txn-123',
                createdBy: 'user-1',
            };

            const mockPayment = {
                id: 'payment-2',
                ...dto,
                status: 'COMPLETED',
                changeAmount: 0,
            };

            repo.create.mockResolvedValue(mockPayment);

            const result = await service.createPayment(dto);

            expect(result.cardLast4).toBe('4242');
            expect(result.status).toBe('COMPLETED');
        });
    });

    // ==================== SPLIT PAYMENT TESTS ====================

    describe('processSplitPayment', () => {
        it('should process split payment with multiple methods', async () => {
            const dto = {
                orderId: 'order-1',
                payments: [
                    { method: 'CASH' as const, amount: 50.00, receivedAmount: 50.00 },
                    { method: 'CARD' as const, amount: 100.00, cardLast4: '1234' },
                ],
                userId: 'user-1',
            };

            repo.create
                .mockResolvedValueOnce({ id: 'pay-1', amount: 50, method: 'CASH' })
                .mockResolvedValueOnce({ id: 'pay-2', amount: 100, method: 'CARD' });

            const result = await service.processSplitPayment(dto);

            expect(result).toHaveLength(2);
            expect(repo.create).toHaveBeenCalledTimes(2);
            expect(eventBus.publish).toHaveBeenCalledWith('PaymentCompleted', expect.anything());
        });
    });

    // ==================== REFUND TESTS (BR-002) ====================

    describe('processRefund', () => {
        it('should create pending refund for large amount', async () => {
            const mockPayment = {
                id: 'payment-1',
                amount: 500.00,
                refundedAmount: 0,
            };

            const mockRefund = {
                id: 'refund-1',
                paymentId: 'payment-1',
                amount: 200.00,
                status: 'PENDING',
            };

            repo.findById.mockResolvedValue(mockPayment);
            repo.createRefund.mockResolvedValue(mockRefund);

            const result = await service.processRefund({
                paymentId: 'payment-1',
                amount: 200.00,
                reason: 'Customer request',
                userId: 'user-1',
            });

            expect(result.status).toBe('PENDING');
            expect(eventBus.publish).toHaveBeenCalledWith('RefundCreated', expect.anything());
        });

        it('should auto-approve small refund (under threshold)', async () => {
            const mockPayment = {
                id: 'payment-1',
                amount: 500.00,
                refundedAmount: 0,
            };

            const mockRefund = {
                id: 'refund-1',
                paymentId: 'payment-1',
                amount: 50.00,
                status: 'PENDING',
            };

            const approvedRefund = { ...mockRefund, status: 'APPROVED' };

            repo.findById.mockResolvedValue(mockPayment);
            repo.createRefund.mockResolvedValue(mockRefund);
            repo.findRefundById.mockResolvedValue(mockRefund);
            repo.updateRefund.mockResolvedValue(approvedRefund);
            repo.update.mockResolvedValue({});

            const result = await service.processRefund({
                paymentId: 'payment-1',
                amount: 50.00, // Under 100 threshold
                reason: 'Small refund test',
                userId: 'user-1',
            });

            expect(result.status).toBe('APPROVED');
        });

        it('should throw error if refund exceeds payment amount', async () => {
            const mockPayment = {
                id: 'payment-1',
                amount: 100.00,
                refundedAmount: 50.00,
            };

            repo.findById.mockResolvedValue(mockPayment);

            await expect(
                service.processRefund({
                    paymentId: 'payment-1',
                    amount: 75.00, // 50 already refunded + 75 = 125 > 100
                    reason: 'Excessive refund',
                    userId: 'user-1',
                })
            ).rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException for non-existent payment', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(
                service.processRefund({
                    paymentId: 'non-existent',
                    amount: 50.00,
                    reason: 'Test',
                    userId: 'user-1',
                })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('approveRefund', () => {
        it('should approve pending refund', async () => {
            const mockRefund = {
                id: 'refund-1',
                paymentId: 'payment-1',
                amount: 100.00,
                status: 'PENDING',
            };

            const mockPayment = {
                id: 'payment-1',
                amount: 500.00,
                refundedAmount: 0,
            };

            repo.findRefundById.mockResolvedValue(mockRefund);
            repo.updateRefund.mockResolvedValue({ ...mockRefund, status: 'APPROVED' });
            repo.findById.mockResolvedValue(mockPayment);
            repo.update.mockResolvedValue({});

            const result = await service.approveRefund('refund-1', 'manager-1');

            expect(result.status).toBe('APPROVED');
            expect(eventBus.publish).toHaveBeenCalledWith('RefundProcessed', expect.anything());
        });

        it('should throw error for non-pending refund', async () => {
            const mockRefund = {
                id: 'refund-1',
                status: 'APPROVED', // Already approved
            };

            repo.findRefundById.mockResolvedValue(mockRefund);

            await expect(service.approveRefund('refund-1', 'manager-1'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('rejectRefund', () => {
        it('should reject refund with reason', async () => {
            const mockRefund = {
                id: 'refund-1',
                status: 'PENDING',
            };

            repo.findRefundById.mockResolvedValue(mockRefund);
            repo.updateRefund.mockResolvedValue({ ...mockRefund, status: 'REJECTED' });

            const result = await service.rejectRefund('refund-1', 'manager-1', 'Policy violation');

            expect(result.status).toBe('REJECTED');
        });
    });

    // ==================== QUERY TESTS ====================

    describe('findPaymentById', () => {
        it('should return payment', async () => {
            const mockPayment = { id: 'payment-1', amount: 100 };
            repo.findById.mockResolvedValue(mockPayment);

            const result = await service.findPaymentById('payment-1');

            expect(result.id).toBe('payment-1');
        });

        it('should throw NotFoundException if not found', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(service.findPaymentById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findByOrder', () => {
        it('should return payments for order', async () => {
            const payments = [{ id: 'pay-1' }, { id: 'pay-2' }];
            repo.findByOrder.mockResolvedValue(payments);

            const result = await service.findByOrder('order-1');

            expect(result).toHaveLength(2);
        });
    });

    // ==================== PAYMENT METHOD TESTS ====================

    describe('getAllPaymentMethods', () => {
        it('should return active payment methods', async () => {
            const methods = [
                { id: 'method-1', nameEn: 'Cash', nameAr: 'نقدي', type: 'CASH' },
                { id: 'method-2', nameEn: 'Card', nameAr: 'بطاقة', type: 'CARD' },
            ];
            repo.findAllMethods.mockResolvedValue(methods);

            const result = await service.getAllPaymentMethods();

            expect(result).toHaveLength(2);
        });
    });

    describe('createPaymentMethod', () => {
        it('should create payment method', async () => {
            const dto = {
                name: 'Apple Pay',
                nameAr: 'آبل باي',
                type: 'WALLET' as const,
            };

            repo.createMethod.mockResolvedValue({ id: 'method-3', nameEn: dto.name, nameAr: dto.nameAr, type: dto.type });

            const result = await service.createPaymentMethod(dto);

            expect(result.nameEn).toBe('Apple Pay');
        });
    });
});
