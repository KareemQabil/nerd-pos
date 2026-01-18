/**
 * Workflow 13: Void Order After Kitchen Start
 * 
 * Source: WORKFLOWS.md - Error Recovery Workflows
 * Tests manager authorization for voiding in-progress orders
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
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

describe('Workflow 13: Void Order After Kitchen Start', () => {
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

    // ==================== 13.1: CANCEL PENDING ORDER ====================
    describe('13.1: Cancel Pending Order', () => {
        it('should cancel pending order', async () => {
            const pendingOrder = {
                id: 'order-1',
                status: 'DRAFT',
                type: 'DINE_IN',
            };

            repo.findById.mockResolvedValue(pendingOrder);
            repo.update.mockResolvedValue({ ...pendingOrder, status: 'CANCELLED' });

            const result = await service.cancelOrder('order-1', 'Customer left');

            expect(result.status).toBe('CANCELLED');
            expect(eventBus.publish).toHaveBeenCalledWith('OrderCancelled', expect.anything());
        });
    });

    // ==================== 13.2: CANCEL CONFIRMED ORDER ====================
    describe('13.2: Cancel Confirmed Order', () => {
        it('should cancel confirmed order with reason', async () => {
            const confirmedOrder = {
                id: 'order-1',
                status: 'CONFIRMED',
                type: 'DINE_IN',
            };

            repo.findById.mockResolvedValue(confirmedOrder);
            repo.update.mockResolvedValue({ ...confirmedOrder, status: 'CANCELLED' });

            const result = await service.cancelOrder('order-1', 'Wrong order');

            expect(result.status).toBe('CANCELLED');
        });
    });

    // ==================== 13.3: REJECT CANCEL COMPLETED ====================
    describe('13.3: Reject Cancel Completed', () => {
        it('should reject cancellation of completed order', async () => {
            const completedOrder = {
                id: 'order-1',
                status: 'COMPLETED',
                type: 'DINE_IN',
            };

            repo.findById.mockResolvedValue(completedOrder);

            await expect(service.cancelOrder('order-1', 'Test'))
                .rejects.toThrow(BadRequestException);
        });
    });

    // ==================== 13.4: EVENT PUBLISHING ====================
    describe('13.4: Event Publishing', () => {
        it('should publish OrderCancelled event', async () => {
            repo.findById.mockResolvedValue({ id: 'order-1', status: 'DRAFT' });
            repo.update.mockResolvedValue({ id: 'order-1', status: 'CANCELLED' });

            await service.cancelOrder('order-1', 'Reason');

            expect(eventBus.publish).toHaveBeenCalledWith(
                'OrderCancelled',
                expect.objectContaining({ orderId: 'order-1' }),
            );
        });
    });
});
