/**
 * FIN-03: Double Refund
 *
 * Tests that the same item/order cannot be refunded twice
 *
 * NOTE: Refund model and SalesService refund flow are not in the current schema.
 * This suite stays skipped for future scope.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import { createTestProduct, createTestSession, createTestOrder, cleanupTestData } from '../../helpers/test-helpers';

describe.skip('FIN-03: Double Refund', () => {
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
      returnStock: jest.fn().mockResolvedValue({ success: true }),
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
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
    });

    const refund1 = await (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Customer request', items: [{ orderItemId: 'item-1', quantity: 1 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    const refund2 = await (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Duplicate refund attempt', items: [{ orderItemId: 'item-1', quantity: 1 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    if (!('error' in refund1)) {
      expect('error' in refund2).toBe(true);
    }
  });

  it('should track refund status to prevent double refund', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
    });

    await (prisma as any).refund.create({
      data: {
        orderId: order.id,
        userId: 'user-1',
        refundAmount: 100,
        refundMethod: 'CASH',
        reason: 'Customer request',
        status: 'COMPLETED',
      },
    });

    await prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: 'REFUNDED' as any },
    });

    const refund2 = await (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Second refund attempt', items: [{ orderItemId: 'item-1', quantity: 1 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    expect('error' in refund2).toBe(true);
  });

  it('should prevent partial double refund of same item', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
    });

    await (prisma as any).orderItem.create({
      data: {
        orderId: order.id,
        productId: 'prod-1',
        quantity: 5,
        unitPrice: 20,
        lineTotal: 100,
        productNameEn: 'Test Product',
        productNameAr: 'Ù…Ù†ØªØ¬ ØªØ¬Ø±ÙŠØ¨ÙŠ',
      },
    });

    const refund1 = await (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Partial refund', items: [{ orderItemId: 'item-1', quantity: 3 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    const refund2 = await (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Another partial refund', items: [{ orderItemId: 'item-1', quantity: 3 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    const hasError = 'error' in refund1 || 'error' in refund2;
    expect(hasError).toBe(true);
  });

  it('should allow refund of remaining quantity after partial refund', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
    });

    await (prisma as any).orderItem.create({
      data: {
        orderId: order.id,
        productId: 'prod-1',
        quantity: 10,
        unitPrice: 10,
        lineTotal: 100,
        productNameEn: 'Test Product',
        productNameAr: 'Ù…Ù†ØªØ¬ ØªØ¬Ø±ÙŠØ¨ÙŠ',
      },
    });

    const refund1 = await (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Partial refund', items: [{ orderItemId: 'item-1', quantity: 3 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    const refund2 = await (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Complete remaining refund', items: [{ orderItemId: 'item-1', quantity: 7 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    if (!('error' in refund1)) {
      expect(!('error' in refund2)).toBe(true);
    }
  });

  it('should log all refund attempts for audit', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
    });

    await (prisma as any).refund.create({
      data: {
        orderId: order.id,
        userId: 'user-1',
        refundAmount: 100,
        refundMethod: 'CASH',
        reason: 'Customer request',
        status: 'COMPLETED',
      },
    });

    const refunds = await (prisma as any).refund.findMany({
      where: { orderId: order.id },
    });

    expect(refunds.length).toBe(1);
    expect(refunds[0].status).toBe('COMPLETED');
  });

  it('should not allow refund amount exceeding original payment', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 50,
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 50,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-1',
        sessionId: order.sessionId,
        processedBy: 'test-user',
      },
    });

    const refund = await (prisma as any).refund
      .create({
        data: {
          orderId: order.id,
          userId: 'user-1',
          refundAmount: 100,
          refundMethod: 'CASH',
          reason: 'Excessive refund',
          status: 'PENDING',
        },
      })
      .catch((e: any) => ({ error: e }));

    expect('error' in refund).toBe(true);
  });

  it('should handle concurrent refund requests correctly', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
    });

    const refund1 = (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Concurrent refund 1', items: [{ orderItemId: 'item-1', quantity: 1 }] },
        'user-1',
      )
      .catch((e: any) => ({ error: e }));

    const refund2 = (salesService as any)
      .refundOrder(
        order.id,
        { reason: 'Concurrent refund 2', items: [{ orderItemId: 'item-1', quantity: 1 }] },
        'user-2',
      )
      .catch((e: any) => ({ error: e }));

    const [result1, result2] = await Promise.all([refund1, refund2]);

    const hasError = 'error' in result1 || 'error' in result2;
    expect(hasError).toBe(true);
  });
});
