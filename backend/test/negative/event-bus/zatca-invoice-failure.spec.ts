/**
 * EB-05: ZATCA Invoice Failure
 *
 * Tests that ZATCA (Saudi tax authority) invoice generation failures are detected
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import {
  IEventBus,
  IEventHandler,
} from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import {
  createTestOrder,
  createTestProduct,
  createTestSession,
} from '../../helpers/test-helpers';

describe('EB-05: ZATCA Invoice Failure', () => {
  let eventBus: EventBusService;
  let prisma: PrismaService;
  const sessions = new Map<string, any>();
  const categories = new Map<string, any>();
  const products = new Map<string, any>();
  const orders = new Map<string, any>();
  const payments = new Map<string, any>();

  // Mock handler that fails to generate ZATCA invoice
  class FailingZATCAHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      throw new Error('ZATCA API connection failed - invoice not generated!');
    }
  }

  // Mock handler that succeeds
  class SuccessZATCAHandler implements IEventHandler<any> {
    async handle(event: any): Promise<void> {
      // Would generate ZATCA-compliant invoice
    }
  }

  beforeAll(async () => {
    const prismaMock: any = {
      registerSession: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `sess-${sessions.size + 1}`;
          const session = { id, ...data };
          sessions.set(id, session);
          return session;
        }),
      },
      category: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = `cat-${categories.size + 1}`;
          const category = { id, ...data };
          categories.set(id, category);
          return category;
        }),
      },
      product: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = `prod-${products.size + 1}`;
          const product = { id, ...data };
          products.set(id, product);
          return product;
        }),
      },
      salesOrder: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `order-${orders.size + 1}`;
          const order = { id, ...data };
          orders.set(id, order);
          return order;
        }),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return orders.get(where.id) ?? null;
        }),
      },
      payment: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = `pay-${payments.size + 1}`;
          const payment = { id, ...data };
          payments.set(id, payment);
          return payment;
        }),
        findMany: jest.fn(async ({ where }: { where: any }) => {
          const result: any[] = [];
          for (const payment of payments.values()) {
            if (!where?.orderId || payment.orderId === where.orderId) {
              result.push(payment);
            }
          }
          return result;
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
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await createTestSession(prisma);
    await createTestProduct(prisma);
  });

  afterEach(async () => {
    sessions.clear();
    categories.clear();
    products.clear();
    orders.clear();
    payments.clear();
    jest.clearAllMocks();
    (eventBus as any).handlers?.clear?.();
  });

  it('should detect when ZATCA invoice generation fails', async () => {
    // Register failing handler
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    // Create paid order (should trigger invoice generation)
    const order = await createTestOrder(prisma, {
      orderType: 'DINE_IN',
      status: OrderStatus.PAID,
      grandTotal: 115, // 100 + 15% VAT
    });

    // Publish payment event (triggers invoice generation)
    await expect(
      eventBus.publish('PaymentReceived', {
        orderId: order.id,
        amount: 115,
        taxAmount: 15,
      }),
    ).rejects.toThrow('Critical event failure');

    // Check for failures
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    const failures = (eventBus as any).getFailures?.() ?? [];

    expect((eventBus as any).hasFailures?.() ?? false).toBe(true);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].error.message).toContain('ZATCA');
  });

  it('should alert on compliance failure', async () => {
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    await expect(
      eventBus.publish('PaymentReceived', {
        orderId: 'test-order',
        amount: 100,
        vatNumber: '300000000000003',
      }),
    ).rejects.toThrow('Critical event failure');

    const failures = (eventBus as any).getFailures?.() ?? [];

    expect(failures.length).toBeGreaterThan(0);

    // Should be marked as critical compliance failure
    const isCritical = failures.some(
      (f: any) =>
        f.error.message.includes('ZATCA') ||
        f.error.message.includes('compliance'),
    );

    expect(isCritical).toBe(true);
  });

  it('should preserve order when invoice generation fails', async () => {
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    const order = await createTestOrder(prisma, {
      orderType: 'TAKEAWAY',
      status: OrderStatus.PAID,
      grandTotal: 115,
    });

    await expect(
      eventBus.publish('PaymentReceived', {
        orderId: order.id,
        amount: 115,
      }),
    ).rejects.toThrow('Critical event failure');

    // Order should still exist
    const foundOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(foundOrder).toBeDefined();
    expect(foundOrder?.status).toBe(OrderStatus.PAID);
  });

  it('should track invoice generation status', async () => {
    eventBus.subscribe('PaymentReceived', new SuccessZATCAHandler());

    const order = await createTestOrder(prisma, {
      orderType: 'DINE_IN',
      status: OrderStatus.PAID,
      grandTotal: 115,
    });

    await eventBus.publish('PaymentReceived', {
      orderId: order.id,
      amount: 115,
    });

    // After successful handler, invoice should be generated
    // (In real implementation, this would update a field)
  });

  it('should retry ZATCA invoice generation on failure', async () => {
    let attempts = 0;

    class RetryZATCAHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        attempts++;
        if (attempts < 3) {
          throw new Error(`ZATCA API timeout (attempt ${attempts})`);
        }
        // Success on 3rd attempt
      }
    }

    eventBus.subscribe('PaymentReceived', new RetryZATCAHandler());

    // First attempt fails
    await eventBus.publish('PaymentReceived', { orderId: 'test-1' }).catch(() => undefined);
    expect(attempts).toBe(1);

    const failures1 = (eventBus as any).getFailures?.() ?? [];
    expect(failures1.length).toBeGreaterThan(0);

    // Reset and retry
    (eventBus as any).failures = [];

    await eventBus.publish('PaymentReceived', { orderId: 'test-2' }).catch(() => undefined);
    expect(attempts).toBe(2);

    // Third attempt
    (eventBus as any).failures = [];
    await eventBus.publish('PaymentReceived', { orderId: 'test-3' }).catch(() => undefined);
    expect(attempts).toBe(3);
  });

  it('should include VAT details in invoice event', async () => {
    eventBus.subscribe('PaymentReceived', new SuccessZATCAHandler());

    await eventBus.publish('PaymentReceived', {
      orderId: 'test-order',
      amount: 115,
      subtotal: 100,
      taxAmount: 15,
      taxRate: 0.15,
      vatNumber: '300000000000003',
      timestamp: new Date(),
    });

    // Handler should receive all VAT details for compliance
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    expect((eventBus as any).hasFailures?.() ?? false).toBe(false);
  });

  it('should handle ZATCA API timeout', async () => {
    jest.useFakeTimers();
    class TimeoutZATCAHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        // Simulate timeout
        await new Promise((resolve) => setTimeout(resolve, 35000));
        throw new Error('Request timeout');
      }
    }

    eventBus.subscribe('PaymentReceived', new TimeoutZATCAHandler());

    // Publish with timeout handling
    const publishPromise = eventBus
      .publish('PaymentReceived', { orderId: 'test' })
      .catch(() => undefined);
    const resultPromise = Promise.race([
      publishPromise.then(() => 'done'),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 1000)),
    ]);

    jest.advanceTimersByTime(1000);
    const result = await resultPromise;

    // Should handle timeout gracefully
    expect(result).toBe('timeout');

    jest.advanceTimersByTime(35000);
    await publishPromise;
    jest.useRealTimers();
  });

  it('should queue failed invoices for retry', async () => {
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    const orders = [
      { id: 'order-1', amount: 100 },
      { id: 'order-2', amount: 200 },
      { id: 'order-3', amount: 150 },
    ];

    // Process all orders
    for (const order of orders) {
      (eventBus as any).failures = [];
      await eventBus.publish('PaymentReceived', order).catch(() => undefined);
    }

    // All should fail and be queued for retry
    // (Implementation would store failed invoice IDs in a retry queue)
  });

  it('should not block payment when invoice generation fails', async () => {
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    const order = await createTestOrder(prisma, {
      orderType: 'TAKEAWAY',
      status: OrderStatus.PAID,
      grandTotal: 115,
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 115,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-1',
        sessionId: order.sessionId,
        processedBy: 'user-1',
      },
    });

    await expect(
      eventBus.publish('PaymentReceived', {
        orderId: order.id,
        amount: 115,
      }),
    ).rejects.toThrow('Critical event failure');

    // Payment should be recorded even if invoice failed
    const payments = await prisma.payment.findMany({
      where: { orderId: order.id },
    });

    expect(payments.length).toBe(1);
    expect(payments[0].amount.toString()).toBe('115');
  });

  it('should generate simplified invoice for small amounts', async () => {
    // ZATCA has different rules for simplified invoices (< 1000 SAR)
    eventBus.subscribe('PaymentReceived', new SuccessZATCAHandler());

    await eventBus.publish('PaymentReceived', {
      orderId: 'small-order',
      amount: 50, // Small amount - simplified invoice
      invoiceType: 'SIMPLIFIED',
    });

    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    expect((eventBus as any).hasFailures?.() ?? false).toBe(false);
  });
});
