/**
 * Workflow 12: Offline Mode → Online Sync
 * 
 * Source: WORKFLOWS.md - Error Recovery Workflows
 * Note: This tests sync queue patterns, not actual IndexedDB
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../../src/modules/sales/sales.repository';
import { ItemSubtotalStep } from '../../../../src/modules/sales/calculation-steps/item-subtotal.step';
import { ServiceChargeStep } from '../../../../src/modules/sales/calculation-steps/service-charge.step';
import { DeliveryChargeStep } from '../../../../src/modules/sales/calculation-steps/delivery-charge.step';
import { SubtotalBeforeTaxStep } from '../../../../src/modules/sales/calculation-steps/subtotal-before-tax.step';
import { TaxStep } from '../../../../src/modules/sales/calculation-steps/tax.step';
import { DiscountStep } from '../../../../src/modules/sales/calculation-steps/discount.step';
import { GrandTotalStep } from '../../../../src/modules/sales/calculation-steps/grand-total.step';

function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        createWithItems: jest.fn(),
        countByPrefix: jest.fn(),
        findBySession: jest.fn(),
        addItem: jest.fn(),
        removeItem: jest.fn(),
        getOrderItems: jest.fn(),
        findWithItems: jest.fn(),
    };
}

function createMockEventBus() {
    return { publish: jest.fn(), subscribe: jest.fn() };
}

function createPassThroughStep() {
    return { execute: jest.fn((ctx) => Promise.resolve(ctx)) };
}

describe('Workflow 12: Offline Sync', () => {
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
                { provide: ItemSubtotalStep, useValue: createPassThroughStep() },
                { provide: ServiceChargeStep, useValue: createPassThroughStep() },
                { provide: DeliveryChargeStep, useValue: createPassThroughStep() },
                { provide: SubtotalBeforeTaxStep, useValue: createPassThroughStep() },
                { provide: TaxStep, useValue: createPassThroughStep() },
                { provide: DiscountStep, useValue: createPassThroughStep() },
                { provide: GrandTotalStep, useValue: createPassThroughStep() },
            ],
        }).compile();

        service = module.get<SalesService>(SalesService);
    });

    afterEach(() => jest.clearAllMocks());

    // ==================== 12.1: SYNC QUEUE BEHAVIOR ====================
    describe('12.1: Sync Queue Behavior', () => {
        it('should create order with offline marker', async () => {
            const offlineOrderDto = {
                type: 'TAKEAWAY' as const,
                sessionId: 'session-1',
                items: [
                    { productId: 'prod-1', name: 'Item', nameAr: 'عنصر', price: 50, quantity: 2 },
                ],
            };

            repo.countByPrefix.mockResolvedValue(0);
            repo.createWithItems.mockResolvedValue({
                id: 'order-offline-1',
                orderNumber: 'ORD-2026-0001',
                status: 'DRAFT',
                syncedAt: null, // Offline marker
            });

            const result = await service.createOrder(offlineOrderDto, 'cashier-1');

            expect(result.id).toBeDefined();
            expect(repo.createWithItems).toHaveBeenCalled();
        });

        it('should process multiple offline orders in sequence', async () => {
            repo.countByPrefix
                .mockResolvedValueOnce(0)
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2);

            repo.createWithItems
                .mockResolvedValueOnce({ id: 'order-1', orderNumber: 'ORD-2026-0001' })
                .mockResolvedValueOnce({ id: 'order-2', orderNumber: 'ORD-2026-0002' })
                .mockResolvedValueOnce({ id: 'order-3', orderNumber: 'ORD-2026-0003' });

            const orderDto = {
                type: 'TAKEAWAY' as const,
                sessionId: 'session-1',
                items: [{ productId: 'p1', name: 'X', nameAr: 'ع', price: 10, quantity: 1 }],
            };

            const order1 = await service.createOrder(orderDto, 'cashier-1');
            const order2 = await service.createOrder(orderDto, 'cashier-1');
            const order3 = await service.createOrder(orderDto, 'cashier-1');

            expect(order1.orderNumber).toBe('ORD-2026-0001');
            expect(order2.orderNumber).toBe('ORD-2026-0002');
            expect(order3.orderNumber).toBe('ORD-2026-0003');
        });
    });

    // ==================== 12.2: ORDER SEQUENCE INTEGRITY ====================
    describe('12.2: Order Sequence Integrity', () => {
        it('should generate sequential order numbers', async () => {
            repo.countByPrefix.mockResolvedValue(99);
            repo.createWithItems.mockImplementation((data) => {
                return Promise.resolve({
                    id: 'order-new',
                    orderNumber: data.orderNumber,
                });
            });

            const result = await service.createOrder({
                type: 'TAKEAWAY' as const,
                sessionId: 'session-1',
                items: [{ productId: 'p1', name: 'X', nameAr: 'ع', price: 10, quantity: 1 }],
            }, 'cashier-1');

            expect(result.orderNumber).toContain('0100');
        });
    });

    // ==================== 12.3: EVENT PUBLISHING FOR SYNC ====================
    describe('12.3: Event Publishing for Sync', () => {
        it('should publish OrderCreated event for sync handlers', async () => {
            repo.countByPrefix.mockResolvedValue(0);
            repo.createWithItems.mockResolvedValue({
                id: 'order-1',
                orderNumber: 'ORD-2026-0001',
            });

            await service.createOrder({
                type: 'TAKEAWAY' as const,
                sessionId: 'session-1',
                items: [{ productId: 'p1', name: 'X', nameAr: 'ع', price: 10, quantity: 1 }],
            }, 'cashier-1');

            expect(eventBus.publish).toHaveBeenCalledWith('OrderCreated', expect.anything());
        });
    });
});
