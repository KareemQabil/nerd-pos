/**
 * INV-01: Overselling Last Item (Race Condition)
 *
 * Tests that two terminals cannot oversell the same stock
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { OutboxService } from '../../../src/core/outbox/outbox.service';
import {
  ItemSubtotalStep,
  ServiceChargeStep,
  DeliveryChargeStep,
  SubtotalBeforeTaxStep,
  TaxStep,
  DiscountStep,
  GrandTotalStep,
} from '../../../src/modules/sales/calculation-steps';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { RaceConditionTester } from '../../helpers/race-condition';

describe('INV-01: Overselling Last Item (Race Condition)', () => {
  let salesService: SalesService;
  let inventoryService: InventoryService;
  let productId: string;
  let warehouseId: string;
  let sessionId: string;
  let prisma: { $transaction: jest.Mock; $executeRaw: jest.Mock; $queryRaw: jest.Mock };
  let outboxService: { enqueue: jest.Mock; flushPending: jest.Mock };
  let orderNumberSpy: jest.SpyInstance;
  let orderNumberCounter = 0;
  const stockByKey = new Map<string, number>();

  beforeAll(async () => {
    const repo = {
      createWithItems: jest.fn(async (orderData: any, items: any[]) => ({
        id: `order-${Date.now()}`,
        orderNumber: orderData.orderNumber,
        orderType: orderData.orderType,
        status: orderData.status,
        items,
        sessionId: orderData?.session?.connect?.id,
        grandTotal: orderData.grandTotal,
      })),
    };
    prisma = {
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
    };
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));

    outboxService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      flushPending: jest.fn().mockResolvedValue(undefined),
    };

    const getKey = (product: string, warehouse: string) =>
      `${product}:${warehouse}`;
    const inventoryMock = {
      getDefaultWarehouse: jest.fn(async () => ({ id: warehouseId })),
      deductStockWithTx: jest.fn(
        async (
          product: string,
          warehouse: string,
          quantity: number,
        ): Promise<void> => {
          const key = getKey(product, warehouse);
          const current = stockByKey.get(key) ?? 0;
          if (current < quantity) {
            throw new Error('Insufficient stock');
          }
          stockByKey.set(key, current - quantity);
        },
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
        { provide: InventoryService, useValue: inventoryMock },
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: outboxService },
        ItemSubtotalStep,
        ServiceChargeStep,
        DeliveryChargeStep,
        SubtotalBeforeTaxStep,
        TaxStep,
        DiscountStep,
        GrandTotalStep,
        {
          provide: SessionsService,
          useValue: { getCurrentSession: jest.fn() },
        },
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    await module.init();

    salesService = module.get<SalesService>(SalesService);
    inventoryService = module.get<InventoryService>(InventoryService);
  });

  beforeEach(async () => {
    sessionId = `sess-${Date.now()}`;
    warehouseId = 'wh-1';
    productId = 'prod-1';
    stockByKey.set(`${productId}:${warehouseId}`, 5);

    orderNumberCounter = 0;
    orderNumberSpy = jest
      .spyOn(salesService as any, 'generateOrderNumber')
      .mockImplementation(
        async () => `TEST-${Date.now()}-${orderNumberCounter++}`,
      );

    (inventoryService.getDefaultWarehouse as jest.Mock).mockResolvedValue({
      id: warehouseId,
    });
  });

  afterEach(async () => {
    if (orderNumberSpy) {
      orderNumberSpy.mockRestore();
    }
    stockByKey.clear();
    jest.clearAllMocks();
  });

  it('should prevent overselling when two terminals order simultaneously', async () => {
    const terminalAOrder = {
      type: 'DINE_IN' as const,
      sessionId,
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'Test Product AR',
          price: 50,
          quantity: 5,
        },
      ],
    };

    const terminalBOrder = {
      type: 'DINE_IN' as const,
      sessionId,
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'Test Product AR',
          price: 50,
          quantity: 5,
        },
      ],
    };

    const { terminalAResult, terminalBResult, bothSucceeded } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () => salesService.createOrder(terminalAOrder as any, 'terminal-a'),
        () => salesService.createOrder(terminalBOrder as any, 'terminal-b'),
      );

    const results = [terminalAResult, terminalBResult];
    const successCount = results.filter((r) => !('error' in (r as any))).length;
    const errorCount = results.filter((r) => 'error' in (r as any)).length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(1);
    expect(bothSucceeded).toBe(false);

    const finalStock = stockByKey.get(`${productId}:${warehouseId}`) ?? 0;
    expect(finalStock.toString()).toBe('0');
  });

  it('should handle rapid concurrent stock deductions correctly', async () => {
    stockByKey.set(`${productId}:${warehouseId}`, 10);

    const concurrency = Number(process.env.TEST_CONCURRENCY || 20);
    const expectedSuccess = Math.min(10, concurrency);
    const expectedFailed = Math.max(0, concurrency - 10);

    const { successful, failed } = await RaceConditionTester.floodEndpoint(
      async () => {
        return salesService.createOrder(
          {
            type: 'TAKEAWAY',
            sessionId,
            items: [
              {
                productId,
                name: 'Test Product',
                nameAr: 'Test Product AR',
                price: 50,
                quantity: 1,
              },
            ],
          } as any,
          'user-1',
        );
      },
      concurrency,
    );

    expect(successful).toBe(expectedSuccess);
    expect(failed).toBe(expectedFailed);

    const stock = stockByKey.get(`${productId}:${warehouseId}`) ?? 0;
    expect(stock.toString()).toBe('0');
  });

  it('should reject order when product has zero stock', async () => {
    stockByKey.set(`${productId}:${warehouseId}`, 0);

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId,
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'Test Product AR',
          price: 50,
          quantity: 1,
        },
      ],
    };

    await expect(
      salesService.createOrder(order as any, 'user'),
    ).rejects.toThrow();
  });
});
