/**
 * SalesService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 * 
 * Applied Error Fixing Workflow:
 * - Verified SalesService constructor (7 calculation steps)
 * - Verified SalesRepository methods from sales.repository.ts
 * - Verified DTOs from dto/index.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesRepository } from './sales.repository';
import Decimal from 'decimal.js';

// Import calculation step classes (must mock all 7)
import {
    ItemSubtotalStep,
    ServiceChargeStep,
    DeliveryChargeStep,
    SubtotalBeforeTaxStep,
    TaxStep,
    DiscountStep,
    GrandTotalStep,
} from './calculation-steps';

// Mock Repository - methods from sales.repository.ts
function createMockRepository() {
    return {
        // BaseRepository methods
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        // Order methods
        findWithItems: jest.fn(),
        findByOrderNumber: jest.fn(),
        findBySession: jest.fn(),
        findByCustomer: jest.fn(),
        findByStatus: jest.fn(),
        findByDateRange: jest.fn(),
        countByPrefix: jest.fn(),
        createWithItems: jest.fn(),
        // Order item methods
        addItem: jest.fn(),
        updateItem: jest.fn(),
        removeItem: jest.fn(),
        getOrderItems: jest.fn(),
        // Statistics
        getDailySalesTotal: jest.fn(),
        getDailyOrderCount: jest.fn(),
    };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
    return {
        publish: jest.fn(),
        subscribe: jest.fn(),
    };
}

// Mock Calculation Step
function createMockStep() {
    return {
        execute: jest.fn((ctx) => Promise.resolve(ctx)),
    };
}

describe('SalesService', () => {
    let service: SalesService;
    let repo: ReturnType<typeof createMockRepository>;
    let eventBus: ReturnType<typeof createMockEventBus>;

    beforeEach(async () => {
        repo = createMockRepository();
        eventBus = createMockEventBus();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SalesService,
                { provide: SalesRepository, useValue: repo },
                { provide: 'IEventBus', useValue: eventBus },
                { provide: ItemSubtotalStep, useValue: createMockStep() },
                { provide: ServiceChargeStep, useValue: createMockStep() },
                { provide: DeliveryChargeStep, useValue: createMockStep() },
                { provide: SubtotalBeforeTaxStep, useValue: createMockStep() },
                { provide: TaxStep, useValue: createMockStep() },
                { provide: DiscountStep, useValue: createMockStep() },
                { provide: GrandTotalStep, useValue: createMockStep() },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==================== ORDER CREATION TESTS (BR-001) ====================

    describe('createOrder', () => {
        it('should create order with items', async () => {
            // DTO from dto/index.ts
            const dto = {
                type: 'DINE_IN' as const,
                items: [
                    {
                        productId: 'prod-1',
                        name: 'Shawarma',
                        nameAr: 'شاورما',
                        price: 35.00,
                        quantity: 2,
                    },
                ],
            };

            const mockOrder = {
                id: 'order-1',
                orderNumber: 'ORD-001',
                type: 'DINE_IN',
                status: 'DRAFT',
                subtotal: 70.00,
                taxAmount: 10.50,
                grandTotal: 80.50,
                items: dto.items,
            };

            repo.countByPrefix.mockResolvedValue(0);
            repo.createWithItems.mockResolvedValue(mockOrder);

            const result = await service.createOrder(dto, 'user-1');

            expect(result.type).toBe('DINE_IN');
            expect(repo.createWithItems).toHaveBeenCalled();
            expect(eventBus.publish).toHaveBeenCalledWith('OrderCreated', expect.anything());
        });

        it('should generate unique order number via createOrder', async () => {
            const dto = {
                type: 'TAKEAWAY' as const,
                items: [
                    {
                        productId: 'prod-1',
                        name: 'Test',
                        nameAr: 'اختبار',
                        price: 10.00,
                        quantity: 1,
                    },
                ],
            };

            const mockOrder = {
                orderNumber: 'ORD-001',
            };

            repo.countByPrefix.mockResolvedValue(0);
            repo.createWithItems.mockResolvedValue(mockOrder);

            const result = await service.createOrder(dto, 'user-1');

            expect(result.orderNumber).toMatch(/^ORD-/);
        });
    });

    // ==================== ORDER STATUS TESTS ====================

    describe('confirmOrder', () => {
        it('should confirm draft order', async () => {
            const draftOrder = {
                id: 'order-1',
                status: 'DRAFT',
                items: [],
            };

            const confirmedOrder = { ...draftOrder, status: 'CONFIRMED' };

            repo.findById.mockResolvedValue(draftOrder);
            repo.update.mockResolvedValue(confirmedOrder);

            const result = await service.confirmOrder('order-1');

            expect(result.status).toBe('CONFIRMED');
            expect(eventBus.publish).toHaveBeenCalledWith('OrderConfirmed', expect.anything());
        });
    });

    describe('cancelOrder', () => {
        it('should cancel order and publish event', async () => {
            const order = { id: 'order-1', status: 'DRAFT' };
            const cancelledOrder = { ...order, status: 'CANCELLED' };

            repo.findById.mockResolvedValue(order);
            repo.update.mockResolvedValue(cancelledOrder);

            const result = await service.cancelOrder('order-1', 'Customer request');

            expect(result.status).toBe('CANCELLED');
            expect(eventBus.publish).toHaveBeenCalledWith('OrderCancelled', expect.anything());
        });
    });

    describe('updateStatus', () => {
        it('should update order status', async () => {
            const order = { id: 'order-1', status: 'CONFIRMED' };
            const preparedOrder = { ...order, status: 'PREPARING' };

            repo.findById.mockResolvedValue(order);
            repo.update.mockResolvedValue(preparedOrder);

            const result = await service.updateStatus('order-1', { status: 'PREPARING' });

            expect(result.status).toBe('PREPARING');
        });
    });

    // ==================== ORDER ITEM TESTS ====================

    describe('addItem', () => {
        it('should add item to order and recalculate', async () => {
            const order = {
                id: 'order-1',
                status: 'DRAFT',
                items: [],
            };

            const newItem = {
                productId: 'prod-2',
                name: 'Falafel',
                nameAr: 'فلافل',
                price: 15.00,
                quantity: 1,
            };

            repo.findById.mockResolvedValue(order);
            repo.addItem.mockResolvedValue({ id: 'item-1', ...newItem });
            repo.getOrderItems.mockResolvedValue([{ id: 'item-1', ...newItem }]);
            repo.update.mockResolvedValue({ ...order, items: [newItem] });
            repo.findWithItems.mockResolvedValue({ ...order, items: [newItem] });

            const result = await service.addItem('order-1', newItem);

            expect(repo.addItem).toHaveBeenCalledWith('order-1', expect.objectContaining({
                productId: 'prod-2',
            }));
        });
    });

    describe('removeItem', () => {
        it('should remove item from order', async () => {
            const order = {
                id: 'order-1',
                status: 'DRAFT',
                items: [{ id: 'item-1' }],
            };

            repo.findById.mockResolvedValue(order);
            repo.removeItem.mockResolvedValue(undefined);
            repo.getOrderItems.mockResolvedValue([]);
            repo.update.mockResolvedValue({ ...order, items: [] });
            repo.findWithItems.mockResolvedValue({ ...order, items: [] });

            await service.removeItem('order-1', 'item-1');

            expect(repo.removeItem).toHaveBeenCalledWith('item-1');
        });
    });

    // ==================== ORDER QUERY TESTS ====================

    describe('findOrderById', () => {
        it('should return order', async () => {
            const order = { id: 'order-1', orderNumber: 'ORD-001' };
            repo.findById.mockResolvedValue(order);

            const result = await service.findOrderById('order-1');

            expect(result.id).toBe('order-1');
        });

        it('should throw NotFoundException if not found', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(service.findOrderById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findOrderByNumber', () => {
        it('should return order with items', async () => {
            const order = { id: 'order-1', orderNumber: 'ORD-001', items: [] };
            repo.findByOrderNumber.mockResolvedValue(order);

            const result = await service.findOrderByNumber('ORD-001');

            expect(result.orderNumber).toBe('ORD-001');
        });
    });

    describe('findOrdersBySession', () => {
        it('should return orders for session', async () => {
            const orders = [
                { id: 'order-1' },
                { id: 'order-2' },
            ];
            repo.findBySession.mockResolvedValue(orders);

            const result = await service.findOrdersBySession('session-1');

            expect(result).toHaveLength(2);
        });
    });
});
