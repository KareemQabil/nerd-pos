/**
 * INV-02: Selling Zero-Stock Item
 *
 * Tests that items with zero stock cannot be sold
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
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
import { InventoryService } from '../../../src/modules/inventory/inventory.service';

function createMockStep() {
  return {
    order: 0,
    execute: jest.fn(async (ctx) => ctx),
  };
}

describe('INV-02: Selling Zero-Stock Item', () => {
  let salesService: SalesService;
  let prisma: PrismaService;
  let sessionId: string;
  let warehouseId: string;
  let productId: string;
  const movements: any[] = [];
  const stockByProduct = new Map<string, number>();

  beforeAll(async () => {
    const repo = {
      createWithItems: jest.fn(async (data: any, items: any[]) => {
        return { id: `order-${Date.now()}`, ...data, items };
      }),
    };

    const prismaMock: any = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
      inventoryItem: {
        updateMany: jest.fn(async (args: any) => {
          const productIdArg = args?.where?.productId as string | undefined;
          const needed = (args?.data?.quantityOnHand?.decrement as number | undefined) ?? 0;
          const available = productIdArg ? stockByProduct.get(productIdArg) ?? 0 : 0;

          if (available >= needed && needed > 0) {
            stockByProduct.set(productIdArg as string, available - needed);
            return { count: 1 };
          }

          return { count: 0 };
        }),
      },
      inventoryMovement: {
        findMany: jest.fn(async ({ where }: { where: any }) => {
          return movements.filter(
            (m) => m.productId === where.productId && m.warehouseId === where.warehouseId,
          );
        }),
      },
    };
    prismaMock.$transaction = jest.fn((fn: any) => fn(prismaMock));

    const inventoryServiceMock = {
      getDefaultWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
      deductStockWithTx: jest.fn().mockImplementation(
        async (
          productIdArg: string,
          warehouseIdArg: string,
          quantity: number,
        ) => {
          const available = stockByProduct.get(productIdArg) ?? 0;
          if (available < quantity) {
            throw new Error('Insufficient stock');
          }
          stockByProduct.set(productIdArg, available - quantity);
          movements.push({
            productId: productIdArg,
            warehouseId: warehouseIdArg,
            quantity: -quantity,
          });
          return [];
        },
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
        { provide: PrismaService, useValue: prismaMock },
        { provide: OutboxService, useValue: { enqueue: jest.fn(), flushPending: jest.fn() } },
        { provide: InventoryService, useValue: inventoryServiceMock },
        { provide: ItemSubtotalStep, useValue: createMockStep() },
        { provide: ServiceChargeStep, useValue: createMockStep() },
        { provide: DeliveryChargeStep, useValue: createMockStep() },
        { provide: SubtotalBeforeTaxStep, useValue: createMockStep() },
        { provide: TaxStep, useValue: createMockStep() },
        { provide: DiscountStep, useValue: createMockStep() },
        { provide: GrandTotalStep, useValue: createMockStep() },
        {
          provide: SessionsService,
          useValue: { getCurrentSession: jest.fn() },
        },
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService) as unknown as PrismaService;
  });

  beforeEach(async () => {
    sessionId = 'session-1';
    warehouseId = 'wh-1';
    productId = 'prod-1';
    movements.length = 0;
    stockByProduct.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should reject sale of item with zero stock', async () => {
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

  it('should reject sale when quantity exceeds available stock', async () => {
    stockByProduct.set(productId, 5);

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId,
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'Test Product AR',
          price: 50,
          quantity: 10,
        },
      ],
    };

    await expect(
      salesService.createOrder(order as any, 'user'),
    ).rejects.toThrow();
  });

  it('should allow sale when stock equals requested quantity', async () => {
    stockByProduct.set(productId, 5);

    const order = {
      type: 'TAKEAWAY' as const,
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

    const result = await salesService.createOrder(order as any, 'user');
    expect(result).toBeDefined();
  });

  it('should check stock before deducting', async () => {
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

    const movements = await prisma.inventoryMovement.findMany({
      where: { productId, warehouseId },
    });

    expect(movements.length).toBe(0);
  });
});
