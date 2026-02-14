/**
 * WF-01: Add Item to Paid Order
 *
 * Tests that items cannot be added to paid orders
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { OrderStatus } from '../../../src/core/constants/enums';
import { OutboxService } from '../../../src/core/outbox/outbox.service';
import {
  ItemSubtotalStep,
  ServiceChargeStep,
  DeliveryChargeStep,
  SubtotalBeforeTaxStep,
  TaxStep,
  DiscountStep,
  GrandTotalStep,
} from '../../../src/modules/sales/calculation-steps';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { BadRequestAppException } from '../../../src/common/exceptions';
import { ErrorMessages } from '../../../src/common/constants';

function createMockStep() {
  return {
    order: 0,
    execute: jest.fn(async (ctx) => ctx),
  };
}

describe('WF-01: Add Item to Paid Order', () => {
  let salesService: SalesService;
  let productId: string;
  const orders = new Map<string, any>();
  const itemsByOrder = new Map<string, any[]>();

  beforeAll(async () => {
    const repo = {
      findById: jest.fn(async (id: string) => orders.get(id) ?? null),
      addItem: jest.fn(async (orderId: string, data: any) => {
        const items = itemsByOrder.get(orderId) ?? [];
        const item = { id: `item-${items.length + 1}`, ...data };
        items.push(item);
        itemsByOrder.set(orderId, items);
        return item;
      }),
      getOrderItems: jest.fn(async (orderId: string) => itemsByOrder.get(orderId) ?? []),
      update: jest.fn(async (id: string, data: any) => {
        const existing = orders.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        orders.set(id, updated);
        return updated;
      }),
      findWithItems: jest.fn(async (id: string) => {
        const order = orders.get(id);
        if (!order) return null;
        return { ...order, items: itemsByOrder.get(id) ?? [] };
      }),
    };
    const prisma = {
      $transaction: jest.fn(async (fn: any) => fn({})),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
    };

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: { enqueue: jest.fn(), flushPending: jest.fn() } },
        { provide: ItemSubtotalStep, useValue: createMockStep() },
        { provide: ServiceChargeStep, useValue: createMockStep() },
        { provide: DeliveryChargeStep, useValue: createMockStep() },
        { provide: SubtotalBeforeTaxStep, useValue: createMockStep() },
        { provide: TaxStep, useValue: createMockStep() },
        { provide: DiscountStep, useValue: createMockStep() },
        { provide: GrandTotalStep, useValue: createMockStep() },
        {
          provide: InventoryService,
          useValue: {
            getDefaultWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
            deductStockWithTx: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SessionsService,
          useValue: { getCurrentSession: jest.fn().mockResolvedValue({ id: 'test-session' }) },
        },
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
  });

  beforeEach(async () => {
    productId = 'prod-1';
    jest
      .spyOn(salesService as any, 'generateOrderNumber')
      .mockResolvedValue(`TEST-${Date.now()}`);
  });

  afterEach(async () => {
    orders.clear();
    itemsByOrder.clear();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should reject item addition to PAID order', async () => {
    // Setup: Create a paid order
    const order = { id: 'order-paid', status: OrderStatus.PAID, grandTotal: 100, items: [] };
    orders.set(order.id, order);

    const itemDto = {
      productId: productId,
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50,
    };

    // Act & Assert
    const result = salesService.addItem(order.id, itemDto as any);
    await expect(result).rejects.toThrow(BadRequestAppException);
    await expect(result).rejects.toMatchObject({
      response: { messageKey: ErrorMessages.OrderNotDraft.key },
    });
  });

  it('should reject item addition to COMPLETED order', async () => {
    // Setup: Create a completed order
    const order = { id: 'order-completed', status: OrderStatus.COMPLETED, completedAt: new Date(), grandTotal: 100, items: [] };
    orders.set(order.id, order);

    const itemDto = {
      productId: productId,
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50,
    };

    // Act & Assert
    const result = salesService.addItem(order.id, itemDto as any);
    await expect(result).rejects.toThrow(BadRequestAppException);
    await expect(result).rejects.toMatchObject({
      response: { messageKey: ErrorMessages.OrderNotDraft.key },
    });
  });

  it('should reject item addition to CANCELLED order', async () => {
    // Setup: Create a cancelled order
    const order = { id: 'order-cancelled', status: OrderStatus.CANCELLED, cancelledAt: new Date(), grandTotal: 100, items: [] };
    orders.set(order.id, order);

    const itemDto = {
      productId: productId,
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50,
    };

    // Act & Assert
    const result = salesService.addItem(order.id, itemDto as any);
    await expect(result).rejects.toThrow(BadRequestAppException);
    await expect(result).rejects.toMatchObject({
      response: { messageKey: ErrorMessages.OrderNotDraft.key },
    });
  });

  it('should allow item addition to DRAFT order', async () => {
    // Setup: Create a draft order
    const order = { id: 'order-draft', status: OrderStatus.DRAFT, grandTotal: 0, items: [] };
    orders.set(order.id, order);

    const itemDto = {
      productId: productId,
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50,
    };

    // Act & Assert
    const result = await salesService.addItem(order.id, itemDto as any);
    expect(result).toBeDefined();
  });
});
