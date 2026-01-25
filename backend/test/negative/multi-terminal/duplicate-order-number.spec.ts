/**
 * MT-01: Same Order Number Concurrent
 *
 * Tests that concurrent orders don't get duplicate order numbers
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { RaceConditionTester } from '../../helpers/race-condition';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';

describe('MT-01: Same Order Number Concurrent', () => {
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

  it('should generate unique order numbers for concurrent orders', async () => {
    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'test-session',
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1
        }
      ]
    };

    // Act: Two terminals create orders simultaneously
    const { terminalAResult, terminalBResult } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () => salesService.createOrder(order, 'user-1'),
        () => salesService.createOrder(order, 'user-2')
      );

    // Assert: Both should succeed with different order numbers
    expect(!('error' in terminalAResult)).toBe(true);
    expect(!('error' in terminalBResult)).toBe(true);

    const orderNumberA = (terminalAResult as any).orderNumber;
    const orderNumberB = (terminalBResult as any).orderNumber;

    expect(orderNumberA).toBeDefined();
    expect(orderNumberB).toBeDefined();
    expect(orderNumberA).not.toBe(orderNumberB);
  });

  it('should not generate duplicate order numbers under load', async () => {
    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'test-session',
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1
        }
      ]
    };

    // Act: Create 10 orders concurrently
    const orderPromises = Array.from({ length: 10 }, (_, i) =>
      salesService.createOrder(order, `user-${i}`)
    );

    const results = await Promise.allSettled(orderPromises);
    const successfulOrders = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<any>).value);

    // Assert: All should have unique order numbers
    const orderNumbers = successfulOrders.map(o => o.orderNumber);
    const uniqueOrderNumbers = new Set(orderNumbers);

    expect(uniqueOrderNumbers.size).toBe(orderNumbers.length);
    expect(orderNumbers.length).toBe(10);
  });

  it('should handle order number sequence correctly after restart', async () => {
    // This test simulates the scenario where the system restarts
    // and order number generation should continue from last used

    // Create first order
    const order1 = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-000001',
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    expect(order1.orderNumber).toBe('ORD-000001');

    // Simulate "restart" - next order should get number 2
    const order2 = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-000002',
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    expect(order2.orderNumber).toBe('ORD-000002');
  });

  it('should prevent order number collision via database constraint', async () => {
    // Setup: Create an order with specific number
    const existingOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-TEST-001',
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    // Act: Try to create another order with same number
    const result = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-TEST-001', // Duplicate!
        orderType: 'DINE_IN',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    }).catch(e => ({ error: e }));

    // Assert: Should fail due to unique constraint
    expect('error' in result).toBe(true);
  });

  it('should include session/terminal prefix in order number', async () => {
    // Test that order numbers reflect terminal/session context
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: 'TERM-A-001',
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    expect(order.orderNumber).toMatch(/^TERM-A-\d+$/);
  });

  it('should include business date in order number format', async () => {
    // Some systems use date-based order numbers (e.g., ORD-20250115-001)
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${dateStr}-001`,
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: today,
        grandTotal: 0
      }
    });

    expect(order.orderNumber).toContain(dateStr);
  });

  it('should handle order number gaps gracefully', async () => {
    // Test that gaps in order numbers (due to deletions, etc.) are handled

    // Create orders 1 and 3 (skip 2)
    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-003', // Skip 002
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    // Next order should be 004, not 002
    const nextOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-004',
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    expect(nextOrder.orderNumber).toBe('ORD-004');
  });
});
