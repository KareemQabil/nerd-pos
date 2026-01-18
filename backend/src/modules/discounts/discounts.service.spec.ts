/**
 * Discounts Service Unit Tests
 * 
 * Tests for discount management including CRUD, validation, and application.
 * Uses repository pattern with Decimal.js for calculations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsRepository } from './discounts.repository';
import Decimal from 'decimal.js';

function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findByCode: jest.fn(),
        update: jest.fn(),
        findActive: jest.fn(),
        createUsage: jest.fn(),
        incrementUsage: jest.fn(),
        getUsageCount: jest.fn(),
        findByCustomer: jest.fn(),
    };
}

function createMockEventBus() {
    return { publish: jest.fn(), subscribe: jest.fn() };
}

const mockDiscount = {
    id: 'discount-1',
    code: 'SAVE10',
    name: '10% Off',
    type: 'PERCENTAGE',
    value: 10,
    minOrderAmount: 50,
    maxDiscountAmount: 100,
    usedCount: 0,
    usageLimit: 100,
    isActive: true,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-12-31'),
    applicableOn: 'ORDER',
    requiresApproval: false,
};

describe('DiscountsService', () => {
    let service: DiscountsService;
    let repo: ReturnType<typeof createMockRepository>;
    let eventBus: ReturnType<typeof createMockEventBus>;

    beforeEach(async () => {
        repo = createMockRepository();
        eventBus = createMockEventBus();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DiscountsService,
                { provide: DiscountsRepository, useValue: repo },
                { provide: 'IEventBus', useValue: eventBus },
            ],
        }).compile();

        service = module.get<DiscountsService>(DiscountsService);
    });

    afterEach(() => jest.clearAllMocks());

    // ==================== CREATE ====================
    describe('create', () => {
        it('should create discount and publish event', async () => {
            repo.create.mockResolvedValue(mockDiscount);

            const result = await service.create({
                code: 'SAVE10',
                name: '10% Off',
                nameAr: 'خصم 10%',
                type: 'PERCENTAGE',
                value: 10,
                createdBy: 'user-1',
            });

            expect(result.code).toBe('SAVE10');
            expect(eventBus.publish).toHaveBeenCalledWith('DiscountCreated', expect.anything());
        });

        it('should set defaults for optional fields', async () => {
            repo.create.mockImplementation((data) => Promise.resolve({ id: 'new', ...data }));

            await service.create({
                code: 'NEW10',
                name: 'New Discount',
                nameAr: 'خصم جديد',
                type: 'FIXED_AMOUNT',
                value: 10,
                createdBy: 'user-1',
            });

            expect(repo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    applicableOn: 'ORDER',
                    isCorporate: false,
                    requiresApproval: false,
                    usedCount: 0,
                    isActive: true,
                }),
            );
        });
    });

    // ==================== FIND BY ID ====================
    describe('findById', () => {
        it('should return discount by ID', async () => {
            repo.findById.mockResolvedValue(mockDiscount);

            const result = await service.findById('discount-1');

            expect(result.code).toBe('SAVE10');
        });

        it('should throw NotFoundException if not found', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(service.findById('nonexistent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== FIND BY CODE ====================
    describe('findByCode', () => {
        it('should return discount by code', async () => {
            repo.findByCode.mockResolvedValue(mockDiscount);

            const result = await service.findByCode('SAVE10');

            expect(result?.id).toBe('discount-1');
        });

        it('should return null if not found', async () => {
            repo.findByCode.mockResolvedValue(null);

            const result = await service.findByCode('INVALID');

            expect(result).toBeNull();
        });
    });

    // ==================== GET ACTIVE DISCOUNTS ====================
    describe('getActiveDiscounts', () => {
        it('should return all active discounts', async () => {
            repo.findActive.mockResolvedValue([mockDiscount, { ...mockDiscount, id: '2', code: 'SAVE20' }]);

            const result = await service.getActiveDiscounts();

            expect(result).toHaveLength(2);
        });
    });

    // ==================== VALIDATE AND CALCULATE ====================
    describe('validateAndCalculate', () => {
        it('should return invalid for non-existent code', async () => {
            repo.findByCode.mockResolvedValue(null);

            const result = await service.validateAndCalculate('INVALID', 100);

            expect(result.valid).toBe(false);
            expect(result.message).toContain('not found');
        });

        it('should return invalid for inactive discount', async () => {
            repo.findByCode.mockResolvedValue({ ...mockDiscount, isActive: false });

            const result = await service.validateAndCalculate('SAVE10', 100);

            expect(result.valid).toBe(false);
        });

        it('should calculate percentage discount using Decimal.js', async () => {
            repo.findByCode.mockResolvedValue(mockDiscount);

            const result = await service.validateAndCalculate('SAVE10', 100);

            expect(result.valid).toBe(true);
            expect(result.amount).toBe(10); // 10% of 100
        });

        it('should respect minimum order amount', async () => {
            repo.findByCode.mockResolvedValue({ ...mockDiscount, minOrderAmount: 100 });

            const result = await service.validateAndCalculate('SAVE10', 50);

            expect(result.valid).toBe(false);
            expect(result.message).toContain('minimum');
        });

        it('should cap discount at maxDiscountAmount', async () => {
            repo.findByCode.mockResolvedValue({ ...mockDiscount, maxDiscountAmount: 5 });

            const result = await service.validateAndCalculate('SAVE10', 100);

            expect(result.amount).toBe(5); // Capped at max
        });

        it('should validate time-based restrictions', async () => {
            const expiredDiscount = {
                ...mockDiscount,
                startDate: new Date('2020-01-01'),
                endDate: new Date('2020-12-31'),
            };
            repo.findByCode.mockResolvedValue(expiredDiscount);

            const result = await service.validateAndCalculate('SAVE10', 100);

            expect(result.valid).toBe(false);
            expect(result.message).toContain('time');
        });
    });

    // ==================== APPLY DISCOUNT ====================
    describe('applyDiscount', () => {
        it('should record usage and publish event', async () => {
            const usage = { id: 'usage-1', discountId: 'discount-1', orderId: 'order-1' };
            repo.createUsage.mockResolvedValue(usage);
            repo.getUsageCount.mockResolvedValue(1);
            repo.findById.mockResolvedValue(mockDiscount);

            const result = await service.applyDiscount({
                discountId: 'discount-1',
                orderId: 'order-1',
                amount: 10,
                orderTotal: 100,
                userId: 'user-1',
            });

            expect(result.discountId).toBe('discount-1');
            expect(eventBus.publish).toHaveBeenCalledWith('DiscountApplied', expect.anything());
        });
    });
});
