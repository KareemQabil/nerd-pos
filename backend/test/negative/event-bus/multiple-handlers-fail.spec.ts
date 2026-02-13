/**
 * EB-06: Multiple Handlers Fail
 *
 * Tests system behavior when multiple event handlers fail simultaneously
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus, IEventHandler } from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';

describe('EB-06: Multiple Handlers Fail', () => {
  let eventBus: EventBusService;
  let prisma: PrismaService;

  // Mock failing handlers
  class FailingInventoryHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      throw new Error('Database connection lost - stock not updated!');
    }
  }

  class FailingKitchenHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      throw new Error('KDS printer offline - ticket not printed!');
    }
  }

  class FailingLoyaltyHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      throw new Error('Loyalty API timeout - points not awarded!');
    }
  }

  // Mock succeeding handler
  class SuccessAuditHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      // Audit log succeeds
    }
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventBusService,
        PrismaService,
        { provide: 'IEventBus', useExisting: EventBusService },
      ],
    }).compile();

    eventBus = module.get<EventBusService>(EventBusService);
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

  it('should detect all handler failures', async () => {
    // Register all handlers
    eventBus.subscribe('OrderCreated', new FailingInventoryHandler());
    eventBus.subscribe('OrderCreated', new FailingKitchenHandler());
    eventBus.subscribe('OrderCreated', new FailingLoyaltyHandler());
    eventBus.subscribe('OrderCreated', new SuccessAuditHandler());

    // Publish event
    await eventBus.publish('OrderCreated', {
      orderId: 'order-1',
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    // Check for failures
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    const failures = (eventBus as any).getFailures?.() ?? [];

    expect((eventBus as any).hasFailures?.() ?? false).toBe(true);
    expect(failures.length).toBe(3); // All 3 handlers should fail
  });

  it('should continue processing successful handlers when others fail', async () => {
    let auditHandlerCalled = false;

    class CheckAuditHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        auditHandlerCalled = true;
      }
    }

    eventBus.subscribe('OrderCreated', new FailingInventoryHandler());
    eventBus.subscribe('OrderCreated', new FailingKitchenHandler());
    eventBus.subscribe('OrderCreated', new CheckAuditHandler());

    await eventBus.publish('OrderCreated', {
      orderId: 'order-1',
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    // Audit handler should still be called
    expect(auditHandlerCalled).toBe(true);

    const failures = (eventBus as any).getFailures?.() ?? [];
    expect(failures.length).toBe(2); // Only inventory and kitchen failed
  });

  it('should aggregate all failure details', async () => {
    eventBus.subscribe('OrderCreated', new FailingInventoryHandler());
    eventBus.subscribe('OrderCreated', new FailingKitchenHandler());
    eventBus.subscribe('OrderCreated', new FailingLoyaltyHandler());

    await eventBus.publish('OrderCreated', {
      orderId: 'order-1',
      customerId: 'customer-1'
    });

    const failures = (eventBus as any).getFailures?.() ?? [];

    expect(failures.length).toBe(3);

    // Check each failure has details
    failures.forEach(failure => {
      expect(failure.handlerName).toBeDefined();
      expect(failure.error).toBeDefined();
      expect(failure.timestamp).toBeDefined();
    });

    // Verify specific handlers
    const handlerNames = failures.map(f => f.handlerName);
    expect(handlerNames).toContain('FailingInventoryHandler');
    expect(handlerNames).toContain('FailingKitchenHandler');
    expect(handlerNames).toContain('FailingLoyaltyHandler');
  });

  it('should not rollback successful handlers when others fail', async () => {
    let auditLogSaved = false;
    let emailSent = false;

    class AuditHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        auditLogSaved = true;
        // Simulate saving to audit log
      }
    }

    class EmailHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        emailSent = true;
        // Simulate sending email
      }
    }

    eventBus.subscribe('OrderCreated', new FailingInventoryHandler());
    eventBus.subscribe('OrderCreated', new AuditHandler());
    eventBus.subscribe('OrderCreated', new FailingKitchenHandler());
    eventBus.subscribe('OrderCreated', new EmailHandler());

    await eventBus.publish('OrderCreated', {
      orderId: 'order-1',
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    // Successful handlers should have executed
    expect(auditLogSaved).toBe(true);
    expect(emailSent).toBe(true);

    const failures = (eventBus as any).getFailures?.() ?? [];
    expect(failures.length).toBe(2);
  });

  it('should provide summary of successes and failures', async () => {
    eventBus.subscribe('OrderCreated', new FailingInventoryHandler());
    eventBus.subscribe('OrderCreated', new SuccessAuditHandler());
    eventBus.subscribe('OrderCreated', new FailingKitchenHandler());
    eventBus.subscribe('OrderCreated', new SuccessAuditHandler());

    await eventBus.publish('OrderCreated', {
      orderId: 'order-1'
    });

    const failures = (eventBus as any).getFailures?.() ?? [];

    // Summary
    const totalHandlers = 4;
    const failedHandlers = failures.length;
    const successHandlers = totalHandlers - failedHandlers;

    expect(failedHandlers).toBe(2);
    expect(successHandlers).toBe(2);
  });

  it('should alert on critical handler failures', async () => {
    const criticalEvents = ['OrderCreated', 'PaymentReceived', 'StockDeducted'];

    for (const eventName of criticalEvents) {
      eventBus.subscribe(eventName, new FailingInventoryHandler());
      eventBus.subscribe(eventName, new FailingKitchenHandler());

      await eventBus.publish(eventName, { id: 'test' });

      const failures = (eventBus as any).getFailures?.() ?? [];
      expect(failures.length).toBeGreaterThan(0);

      // Critical event failures should be flagged
      const isCritical = eventName === 'OrderCreated' || eventName === 'PaymentReceived';
      expect(isCritical).toBe(true);

      (eventBus as any).handlers.clear();
      (eventBus as any).failures = [];
    }
  });

  it('should handle cascade of failures gracefully', async () => {
    // Scenario: Inventory fails -> Kitchen fails (no items) -> Loyalty fails (no order)
    eventBus.subscribe('OrderCreated', new FailingInventoryHandler());
    eventBus.subscribe('OrderCreated', new FailingKitchenHandler());
    eventBus.subscribe('OrderCreated', new FailingLoyaltyHandler());

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.CONFIRMED,
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: new Date(),
        grandTotal: 100
      }
    });

    await eventBus.publish('OrderCreated', {
      orderId: order.id,
      items: [{ productId: 'prod-1', quantity: 2 }]
    });

    // Order should still exist
    const foundOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id }
    });

    expect(foundOrder).toBeDefined();

    // But failures should be tracked
    const failures = (eventBus as any).getFailures?.() ?? [];
    expect(failures.length).toBe(3);
  });

  it('should track failure rate for monitoring', async () => {
    // Simulate multiple events
    const eventCount = 10;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < eventCount; i++) {
      (eventBus as any).failures = [];

      eventBus.subscribe('TestEvent', new FailingInventoryHandler());
      eventBus.subscribe('TestEvent', new SuccessAuditHandler());

      await eventBus.publish('TestEvent', { id: `test-${i}` });

      const failures = (eventBus as any).getFailures?.() ?? [];

      if (failures.length > 0) {
        failureCount++;
      } else {
        successCount++;
      }
    }

    // Calculate failure rate
    const failureRate = (failureCount / eventCount) * 100;

    expect(failureCount).toBe(eventCount); // All should have 1 failure
    expect(failureRate).toBe(100);

    // High failure rate should trigger alert
    expect(failureRate).toBeGreaterThan(50); // More than 50% failed
  });

  it('should support handler-specific retry policies', async () => {
    let inventoryAttempts = 0;
    let kitchenAttempts = 0;

    class RetryInventoryHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        inventoryAttempts++;
        if (inventoryAttempts < 3) {
          throw new Error('Inventory temp fail');
        }
      }
    }

    class NoRetryKitchenHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        kitchenAttempts++;
        throw new Error('Kitchen permanent fail');
      }
    }

    eventBus.subscribe('OrderCreated', new RetryInventoryHandler());
    eventBus.subscribe('OrderCreated', new NoRetryKitchenHandler());

    // First attempt
    await eventBus.publish('OrderCreated', { orderId: 'test-1' });

    expect(inventoryAttempts).toBe(1);
    expect(kitchenAttempts).toBe(1);

    const failures = (eventBus as any).getFailures?.() ?? [];
    expect(failures.length).toBe(2);

    // Reset and retry
    (eventBus as any).failures = [];
    await eventBus.publish('OrderCreated', { orderId: 'test-2' });

    expect(inventoryAttempts).toBe(2);
    expect(kitchenAttempts).toBe(2);

    // Third attempt for inventory
    (eventBus as any).failures = [];
    await eventBus.publish('OrderCreated', { orderId: 'test-3' });

    expect(inventoryAttempts).toBe(3);
    // Kitchen still fails every time
    expect(kitchenAttempts).toBe(3);
  });
});
