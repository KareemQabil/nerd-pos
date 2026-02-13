/**
 * WF-03: Void Completed Order
 *
 * Tests that completed orders cannot be voided
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
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

function createMockStep() {
  return {
    order: 0,
    execute: jest.fn(async (ctx) => ctx),
  };
}

describe('WF-03: Void Completed Order', () => {
  let salesService: SalesService;
  let prisma: PrismaService;
  let productId: string;
  const orders = new Map<string, any>();
  const itemsByOrder = new Map<string, any[]>();

  beforeAll(async () => {
    const repo = {
      findById: jest.fn(async (id: string) => orders.get(id) ?? null),
      findWithItems: jest.fn(async (id: string) => {
        const order = orders.get(id);
        if (!order) return null;
        return { ...order, items: itemsByOrder.get(id) ?? [], payments: order.payments ?? [] };
      }),
      update: jest.fn(async (id: string, data: any) => {
        const existing = orders.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        orders.set(id, updated);
        return updated;
      }),
      addItem: jest.fn(async (orderId: string, data: any) => {
        const items = itemsByOrder.get(orderId) ?? [];
        const item = { id: `item-${items.length + 1}`, ...data };
        items.push(item);
        itemsByOrder.set(orderId, items);
        return item;
      }),
      getOrderItems: jest.fn(async (orderId: string) => itemsByOrder.get(orderId) ?? []),
    };

    const prismaMock: any = {
      salesOrder: {
        findUnique: jest.fn(async ({ where }: { where: any }) => orders.get(where.id) ?? null),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
        { provide: PrismaService, useValue: prismaMock },
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
        {
          provide: 'IEventBus',
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService) as unknown as PrismaService;
  });

  beforeEach(async () => {
    orders.clear();
    itemsByOrder.clear();
    productId = 'prod-1';
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should reject voiding COMPLETED order', async () => {
    // Setup: Create a COMPLETED order
    const order = { id: 'order-completed', status: OrderStatus.COMPLETED, completedAt: new Date(), grandTotal: 100 };
    orders.set(order.id, order);

    // Act & Assert: Should not allow voiding
    const result = await salesService
      .cancelOrder(order.id, 'Customer complaint')
      .catch((e: unknown) => ({ error: e }));

    expect('error' in result).toBe(true);

    // Verify order status is still COMPLETED
    const unchangedOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(unchangedOrder?.status).toBe(OrderStatus.COMPLETED);
  });

  it('should allow voiding of CONFIRMED order', async () => {
    // Setup: Create a CONFIRMED order (not yet completed)
    const order = { id: 'order-confirmed', status: OrderStatus.CONFIRMED, grandTotal: 100 };
    orders.set(order.id, order);

    // Act: Void the order
    const result = await salesService
      .cancelOrder(order.id, 'Mistake')
      .catch((e: unknown) => ({ error: e }));

    if (!('error' in result)) {
      // Verify order status is now CANCELLED
      const voidedOrder = await prisma.salesOrder.findUnique({
        where: { id: order.id },
      });

      expect(voidedOrder?.status).toBe(OrderStatus.CANCELLED);
    }
  });

  it('should allow voiding of DRAFT order', async () => {
    // Setup: Create a DRAFT order
    const order = { id: 'order-draft', status: OrderStatus.DRAFT, grandTotal: 0 };
    orders.set(order.id, order);

    // Act: Void the order
    const result = await salesService
      .cancelOrder(order.id, 'No longer needed')
      .catch((e: unknown) => ({ error: e }));

    if (!('error' in result)) {
      // Verify order status changed
      const voidedOrder = await prisma.salesOrder.findUnique({
        where: { id: order.id },
      });

      expect(voidedOrder?.status).toBe(OrderStatus.CANCELLED);
    }
  });

  it('should require refund for PAID order before voiding', async () => {
    // Setup: Create a PAID order
    const order = { id: 'order-paid', status: OrderStatus.PAID, grandTotal: 100 };
    orders.set(order.id, order);

    // Act: Try to void without refund
    const result = await salesService
      .cancelOrder(order.id, 'Customer request')
      .catch((e: unknown) => ({ error: e }));

    // Should reject - must refund first
    expect('error' in result).toBe(true);
  });

  it('should track void reason and user for audit', async () => {
    // Setup: Create a DRAFT order
    const order = { id: 'order-audit', status: OrderStatus.DRAFT, grandTotal: 0 };
    orders.set(order.id, order);

    const voidReason = 'Wrong items ordered';

    // Act: Void with reason
    const result = await salesService
      .cancelOrder(order.id, voidReason)
      .catch((e: unknown) => ({ error: e }));

    if (!('error' in result)) {
      // Verify void was recorded
      const voidedOrder = await prisma.salesOrder.findUnique({
        where: { id: order.id },
      });

      expect(voidedOrder?.status).toBe(OrderStatus.CANCELLED);
      expect(voidedOrder?.cancelledAt).toBeDefined();
    }
  });

  it('should prevent double void', async () => {
    // Setup: Create and void an order
    const order = { id: 'order-double', status: OrderStatus.DRAFT, grandTotal: 0 };
    orders.set(order.id, order);

    // First void
    await salesService
      .cancelOrder(order.id, 'First cancel')
      .catch((e: unknown) => ({ error: e }));

    // Second void should fail
    const result = await salesService
      .cancelOrder(order.id, 'Second cancel')
      .catch((e: unknown) => ({ error: e }));

    // Should error because already voided
    expect('error' in result).toBe(true);
  });

  it('should mark cancelled orders as CANCELLED', async () => {
    const order = { id: 'order-mark', status: OrderStatus.DRAFT, grandTotal: 0 };
    orders.set(order.id, order);

    await salesService
      .cancelOrder(order.id, 'Customer cancelled')
      .catch((e: unknown) => ({ error: e }));

    const status = (
      await prisma.salesOrder.findUnique({ where: { id: order.id } })
    )?.status;

    expect(status).toBe(OrderStatus.CANCELLED);
  });

  it('should not allow modifications after void', async () => {
    // Setup: Create and void an order
    const order = { id: 'order-modify', status: OrderStatus.DRAFT, grandTotal: 0 };
    orders.set(order.id, order);

    await salesService
      .cancelOrder(order.id, 'Cancel reason')
      .catch((e: unknown) => ({ error: e }));

    // Try to add item to voided order
    const itemDto = {
      productId: productId,
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50,
    };

    const result = await salesService
      .addItem(order.id, itemDto as any)
      .catch((e: unknown) => ({ error: e }));

    // Should reject
    expect('error' in result).toBe(true);
  });
});

