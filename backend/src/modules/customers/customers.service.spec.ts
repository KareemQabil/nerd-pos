/**
 * CustomersService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 * 
 * Applied Error Fixing Workflow:
 * - Verified service methods from customers.service.ts (272 lines)
 * - Verified repository methods from customers.repository.ts (142 lines)
 * - Verified DTOs from dto/index.ts (130 lines)
 * - BRD Coverage: BR-004 (Loyalty points, tier multipliers)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersRepository } from './customers.repository';
import Decimal from 'decimal.js';

// Mock Repository - ALL methods from customers.repository.ts
function createMockRepository() {
    return {
        // BaseRepository methods
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        // Customer methods
        findByPhone: jest.fn(),
        findByCode: jest.fn(),
        findWithTier: jest.fn(),
        findActive: jest.fn(),
        search: jest.fn(),
        countByPrefix: jest.fn(),
        // Address methods
        findAddressesByCustomer: jest.fn(),
        addAddress: jest.fn(),
        updateAddress: jest.fn(),
        deleteAddress: jest.fn(),
        // Tier methods
        findAllTiers: jest.fn(),
        findTierById: jest.fn(),
        createTier: jest.fn(),
        updateTier: jest.fn(),
        getTopCustomers: jest.fn(),
        getCustomersByTier: jest.fn(),
    };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
    return {
        publish: jest.fn(),
        subscribe: jest.fn(),
    };
}

describe('CustomersService', () => {
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

    // ==================== CREATE CUSTOMER TESTS ====================

    describe('create', () => {
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
                nameEn: dto.name, // Service uses nameEn for event
                nameAr: dto.nameAr,
                phone: dto.phone,
                email: dto.email,
                preferredLanguage: dto.preferredLanguage,
                loyaltyPoints: 0,
                totalSpent: 0,
                orderCount: 0,
            };

            repo.findByPhone.mockResolvedValue(null); // No duplicate
            repo.countByPrefix.mockResolvedValue(0);
            repo.create.mockResolvedValue(mockCustomer);

            const result = await service.create(dto);

            expect(result.code).toMatch(/^CUS/);
            expect(result.name).toBe('Ahmed Al-Rashid');
            expect(eventBus.publish).toHaveBeenCalledWith('CustomerCreated', expect.anything());
        });
    });

    // ==================== QUERY TESTS ====================

    describe('findById', () => {
        it('should return customer', async () => {
            const customer = { id: 'cust-1', name: 'Test' };
            repo.findById.mockResolvedValue(customer);

            const result = await service.findById('cust-1');

            expect(result.id).toBe('cust-1');
        });

        it('should throw NotFoundException', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(service.findById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findByPhone', () => {
        it('should return customer by phone', async () => {
            const customer = { id: 'cust-1', phone: '+966501234567' };
            repo.findByPhone.mockResolvedValue(customer);

            const result = await service.findByPhone('+966501234567');

            expect(result?.phone).toBe('+966501234567');
        });

        it('should return null if not found', async () => {
            repo.findByPhone.mockResolvedValue(null);

            const result = await service.findByPhone('+966509999999');

            expect(result).toBeNull();
        });
    });

    describe('findWithTier', () => {
        it('should return customer with tier info', async () => {
            const customer = {
                id: 'cust-1',
                name: 'VIP Customer',
                tier: {
                    id: 'tier-gold',
                    name: 'Gold',
                    pointsMultiplier: 1.5,
                },
            };
            repo.findWithTier.mockResolvedValue(customer);

            const result = await service.findWithTier('cust-1');

            expect(result.tier?.name).toBe('Gold');
        });
    });

    describe('search', () => {
        it('should search by name or phone', async () => {
            const customers = [
                { id: 'cust-1', name: 'Ahmed' },
                { id: 'cust-2', name: 'Ahmad' },
            ];
            repo.search.mockResolvedValue(customers);

            const result = await service.search('Ahm');

            expect(result).toHaveLength(2);
        });
    });

    // ==================== LOYALTY POINTS TESTS (BR-004) ====================

    describe('addLoyaltyPoints', () => {
        it('should add points with tier multiplier', async () => {
            const customer = {
                id: 'cust-1',
                loyaltyPoints: 100,
                totalSpent: 500,
                orderCount: 5,
                tier: {
                    id: 'tier-gold',
                    pointsMultiplier: 1.5,
                },
            };

            repo.findWithTier.mockResolvedValue(customer);
            repo.findById.mockResolvedValue(customer); // for checkTierUpgrade
            repo.update.mockResolvedValue({});
            repo.findAllTiers.mockResolvedValue([]);

            // Add 100 SAR order → 100 * 1.5 = 150 points
            await service.addLoyaltyPoints('cust-1', 100, 'order-1');

            expect(repo.update).toHaveBeenCalledWith('cust-1', expect.objectContaining({
                loyaltyPoints: 250, // 100 existing + 150 new
            }));
            expect(eventBus.publish).toHaveBeenCalledWith('LoyaltyPointsAdded', expect.anything());
        });

        it('should add points without tier (1x multiplier)', async () => {
            const customer = {
                id: 'cust-1',
                loyaltyPoints: 0,
                tier: null,
            };

            repo.findWithTier.mockResolvedValue(customer);
            repo.findById.mockResolvedValue(customer); // for checkTierUpgrade
            repo.update.mockResolvedValue({});
            repo.findAllTiers.mockResolvedValue([]);

            await service.addLoyaltyPoints('cust-1', 100, 'order-1');

            expect(repo.update).toHaveBeenCalledWith('cust-1', expect.objectContaining({
                loyaltyPoints: 100, // 100 * 1.0
            }));
        });
    });

    describe('redeemPoints', () => {
        it('should redeem points and return discount (BR-004)', async () => {
            const customer = {
                id: 'cust-1',
                loyaltyPoints: 1000,
            };

            repo.findById.mockResolvedValue(customer);
            repo.update.mockResolvedValue({});

            // Redeem 500 points → 500 * 0.01 = 5 SAR discount
            const discount = await service.redeemPoints('cust-1', 500);

            expect(discount).toBe(5);
            expect(repo.update).toHaveBeenCalledWith('cust-1', expect.objectContaining({
                loyaltyPoints: 500, // 1000 - 500
            }));
            expect(eventBus.publish).toHaveBeenCalledWith('LoyaltyPointsRedeemed', expect.anything());
        });

        it('should throw error for insufficient points', async () => {
            const customer = {
                id: 'cust-1',
                loyaltyPoints: 100,
            };

            repo.findById.mockResolvedValue(customer);

            await expect(service.redeemPoints('cust-1', 500))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw NotFoundException for non-existent customer', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(service.redeemPoints('non-existent', 100))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== TIER UPGRADE TESTS ====================

    describe('updateStats', () => {
        it('should update totalSpent and visitsCount', async () => {
            const customer = {
                id: 'cust-1',
                totalSpent: 500,
                visitsCount: 5,
            };

            repo.findById.mockResolvedValue(customer);
            repo.update.mockResolvedValue({});
            repo.findAllTiers.mockResolvedValue([]);

            await service.updateStats('cust-1', 150);

            expect(repo.update).toHaveBeenCalledWith('cust-1', expect.objectContaining({
                totalSpent: 650, // 500 + 150
                visitsCount: 6,   // 5 + 1
            }));
        });
    });

    describe('checkTierUpgrade', () => {
        it('should upgrade tier when conditions met', async () => {
            const customer = {
                id: 'cust-1',
                tierId: null,
                totalSpent: 5000,
                loyaltyPoints: 100,
                visitsCount: 20, // Service uses visitsCount for tier qualification
            };

            const tiers = [
                { id: 'tier-silver', name: 'Silver', minSpent: 1000, minOrders: 5 },
                { id: 'tier-gold', name: 'Gold', minSpent: 3000, minOrders: 15 },
            ];

            repo.findById.mockResolvedValue(customer); // for checkTierUpgrade calls
            repo.findWithTier.mockResolvedValue(customer); // for addLoyaltyPoints
            repo.findAllTiers.mockResolvedValue(tiers);
            repo.update.mockResolvedValue({});

            // Trigger via addLoyaltyPoints (which calls checkTierUpgrade)
            await service.addLoyaltyPoints('cust-1', 100, 'order-1');

            // Should upgrade to Gold (highest qualifying)
            expect(repo.update).toHaveBeenCalledWith('cust-1', expect.objectContaining({
                tierId: 'tier-gold',
            }));
            expect(eventBus.publish).toHaveBeenCalledWith('TierUpgraded', expect.anything());
        });
    });

    // ==================== ADDRESS TESTS ====================

    describe('addAddress', () => {
        it('should create delivery address', async () => {
            const dto = {
                customerId: 'cust-1',
                label: 'Home',
                street: 'King Fahd Road',
                city: 'Riyadh',
                district: 'Al Olaya',
                isDefault: true,
            };

            const mockAddress = {
                id: 'addr-1',
                ...dto,
            };

            repo.addAddress.mockResolvedValue(mockAddress);

            const result = await service.addAddress(dto);

            expect(result.label).toBe('Home');
            expect(result.isDefault).toBe(true);
        });
    });

    describe('getAddresses', () => {
        it('should return customer addresses', async () => {
            const addresses = [
                { id: 'addr-1', label: 'Home' },
                { id: 'addr-2', label: 'Office' },
            ];
            repo.findAddressesByCustomer.mockResolvedValue(addresses);

            const result = await service.getAddresses('cust-1');

            expect(result).toHaveLength(2);
        });
    });

    // ==================== LOYALTY TIER TESTS ====================

    describe('getAllTiers', () => {
        it('should return active loyalty tiers', async () => {
            const tiers = [
                { id: 'tier-silver', name: 'Silver' },
                { id: 'tier-gold', name: 'Gold' },
            ];
            repo.findAllTiers.mockResolvedValue(tiers);

            const result = await service.getAllTiers();

            expect(result).toHaveLength(2);
        });
    });

    describe('createTier', () => {
        it('should create loyalty tier', async () => {
            const dto = {
                name: 'Platinum',
                nameAr: 'بلاتينيوم',
                minSpent: 10000,
                minOrders: 50,
                pointsMultiplier: 2.0,
                discountPercent: 10,
                color: '#E5E4E2',
                displayOrder: 3,
            };

            const mockTier = { id: 'tier-platinum', ...dto };
            repo.createTier.mockResolvedValue(mockTier);

            const result = await service.createTier(dto);

            expect(result.name).toBe('Platinum');
            expect(result.pointsMultiplier).toBe(2.0);
        });
    });
});
