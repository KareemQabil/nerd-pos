/**
 * SES-02: Order Without Session
 *
 * Tests that orders cannot be created without a valid session
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
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';

function createMockStep() {
  return {
    order: 0,
    execute: jest.fn(async (ctx) => ctx),
  };
}

describe('SES-02: Order Without Session', () => {
  let salesService: SalesService;
  let prisma: { $transaction: jest.Mock; $executeRaw: jest.Mock; $queryRaw: jest.Mock };

  beforeAll(async () => {
    const repo = {
      createWithItems: jest.fn(async (orderData: any, items: any[]) => ({
        id: `order-${Date.now()}`,
        ...orderData,
        items,
      })),
    };
    prisma = {
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
    };
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
        { provide: OutboxService, useValue: { enqueue: jest.fn(), flushPending: jest.fn() } },
        { provide: ItemSubtotalStep, useValue: createMockStep() },
        { provide: ServiceChargeStep, useValue: createMockStep() },
        { provide: DeliveryChargeStep, useValue: createMockStep() },
        { provide: SubtotalBeforeTaxStep, useValue: createMockStep() },
        { provide: TaxStep, useValue: createMockStep() },
        { provide: DiscountStep, useValue: createMockStep() },
        { provide: GrandTotalStep, useValue: createMockStep() },
        {
          provide: InventoryService,
          useValue: {
            getDefaultWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
            deductStockWithTx: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SessionsService,
          useValue: { getCurrentSession: jest.fn().mockResolvedValue(null) },
        },
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService) as unknown as typeof prisma;
  });

  beforeEach(() => {
    jest
      .spyOn(salesService as any, 'generateOrderNumber')
      .mockResolvedValue(`TEST-${Date.now()}`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should reject order when no active session exists', async () => {
    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: undefined, // No session
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1,
        },
      ],
    };

    // Act & Assert
    await expect(
      salesService.createOrder(order as any, 'user'),
    ).rejects.toThrow();
  });

  it('should reject order when sessionId is null', async () => {
    const order = {
      type: 'DINE_IN' as const,
      sessionId: null,
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1,
        },
      ],
    };

    // Act & Assert
    await expect(
      salesService.createOrder(order as any, 'user'),
    ).rejects.toThrow();
  });

  it('should reject order when sessionId is empty string', async () => {
    const order = {
      type: 'DINE_IN' as const,
      sessionId: '',
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1,
        },
      ],
    };

    // Act & Assert
    await expect(
      salesService.createOrder(order as any, 'user'),
    ).rejects.toThrow();
  });

  it('should accept order when valid session is provided', async () => {
    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'SESS-TEST',
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1,
        },
      ],
    };

    // Act & Assert
    const result = await salesService.createOrder(order, 'user');
    expect(result).toBeDefined();
  });
});
