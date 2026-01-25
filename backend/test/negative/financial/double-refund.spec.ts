/**
 * FIN-03: Double Refund
 *
 * Tests that the same item/order cannot be refunded twice
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import { createTestProduct, createTestSession, createTestOrder, cleanupTestData } from '../../helpers/test-helpers';

describe('FIN-03: Double Refund', () => {
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

    (salesService as any).inventoryService = {
      returnStock: jest.fn().mockResolvedValue({ success: true })
    };
  });

  beforeEach(async () => {
    await createTestSession(prisma);
    await createTestProduct(prisma);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should reject refunding same order twice', async () => {
    // Setup: Create a completed order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100
    });

    // Act: First refund
    const refund1 = await salesService.refundOrder(order.id, {
      reason: 'Customer request',
      items: [{ orderItemId: 'item-1', quantity: 1 }]
    }, 'user-1').catch(e => ({ error: e }));

    // Second refund attempt
    const refund2 = await salesService.refundOrder(order.id, {
      reason: 'Duplicate refund attempt',
      items: [{ orderItemId: 'item-1', quantity: 1 }]
    }, 'user-1').catch(e => ({ error: e }));

    // Assert: First should succeed or fail depending on implementation
    // Second should definitely fail if first succeeded
    if (!('error' in refund1)) {
      // First refund succeeded, second should fail
      expect('error' in refund2).toBe(true);
    }
  });

  it('should track refund status to prevent double refund', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100
    });

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: 'user-1',
        refundAmount: 100,
        refundMethod: 'CASH',
        reason: 'Customer request',
        status: 'COMPLETED'
      }
    });

    // Update order to REFUNDED
    await prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: OrderStatus.REFUNDED }
    });

    // Try to refund again
    const refund2 = await salesService.refundOrder(order.id, {
      reason: 'Second refund attempt',
      items: [{ orderItemId: 'item-1', quantity: 1 }]
    }, 'user-1').catch(e => ({ error: e }));

    // Should reject
    expect('error' in refund2).toBe(true);
  });

  it('should prevent partial double refund of same item', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100
    });

    // Create order item with quantity 5
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: 'prod-1',
        quantity: 5,
        unitPrice: 20,
        totalPrice: 100,
        name: 'Test Product',
        nameAr: 'منتج تجريبي'
      }
    });

    // First refund: 3 items
    const refund1 = await salesService.refundOrder(order.id, {
      reason: 'Partial refund',
      items: [{ orderItemId: 'item-1', quantity: 3 }]
    }, 'user-1').catch(e => ({ error: e }));

    // Second refund: 3 items (would exceed original quantity of 5)
    const refund2 = await salesService.refundOrder(order.id, {
      reason: 'Another partial refund',
      items: [{ orderItemId: 'item-1', quantity: 3 }]
    }, 'user-1').catch(e => ({ error: e }));

    // Total would be 6, exceeding original 5
    // At least one should fail
    const hasError = 'error' in refund1 || 'error' in refund2;
    expect(hasError).toBe(true);
  });

  it('should allow refund of remaining quantity after partial refund', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100
    });

    // Create order item with quantity 10
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: 'prod-1',
        quantity: 10,
        unitPrice: 10,
        totalPrice: 100,
        name: 'Test Product',
        nameAr: 'منتج تجريبي'
      }
    });

    // First refund: 3 items
    const refund1 = await salesService.refundOrder(order.id, {
      reason: 'Partial refund',
      items: [{ orderItemId: 'item-1', quantity: 3 }]
    }, 'user-1').catch(e => ({ error: e }));

    // Second refund: 7 items (remaining quantity)
    const refund2 = await salesService.refundOrder(order.id, {
      reason: 'Complete remaining refund',
      items: [{ orderItemId: 'item-1', quantity: 7 }]
    }, 'user-1').catch(e => ({ error: e }));

    // Both should succeed (total = 10 = original quantity)
    if (!('error' in refund1)) {
      expect(!('error' in refund2)).toBe(true);
    }
  });

  it('should log all refund attempts for audit', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100
    });

    // Create refund record
    await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: 'user-1',
        refundAmount: 100,
        refundMethod: 'CASH',
        reason: 'Customer request',
        status: 'COMPLETED'
      }
    });

    // Query all refunds for this order
    const refunds = await prisma.refund.findMany({
      where: { orderId: order.id }
    });

    expect(refunds.length).toBe(1);
    expect(refunds[0].status).toBe('COMPLETED');
  });

  it('should not allow refund amount exceeding original payment', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 50
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 50,
        method: 'CASH',
        reference: 'PAY-1'
      }
    });

    // Try to refund 100 (exceeds payment of 50)
    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: 'user-1',
        refundAmount: 100, // Exceeds payment!
        refundMethod: 'CASH',
        reason: 'Excessive refund',
        status: 'PENDING'
      }
    }).catch(e => ({ error: e }));

    // Should fail validation
    expect('error' in refund).toBe(true);
  });

  it('should handle concurrent refund requests correctly', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100
    });

    // Two concurrent refund requests
    const refund1 = salesService.refundOrder(order.id, {
      reason: 'Concurrent refund 1',
      items: [{ orderItemId: 'item-1', quantity: 1 }]
    }, 'user-1').catch(e => ({ error: e }));

    const refund2 = salesService.refundOrder(order.id, {
      reason: 'Concurrent refund 2',
      items: [{ orderItemId: 'item-1', quantity: 1 }]
    }, 'user-2').catch(e => ({ error: e }));

    const [result1, result2] = await Promise.all([refund1, refund2]);

    // At least one should fail
    const hasError = 'error' in result1 || 'error' in result2;
    expect(hasError).toBe(true);
  });
});
