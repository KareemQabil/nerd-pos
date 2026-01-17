/**
 * Workflow 8: Customer & Loyalty
 * 
 * Source: WORKFLOWS.md - Customer Workflows
 * Pattern: Copied from existing customers.service.spec.ts (Phase 2)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from '../../../../src/modules/customers/customers.service';
import { CustomersRepository } from '../../../../src/modules/customers/customers.repository';

// Mock Repository - ALL methods from customers.repository.ts
function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findByPhone: jest.fn(),
        findByCode: jest.fn(),
        findWithTier: jest.fn(),
        findActive: jest.fn(),
        search: jest.fn(),
        countByPrefix: jest.fn(),
        findAddressesByCustomer: jest.fn(),
        addAddress: jest.fn(),
        updateAddress: jest.fn(),
        deleteAddress: jest.fn(),
        findAllTiers: jest.fn(),
        findTierById: jest.fn(),
        createTier: jest.fn(),
        updateTier: jest.fn(),
        getTopCustomers: jest.fn(),
        getCustomersByTier: jest.fn(),
    };
}

function createMockEventBus() {
    return { publish: jest.fn(), subscribe: jest.fn() };
}

describe('Workflow 8: Customer & Loyalty', () => {
    let service: CustomersService;
    let repo: ReturnType<typeof createMockRepository>;
    let eventBus: ReturnType<typeof createMockEventBus>;

    beforeEach(async () => {
        repo = createMockRepository();
        eventBus = createMockEventBus();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CustomersService,
                { provide: CustomersRepository, useValue: repo },
                { provide: 'IEventBus', useValue: eventBus },
            ],
        }).compile();

        service = module.get<CustomersService>(CustomersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==================== 8.1: CUSTOMER CREATION ====================
    describe('8.1: Customer Creation', () => {
        it('should create customer with generated code', async () => {
            const dto = {
                name: 'Ahmed Al-Rashid',
                nameAr: 'أحمد الرشيد',
                phone: '+966501234567',
                email: 'ahmed@example.com',
                preferredLanguage: 'ar' as const,
            };

            const mockCustomer = {
                id: 'cust-1',
                code: 'CUS2026010001',
                name: dto.name,
                phone: dto.phone,
            };

            repo.findByPhone.mockResolvedValue(null);
            repo.countByPrefix.mockResolvedValue(0);
            repo.create.mockResolvedValue(mockCustomer);

            const result = await service.create(dto);

            expect(result.code).toMatch(/^CUS/);
            expect(eventBus.publish).toHaveBeenCalledWith('CustomerCreated', expect.anything());
        });
    });

    // ==================== 8.2: CUSTOMER QUERIES ====================
    describe('8.2: Customer Queries', () => {
        it('should find customer by ID', async () => {
            repo.findById.mockResolvedValue({ id: 'cust-1', name: 'Test' });

            const result = await service.findById('cust-1');

            expect(result.id).toBe('cust-1');
        });

        it('should throw NotFoundException for missing customer', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
        });

        it('should find customer by phone', async () => {
            repo.findByPhone.mockResolvedValue({ id: 'cust-1', phone: '+966501234567' });

            const result = await service.findByPhone('+966501234567');

            expect(result?.phone).toBe('+966501234567');
        });

        it('should search customers', async () => {
            repo.search.mockResolvedValue([{ id: 'cust-1', name: 'Ahmed' }]);

            const result = await service.search('Ahmed');

            expect(result).toHaveLength(1);
        });
    });

    // ==================== 8.3: CUSTOMER WITH TIER ====================
    describe('8.3: Customer with Tier', () => {
        it('should find customer with tier info', async () => {
            repo.findWithTier.mockResolvedValue({
                id: 'cust-1',
                name: 'VIP Customer',
                tier: { id: 'tier-gold', name: 'Gold' },
            });

            const result = await service.findWithTier('cust-1');

            expect(result.tier).toBeDefined();
        });
    });

    // ==================== 8.4: TIER MANAGEMENT ====================
    describe('8.4: Tier Management', () => {
        it('should get all tiers', async () => {
            repo.findAllTiers.mockResolvedValue([
                { id: 'bronze', name: 'Bronze' },
                { id: 'silver', name: 'Silver' },
                { id: 'gold', name: 'Gold' },
            ]);

            const result = await service.getAllTiers();

            expect(result).toHaveLength(3);
        });

        it('should create tier', async () => {
            repo.createTier.mockResolvedValue({
                id: 'platinum',
                name: 'Platinum',
                minSpent: 5000,
            });

            const result = await service.createTier({
                name: 'Platinum',
                nameAr: 'بلاتيني',
                minSpent: 5000,
                minOrders: 10,
                pointsMultiplier: 2.0,
                discountPercent: 15,
                color: '#FFD700',
                displayOrder: 4,
            });

            expect(result.name).toBe('Platinum');
        });
    });

    // ==================== 8.5: ADDRESS MANAGEMENT ====================
    describe('8.5: Address Management', () => {
        it('should get customer addresses', async () => {
            repo.findAddressesByCustomer.mockResolvedValue([
                { id: 'addr-1', label: 'Home' },
                { id: 'addr-2', label: 'Work' },
            ]);

            const result = await service.getAddresses('cust-1');

            expect(result).toHaveLength(2);
        });
    });
});
