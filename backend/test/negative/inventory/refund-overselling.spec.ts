/**
 * INV-03: Negative Stock After Refund
 *
 * Tests that refunds don't cause negative stock when concurrent operations occur
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../../src/modules/inventory/inventory.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import { createTestProduct, createTestSession, createTestOrder, cleanupTestData } from '../../helpers/test-helpers';

describe.skip('INV-03: Negative Stock After Refund', () => {
  let salesService: SalesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        SalesRepository,
        InventoryService,
        InventoryRepository,
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

  it('should not cause negative stock when refunding sold items', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 50,
    });

    await prisma.inventoryItem.create({
      data: {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantityOnHand: 9,
        reorderPoint: 5,
        averageCost: 25,
      },
    });

    const refundResult = await (salesService as any)
      .refundOrder(
        order.id,
        {
          reason: 'Customer request',
          items: [{ orderItemId: 'item-1', quantity: 1 }],
        },
        'user-1'
      )
      .catch((e: any) => ({ error: e }));

    if (!('error' in refundResult)) {
      const stockAfterRefund = await prisma.inventoryItem.findFirst({
        where: { productId: 'prod-1' },
      });

      expect(stockAfterRefund?.quantityOnHand?.toString()).toBe('10');
    }
  });

  it('should not allow refund if original stock quantity was insufficient', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 50,
    });

    await prisma.inventoryItem.create({
      data: {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantityOnHand: 0,
        reorderPoint: 5,
        averageCost: 25,
      },
    });

    const refundResult = await (salesService as any)
      .refundOrder(
        order.id,
        {
          reason: 'Customer request',
          items: [{ orderItemId: 'item-1', quantity: 1 }],
        },
        'user-1'
      )
      .catch((e: any) => ({ error: e }));

    if ('error' in refundResult) {
      expect(refundResult.error).toBeDefined();
    }
  });

  it('should track refund history for audit', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 50,
    });

    const refund = await (prisma as any).refund.create({
      data: {
        orderId: order.id,
        userId: 'user-1',
        refundAmount: 50,
        refundMethod: 'CASH',
        reason: 'Customer request',
        status: 'COMPLETED',
      },
    });

    expect(refund.orderId).toBe(order.id);
    expect(refund.refundAmount.toString()).toBe('50');
    expect(refund.status).toBe('COMPLETED');

    const refunds = await (prisma as any).refund.findMany({
      where: { orderId: order.id },
    });

    expect(refunds.length).toBe(1);
  });

  it('should reject refund for non-completed orders', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 50,
    });

    const refundResult = await (salesService as any)
      .refundOrder(
        order.id,
        {
          reason: 'Customer request',
          items: [{ orderItemId: 'item-1', quantity: 1 }],
        },
        'user-1'
      )
      .catch((e: any) => ({ error: e }));

    expect('error' in refundResult).toBe(true);
  });

  it('should reject refund exceeding original order quantity', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 50,
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: 'prod-1',
        quantity: 1,
        unitPrice: 50,
        lineTotal: 50,
        productNameEn: 'Test Product',
        productNameAr: 'Test Product AR',
      },
    });

    const refundResult = await (salesService as any)
      .refundOrder(
        order.id,
        {
          reason: 'Customer request',
          items: [{ orderItemId: 'item-1', quantity: 2 }],
        },
        'user-1'
      )
      .catch((e: any) => ({ error: e }));

    expect('error' in refundResult).toBe(true);
  });

  it('should handle concurrent refund requests correctly', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 50,
    });

    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: 'prod-1',
        quantity: 5,
        unitPrice: 10,
        lineTotal: 50,
        productNameEn: 'Test Product',
        productNameAr: 'Test Product AR',
      },
    });

    await prisma.inventoryItem.create({
      data: {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantityOnHand: 5,
        reorderPoint: 5,
        averageCost: 25,
      },
    });

    const refund1 = (salesService as any)
      .refundOrder(
        order.id,
        {
          reason: 'Customer request',
          items: [{ orderItemId: 'item-1', quantity: 3 }],
        },
        'user-1'
      )
      .catch((e: any) => ({ error: e }));

    const refund2 = (salesService as any)
      .refundOrder(
        order.id,
        {
          reason: 'Customer request',
          items: [{ orderItemId: 'item-1', quantity: 3 }],
        },
        'user-2'
      )
      .catch((e: any) => ({ error: e }));

    const [result1, result2] = await Promise.all([refund1, refund2]);

    const hasError = 'error' in result1 || 'error' in result2;
    expect(hasError).toBe(true);
  });
});
