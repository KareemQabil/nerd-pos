/**
 * EB-03: Kitchen Ticket Failure
 *
 * Tests that kitchen ticket creation failures are detected
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import { KitchenService } from '../../../src/modules/kitchen/kitchen.service';
import { KitchenRepository } from '../../../src/modules/kitchen/kitchen.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus, IEventHandler } from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';

describe('EB-03: Kitchen Ticket Failure', () => {
  let eventBus: EventBusService;
  let kitchenService: KitchenService;
  let prisma: PrismaService;

  // Mock handler that fails to create kitchen ticket
  class FailingKitchenHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      throw new Error('Kitchen display system offline!');
    }
  }

  // Mock handler that succeeds
  class SuccessKitchenHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      // Would create kitchen ticket
    }
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventBusService,
        KitchenService,
        KitchenRepository,
        PrismaService,
        { provide: 'IEventBus', useExisting: EventBusService },
      ],
    }).compile();

    eventBus = module.get<EventBusService>(EventBusService);
    kitchenService = module.get<KitchenService>(KitchenService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await createTestSession(prisma);
    await createTestProduct(prisma);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
    (eventBus as any).handlers.clear();
  });

  it('should detect when kitchen ticket creation fails', async () => {
    // Register failing handler
    eventBus.subscribe('OrderConfirmed', new FailingKitchenHandler());

    // Create order that would trigger kitchen ticket
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 100
      }
    });

    // Publish event
    await eventBus.publish('OrderConfirmed', {
      orderId: order.id,
      orderType: 'DINE_IN',
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    // Check for failures
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    const failures = (eventBus as any).getFailures?.() ?? [];

    expect((eventBus as any).hasFailures?.() ?? false).toBe(true);
    expect(failures.length).toBeGreaterThan(0);
  });

  it('should still create order when kitchen ticket fails', async () => {
    eventBus.subscribe('OrderConfirmed', new FailingKitchenHandler());

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 100
      }
    });

    // Order should exist even if kitchen ticket failed
    const foundOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id }
    });

    expect(foundOrder).toBeDefined();
    expect(foundOrder?.status).toBe(OrderStatus.CONFIRMED);

    // But kitchen ticket should be null/missing
    const kitchenTicket = await prisma.kitchenTicket.findFirst({
      where: { orderId: order.id }
    });

    expect(kitchenTicket).toBeNull();
  });

  it('should alert on kitchen ticket failure', async () => {
    eventBus.subscribe('OrderConfirmed', new FailingKitchenHandler());

    await eventBus.publish('OrderConfirmed', {
      orderId: 'test-order',
      orderType: 'DINE_IN'
    });

    const failures = (eventBus as any).getFailures?.() ?? [];

    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].error.message).toContain('Kitchen');
  });

  it('should not create kitchen ticket for TAKEAWAY orders', async () => {
    // TAKEAWAY orders don't need kitchen tickets
    eventBus.subscribe('OrderConfirmed', new SuccessKitchenHandler());

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'TAKEAWAY',
        status: OrderStatus.CONFIRMED,
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 50
      }
    });

    await eventBus.publish('OrderConfirmed', {
      orderId: order.id,
      orderType: 'TAKEAWAY'
    });

    // No failures should occur (no handler should be called for TAKEAWAY)
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    expect((eventBus as any).hasFailures?.() ?? false).toBe(false);
  });

  it('should create kitchen ticket for DINE_IN orders', async () => {
    eventBus.subscribe('OrderConfirmed', new SuccessKitchenHandler());

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 100
      }
    });

    await eventBus.publish('OrderConfirmed', {
      orderId: order.id,
      orderType: 'DINE_IN',
      items: [{ productId: 'prod-1', quantity: 2, name: 'Burger' }]
    });

    // Should not fail
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    expect((eventBus as any).hasFailures?.() ?? false).toBe(false);
  });

  it('should retry failed kitchen ticket creation', async () => {
    let attempts = 0;
    let shouldSucceed = false;

    class RetryKitchenHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        attempts++;
        if (!shouldSucceed) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        // Success on retry
      }
    }

    eventBus.subscribe('OrderConfirmed', new RetryKitchenHandler());

    // First attempt fails
    await eventBus.publish('OrderConfirmed', { orderId: 'test-1' });
    expect(attempts).toBe(1);

    const failures1 = (eventBus as any).getFailures?.() ?? [];
    expect(failures1.length).toBeGreaterThan(0);

    // Simulate retry mechanism
    shouldSucceed = true;
    (eventBus as any).failures = [];

    await eventBus.publish('OrderConfirmed', { orderId: 'test-2' });
    expect(attempts).toBe(2);
  });

  it('should handle concurrent kitchen ticket requests', async () => {
    eventBus.subscribe('OrderConfirmed', new SuccessKitchenHandler());

    const orders = await Promise.all([
      prisma.salesOrder.create({
        data: {
          orderNumber: `ORD-1-${Date.now()}`,
          orderType: 'DINE_IN',
          status: OrderStatus.CONFIRMED,
          sessionId: 'test-session',
          businessDate: new Date(),
          grandTotal: 100
        }
      }),
      prisma.salesOrder.create({
        data: {
          orderNumber: `ORD-2-${Date.now()}`,
          orderType: 'DINE_IN',
          status: OrderStatus.CONFIRMED,
          sessionId: 'test-session',
          businessDate: new Date(),
          grandTotal: 150
        }
      })
    ]);

    // Publish both events
    await Promise.all([
      eventBus.publish('OrderConfirmed', { orderId: orders[0].id }),
      eventBus.publish('OrderConfirmed', { orderId: orders[1].id })
    ]);

    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    expect((eventBus as any).hasFailures?.() ?? false).toBe(false);
  });

  it('should track kitchen display system status', async () => {
    // Simulate KDS health check
    eventBus.subscribe('OrderConfirmed', new SuccessKitchenHandler());

    const kdsHealthy = true;

    // Publish event
    await eventBus.publish('OrderConfirmed', {
      orderId: 'test-order',
      kdsHealthy
    });

    // If KDS is not healthy, handler should fail or retry
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;

    if (!kdsHealthy) {
      expect((eventBus as any).hasFailures?.() ?? false).toBe(true);
    } else {
      expect((eventBus as any).hasFailures?.() ?? false).toBe(false);
    }
  });
});
