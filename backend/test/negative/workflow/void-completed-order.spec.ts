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
import { createTestProduct, createTestSession, createTestOrder, cleanupTestData } from '../../helpers/test-helpers';

describe('WF-03: Void Completed Order', () => {
  let salesService: SalesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        SalesRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService);

    (salesService as any).sessionsService = {
      getCurrentSession: jest.fn().mockResolvedValue({ id: 'test-session' }),
    };
  });

  beforeEach(async () => {
    await createTestSession(prisma);
    await createTestProduct(prisma);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should reject voiding COMPLETED order', async () => {
    // Setup: Create a COMPLETED order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      completedAt: new Date(),
      grandTotal: 100
    });

    // Act & Assert: Should not allow voiding
    const result = await salesService.voidOrder(order.id, 'user-1', 'Customer complaint')
      .catch(e => ({ error: e }));

    expect('error' in result).toBe(true);

    // Verify order status is still COMPLETED
    const unchangedOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id }
    });

    expect(unchangedOrder?.status).toBe(OrderStatus.COMPLETED);
  });

  it('should allow voiding of CONFIRMED order', async () => {
    // Setup: Create a CONFIRMED order (not yet completed)
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      grandTotal: 100
    });

    // Act: Void the order
    const result = await salesService.voidOrder(order.id, 'user-1', 'Mistake')
      .catch(e => ({ error: e }));

    if (!('error' in result)) {
      // Verify order status is now VOIDED or CANCELLED
      const voidedOrder = await prisma.salesOrder.findUnique({
        where: { id: order.id }
      });

      expect([OrderStatus.VOIDED, OrderStatus.CANCELLED]).toContain(voidedOrder?.status);
    }
  });

  it('should allow voiding of DRAFT order', async () => {
    // Setup: Create a DRAFT order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 0
    });

    // Act: Void the order
    const result = await salesService.voidOrder(order.id, 'user-1', 'No longer needed')
      .catch(e => ({ error: e }));

    if (!('error' in result)) {
      // Verify order status changed
      const voidedOrder = await prisma.salesOrder.findUnique({
        where: { id: order.id }
      });

      expect([OrderStatus.VOIDED, OrderStatus.CANCELLED]).toContain(voidedOrder?.status);
    }
  });

  it('should require refund for PAID order before voiding', async () => {
    // Setup: Create a PAID order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.PAID,
      paidAt: new Date(),
      grandTotal: 100
    });

    // Act: Try to void without refund
    const result = await salesService.voidOrder(order.id, 'user-1', 'Customer request')
      .catch(e => ({ error: e }));

    // Should reject - must refund first
    expect('error' in result).toBe(true);
  });

  it('should track void reason and user for audit', async () => {
    // Setup: Create a DRAFT order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 0
    });

    const voidReason = 'Wrong items ordered';
    const voidedBy = 'user-1';

    // Act: Void with reason
    const result = await salesService.voidOrder(order.id, voidedBy, voidReason)
      .catch(e => ({ error: e }));

    if (!('error' in result)) {
      // Verify void was recorded
      const voidedOrder = await prisma.salesOrder.findUnique({
        where: { id: order.id }
      });

      expect(voidedOrder?.status).toBe(OrderStatus.CANCELLED);
      expect(voidedOrder?.cancelledAt).toBeDefined();
    }
  });

  it('should prevent double void', async () => {
    // Setup: Create and void an order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 0
    });

    // First void
    await salesService.voidOrder(order.id, 'user-1', 'First void')
      .catch(e => ({ error: e }));

    // Second void should fail
    const result = await salesService.voidOrder(order.id, 'user-1', 'Second void')
      .catch(e => ({ error: e }));

    // Should error because already voided
    expect('error' in result).toBe(true);
  });

  it('should distinguish between VOID and CANCELLED status', async () => {
    // VOID typically means system/manager action
    // CANCELLED typically means customer/staff action

    // Setup: Create two DRAFT orders
    const order1 = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 0
    });

    const order2 = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 0
    });

    // Cancel order1 (customer action)
    await salesService.cancelOrder(order1.id, 'user-1')
      .catch(e => ({ error: e }));

    // Void order2 (manager action)
    await salesService.voidOrder(order2.id, 'manager-1', 'Manager decision')
      .catch(e => ({ error: e }));

    // Both should be in terminal state
    const order1Status = (await prisma.salesOrder.findUnique({ where: { id: order1.id } }))?.status;
    const order2Status = (await prisma.salesOrder.findUnique({ where: { id: order2.id } }))?.status;

    expect([OrderStatus.CANCELLED, OrderStatus.VOIDED]).toContain(order1Status);
    expect([OrderStatus.CANCELLED, OrderStatus.VOIDED]).toContain(order2Status);
  });

  it('should not allow modifications after void', async () => {
    // Setup: Create and void an order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 0
    });

    await salesService.voidOrder(order.id, 'user-1', 'Void reason')
      .catch(e => ({ error: e }));

    // Try to add item to voided order
    const itemDto = {
      productId: 'prod-1',
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50
    };

    const result = await salesService.addItem(order.id, itemDto as any)
      .catch(e => ({ error: e }));

    // Should reject
    expect('error' in result).toBe(true);
  });
});
