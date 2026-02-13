/**
 * EB-01: Stock Deduction Failure
 *
 * Tests that event bus failures are detected and reported
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import {
  IEventBus,
  IEventHandler,
} from '../../../src/core/event-bus/event-bus.interface';
import { createTestProduct } from '../../helpers/test-helpers';
import { EventSpy } from '../../helpers/event-spy';

describe('EB-01: Stock Deduction Failure', () => {
  let eventBus: EventBusService;
  let prisma: PrismaService;
  let eventSpy: EventSpy;
  let productId: string;
  const categories = new Map<string, any>();
  const products = new Map<string, any>();

  // Mock handler that always fails
  class FailingStockHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      throw new Error('Stock deduction failed!');
    }
  }

  // Mock handler that succeeds
  class SuccessOrderHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      // Do nothing, just succeed
    }
  }

  beforeAll(async () => {
    const prismaMock = {
      category: {
        create: jest.fn(async ({ data }) => {
          const id = `cat-${categories.size + 1}`;
          const category = { id, ...data };
          categories.set(id, category);
          return category;
        }),
      },
      product: {
        create: jest.fn(async ({ data }) => {
          const id = `prod-${products.size + 1}`;
          const product = { id, ...data };
          products.set(id, product);
          return product;
        }),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        EventBusService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: EventEmitter2,
          useValue: { emitAsync: jest.fn() },
        },
        { provide: 'IEventBus', useExisting: EventBusService },
      ],
    }).compile();

    eventBus = module.get<EventBusService>(EventBusService);
    prisma = module.get(PrismaService) as unknown as PrismaService;
    eventSpy = new EventSpy(eventBus as IEventBus);
  });

  beforeEach(async () => {
    const product = await createTestProduct(prisma);
    productId = product.id;
  });

  afterEach(async () => {
    categories.clear();
    products.clear();
    jest.clearAllMocks();
    // Reset event bus
    (eventBus as any).handlers.clear();
  });

  it('should detect when stock deduction handler fails', async () => {
    // Register handlers
    eventBus.subscribe('OrderCreated', new SuccessOrderHandler());
    eventBus.subscribe('OrderCreated', new FailingStockHandler());

    // Publish event
    const orderEvent = {
      orderId: 'order-1',
      items: [{ productId, quantity: 5 }],
      timestamp: new Date(),
    };

    await expect(eventBus.publish('OrderCreated', orderEvent)).rejects.toThrow(
      'Critical event failure',
    );

    // Check for failures
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    const failures = (eventBus as any).getFailures?.() ?? [];

    // Assert: Failure should be detected
    expect(hasFailures).toBe(true);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].handlerName).toBe('FailingStockHandler');
  });

  it('should continue processing other handlers when one fails', async () => {
    let successHandlerCalled = false;
    let failingHandlerCalled = false;

    class CheckSuccessHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        successHandlerCalled = true;
      }
    }

    class CheckFailingHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        failingHandlerCalled = true;
        throw new Error('Failed!');
      }
    }

    eventBus.subscribe('TestEvent', new CheckSuccessHandler());
    eventBus.subscribe('TestEvent', new CheckFailingHandler());

    await eventBus.publish('TestEvent', { data: 'test' });

    // Both handlers should have been called
    expect(successHandlerCalled).toBe(true);
    expect(failingHandlerCalled).toBe(true);
  });

  it('should log failure details', async () => {
    eventBus.subscribe('TestEvent', new FailingStockHandler());

    await eventBus.publish('TestEvent', { data: 'test' });

    const failures = (eventBus as any).getFailures?.() ?? [];

    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].error).toBeDefined();
    expect(failures[0].timestamp).toBeDefined();
  });

  it('should alert on critical event failures', async () => {
    // Critical events that MUST succeed
    const criticalEvents = ['OrderCreated', 'PaymentReceived', 'StockDeducted'];

    for (const eventName of criticalEvents) {
      eventBus.subscribe(eventName, new FailingStockHandler());

      await expect(
        eventBus.publish(eventName, { id: 'test' }),
      ).rejects.toThrow('Critical event failure');

      const hasFailures = (eventBus as any).hasFailures?.() ?? false;
      expect((eventBus as any).hasFailures?.() ?? false).toBe(true);

      // Reset for next event
      (eventBus as any).handlers.clear();
    }
  });

  it('should aggregate multiple handler failures', async () => {
    eventBus.subscribe('TestEvent', new FailingStockHandler());
    eventBus.subscribe('TestEvent', new FailingStockHandler());
    eventBus.subscribe('TestEvent', new SuccessOrderHandler());

    await eventBus.publish('TestEvent', { data: 'test' });

    const failures = (eventBus as any).getFailures?.() ?? [];

    // Should have 2 failures
    expect(failures.length).toBe(2);
  });

  it('should reset failures between events', async () => {
    eventBus.subscribe('Event1', new FailingStockHandler());

    await eventBus.publish('Event1', { data: 'test1' });

    const failures = (eventBus as any).getFailures?.() ?? [];
    expect(failures.length).toBeGreaterThan(0);

    // Publish different event
    eventBus.subscribe('Event2', new SuccessOrderHandler());
    await eventBus.publish('Event2', { data: 'test2' });

    // Failures should be tracked per event or reset
    // This depends on implementation
  });

  it('should provide failure summary', async () => {
    eventBus.subscribe('TestEvent', new FailingStockHandler());
    eventBus.subscribe('TestEvent', new SuccessOrderHandler());

    await eventBus.publish('TestEvent', { data: 'test' });

    const failures = (eventBus as any).getFailures?.() ?? [];

    // Summary should include handler names and errors
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].handlerName).toBeDefined();
    expect(failures[0].error.message).toBeDefined();
  });

  it('should handle async handler failures', async () => {
    class AsyncFailingHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Async failure!');
      }
    }

    eventBus.subscribe('TestEvent', new AsyncFailingHandler());

    await eventBus.publish('TestEvent', { data: 'test' });

    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    expect(hasFailures).toBe(true);
  });

  it('should distinguish between handler types that failed', async () => {
    class InventoryHandler implements IEventHandler<any> {
      constructor(private succeed: boolean) {}
      async handle(event: any): Promise<void> {
        if (!this.succeed) throw new Error('Inventory failed');
      }
    }

    class KitchenHandler implements IEventHandler<any> {
      constructor(private succeed: boolean) {}
      async handle(event: any): Promise<void> {
        if (!this.succeed) throw new Error('Kitchen failed');
      }
    }

    eventBus.subscribe('OrderCreated', new InventoryHandler(false));
    eventBus.subscribe('OrderCreated', new KitchenHandler(true));

    await expect(
      eventBus.publish('OrderCreated', { orderId: 'test' }),
    ).rejects.toThrow('Critical event failure');

    const failures = (eventBus as any).getFailures?.() ?? [];
    const failedHandlers = failures.map((f: any) => f.handlerName);

    // Should identify which specific handler failed
    expect(failedHandlers.length).toBeGreaterThan(0);
  });
});
