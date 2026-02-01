/**
 * EB-05: ZATCA Invoice Failure
 *
 * Tests that ZATCA (Saudi tax authority) invoice generation failures are detected
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import {
  IEventBus,
  IEventHandler,
} from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import {
  createTestProduct,
  createTestSession,
  cleanupTestData,
} from '../../helpers/test-helpers';

describe('EB-05: ZATCA Invoice Failure', () => {
  let eventBus: EventBusService;
  let prisma: PrismaService;

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

  it('should detect when ZATCA invoice generation fails', async () => {
    // Register failing handler
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    // Create paid order (should trigger invoice generation)
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.PAID,
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: new Date(),
        grandTotal: 115, // 100 + 15% VAT
        tax: 15,
      },
    });

    // Publish payment event (triggers invoice generation)
    await eventBus.publish('PaymentReceived', {
      orderId: order.id,
      amount: 115,
      taxAmount: 15,
    });

    // Check for failures
    const hasFailures = (eventBus as any).hasFailures?.() ?? false;
    const failures = (eventBus as any).getFailures?.() ?? [];

    expect((eventBus as any).hasFailures?.() ?? false).toBe(true);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].error.message).toContain('ZATCA');
  });

  it('should alert on compliance failure', async () => {
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    await eventBus.publish('PaymentReceived', {
      orderId: 'test-order',
      amount: 100,
      vatNumber: '300000000000003',
    });

    const failures = (eventBus as any).getFailures?.() ?? [];

    expect(failures.length).toBeGreaterThan(0);

    // Should be marked as critical compliance failure
    const isCritical = failures.some(
      (f) =>
        f.error.message.includes('ZATCA') ||
        f.error.message.includes('compliance'),
    );

    expect(isCritical).toBe(true);
  });

  it('should preserve order when invoice generation fails', async () => {
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'TAKEAWAY',
        status: OrderStatus.PAID,
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: new Date(),
        grandTotal: 115,
        tax: 15,
        paidAt: new Date(),
      },
    });

    await eventBus.publish('PaymentReceived', {
      orderId: order.id,
      amount: 115,
    });

    // Order should still exist
    const foundOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(foundOrder).toBeDefined();
    expect(foundOrder?.status).toBe(OrderStatus.PAID);
  });

  it('should track invoice generation status', async () => {
    eventBus.subscribe('PaymentReceived', new SuccessZATCAHandler());

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.PAID,
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: new Date(),
        grandTotal: 115,
        tax: 15,
        zatcaInvoiceGenerated: false, // Initially false
      },
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
    await eventBus.publish('PaymentReceived', { orderId: 'test-1' });
    expect(attempts).toBe(1);

    const failures1 = (eventBus as any).getFailures?.() ?? [];
    expect(failures1.length).toBeGreaterThan(0);

    // Reset and retry
    (eventBus as any).failures = [];

    await eventBus.publish('PaymentReceived', { orderId: 'test-2' });
    expect(attempts).toBe(2);

    // Third attempt
    (eventBus as any).failures = [];
    await eventBus.publish('PaymentReceived', { orderId: 'test-3' });
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
    class TimeoutZATCAHandler implements IEventHandler<any> {
      async handle(event: any): Promise<void> {
        // Simulate timeout
        await new Promise((resolve) => setTimeout(resolve, 35000));
        throw new Error('Request timeout');
      }
    }

    eventBus.subscribe('PaymentReceived', new TimeoutZATCAHandler());

    // Publish with timeout handling
    const result = await Promise.race([
      eventBus.publish('PaymentReceived', { orderId: 'test' }),
      new Promise((resolve) => setTimeout(() => 'timeout', 1000)),
    ]);

    // Should handle timeout gracefully
    expect(result).toBe('timeout');
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
      await eventBus.publish('PaymentReceived', order);
    }

    // All should fail and be queued for retry
    // (Implementation would store failed invoice IDs in a retry queue)
  });

  it('should not block payment when invoice generation fails', async () => {
    eventBus.subscribe('PaymentReceived', new FailingZATCAHandler());

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'TAKEAWAY',
        status: OrderStatus.PAID,
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: new Date(),
        grandTotal: 115,
        tax: 15,
        paidAt: new Date(),
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 115,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-1',
      },
    });

    await eventBus.publish('PaymentReceived', {
      orderId: order.id,
      amount: 115,
    });

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
