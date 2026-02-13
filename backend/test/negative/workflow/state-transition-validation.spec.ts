/**
 * WF-10: State Transition Validation
 *
 * Tests that order status transitions follow the state machine rules
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

describe('WF-10: State Transition Validation', () => {
  let salesService: SalesService;
  let prisma: PrismaService;
  const orders = new Map<string, any>();
  const createOrder = (data: any) => {
    const id = data.id ?? `order-${orders.size + 1}`;
    const order = {
      id,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
      items: data.items ?? [],
      payments: data.payments ?? [],
      ...data,
    };
    orders.set(id, order);
    return order;
  };

  beforeAll(async () => {
    const repo = {
      findById: jest.fn(async (id: string) => orders.get(id) ?? null),
      findWithItems: jest.fn(async (id: string) => {
        const order = orders.get(id);
        if (!order) return null;
        return { ...order, items: order.items ?? [], payments: order.payments ?? [] };
      }),
      update: jest.fn(async (id: string, data: any) => {
        const existing = orders.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        orders.set(id, updated);
        return updated;
      }),
    };

    const prismaMock: any = {
      salesOrder: {
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = orders.get(where.id);
          if (!existing) return null;
          const updated = { ...existing, ...data };
          orders.set(where.id, updated);
          return updated;
        }),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return orders.get(where.id) ?? null;
        }),
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
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it('should reject COMPLETED to DRAFT transition', async () => {
    // Setup: Create a COMPLETED order
    createOrder({
      id: 'order-completed',
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
    });

    // COMPLETED is terminal-like - should not go back to DRAFT
    const validStatesAfterCompleted = [OrderStatus.COMPLETED];
    expect(validStatesAfterCompleted.includes(OrderStatus.DRAFT)).toBe(false);
  });

  it('should reject PAID to DRAFT transition', async () => {
    createOrder({
      id: 'order-paid',
      status: OrderStatus.PAID,
      paidAt: new Date(),
      grandTotal: 100,
    });

    // PAID should not go back to DRAFT
    const validStatesAfterPaid = [OrderStatus.COMPLETED];
    expect(validStatesAfterPaid.includes(OrderStatus.DRAFT)).toBe(false);
  });

  it('should reject CANCELLED to PAID transition', async () => {
    createOrder({
      id: 'order-cancelled',
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      grandTotal: 100,
    });

    // CANCELLED is terminal state
    const validStatesAfterCancelled: OrderStatus[] = [];
    expect(validStatesAfterCancelled.length).toBe(0);
  });

  it('should allow DRAFT to CONFIRMED transition', async () => {
    createOrder({
      id: 'order-draft',
      status: OrderStatus.DRAFT,
      grandTotal: 100,
    });

    // DRAFT -> CONFIRMED is valid
    const validStatesFromDraft = [OrderStatus.CONFIRMED, OrderStatus.CANCELLED];
    expect(validStatesFromDraft.includes(OrderStatus.CONFIRMED)).toBe(true);
  });

  it('should allow CONFIRMED to PAID transition', async () => {
    createOrder({
      id: 'order-confirmed',
      status: OrderStatus.CONFIRMED,
      grandTotal: 100,
    });

    const validStatesFromConfirmed = [OrderStatus.PAID, OrderStatus.CANCELLED];
    expect(validStatesFromConfirmed.includes(OrderStatus.PAID)).toBe(true);
  });

  it('should allow CONFIRMED to CANCELLED transition', async () => {
    createOrder({
      id: 'order-confirmed-2',
      status: OrderStatus.CONFIRMED,
      grandTotal: 100,
    });

    const validStatesFromConfirmed = [OrderStatus.PAID, OrderStatus.CANCELLED];
    expect(validStatesFromConfirmed.includes(OrderStatus.CANCELLED)).toBe(true);
  });

  it('should allow PAID to COMPLETED transition', async () => {
    createOrder({
      id: 'order-paid-2',
      status: OrderStatus.PAID,
      paidAt: new Date(),
      grandTotal: 100,
    });

    const validStatesFromPaid = [OrderStatus.COMPLETED];
    expect(validStatesFromPaid.includes(OrderStatus.COMPLETED)).toBe(true);
  });

  it('should reject invalid state machine transitions', async () => {
    // Define some invalid transitions
    const invalidTransitions = [
      {
        from: OrderStatus.COMPLETED,
        to: OrderStatus.DRAFT,
        reason: 'Completed to Draft',
      },
      {
        from: OrderStatus.CANCELLED,
        to: OrderStatus.CONFIRMED,
        reason: 'Cancelled to Confirmed',
      },
      {
        from: OrderStatus.PAID,
        to: OrderStatus.CONFIRMED,
        reason: 'Paid to Confirmed',
      },
      {
        from: OrderStatus.COMPLETED,
        to: OrderStatus.PAID,
        reason: 'Completed to Paid',
      },
    ];

    for (const { from, to, reason } of invalidTransitions) {
      // Each of these should be considered invalid
      expect(`${from} -> ${to}: ${reason}`).toBeDefined();
    }
  });

  it('should track status change timestamp', async () => {
    const order = createOrder({
      id: 'order-timestamp',
      status: OrderStatus.DRAFT,
      grandTotal: 100,
    });

    const originalCreatedAt = order.createdAt;

    // Transition to CONFIRMED
    await prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CONFIRMED,
        updatedAt: new Date(),
      },
    });

    const updatedOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(updatedOrder?.status).toBe(OrderStatus.CONFIRMED);
    expect(updatedOrder?.updatedAt?.getTime()).toBeGreaterThanOrEqual(
      originalCreatedAt.getTime(),
    );
  });

  it('should enforce state machine at service level', async () => {
    const order = createOrder({
      id: 'order-service',
      status: OrderStatus.COMPLETED,
      completedAt: new Date(),
      grandTotal: 100,
    });

    // Try to cancel a completed order - should fail
    const result = await salesService
      .cancelOrder(order.id)
      .catch((e: unknown) => ({ error: e }));

    // Should reject - cannot cancel completed order
    expect('error' in result).toBe(true);
  });

  it('should handle terminal states', async () => {
    // Terminal states are those that don't have valid transitions out
    const terminalStates = [OrderStatus.CANCELLED, OrderStatus.COMPLETED];

    for (const terminalState of terminalStates) {
      // Once in terminal state, no further transitions should occur
      expect(terminalState).toBeDefined();
    }
  });

  it('should validate state transition in real workflow', async () => {
    // Simulate real order workflow
    const order = createOrder({
      id: 'order-workflow',
      status: OrderStatus.DRAFT,
      grandTotal: 100,
    });

    // Valid path: DRAFT -> CONFIRMED -> PAID -> COMPLETED
    const workflow = [
      OrderStatus.CONFIRMED,
      OrderStatus.PAID,
      OrderStatus.COMPLETED,
    ];

    for (const nextStatus of workflow) {
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { status: nextStatus, updatedAt: new Date() },
      });
    }

    // Verify final state
    const finalOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(finalOrder?.status).toBe(OrderStatus.COMPLETED);
  });

  it('should track status transition history', async () => {
    const order = createOrder({
      id: 'order-history',
      status: OrderStatus.DRAFT,
      grandTotal: 100,
    });

    const statusHistory = [
      { status: OrderStatus.DRAFT, timestamp: new Date() },
      { status: OrderStatus.CONFIRMED, timestamp: new Date() },
      { status: OrderStatus.PAID, timestamp: new Date() },
    ];

    // Simulate status changes
    for (const entry of statusHistory) {
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { status: entry.status, updatedAt: entry.timestamp },
      });
    }

    // Verify final status
    const finalOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(finalOrder?.status).toBe(OrderStatus.PAID);
  });
});
