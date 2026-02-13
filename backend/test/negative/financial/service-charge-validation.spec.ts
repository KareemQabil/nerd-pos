/**
 * FIN-10: Takeaway Service Charge
 *
 * Tests that service charge applies only to DINE_IN orders
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

describe('FIN-10: Takeaway Service Charge', () => {
  let salesService: SalesService;
  let prisma: { $transaction: jest.Mock; $executeRaw: jest.Mock; $queryRaw: jest.Mock };
  let outboxService: { enqueue: jest.Mock; flushPending: jest.Mock };
  let sessionId: string;
  let productId: string;
  let productNameEn: string;
  let productNameAr: string;

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
    outboxService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      flushPending: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
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
          provide: InventoryService,
          useValue: {
            getDefaultWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
            deductStockWithTx: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: SessionsService,
          useValue: { getCurrentSession: jest.fn() },
        },
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    await module.init();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService) as unknown as typeof prisma;
  });

  beforeEach(async () => {
    sessionId = `sess-${Date.now()}`;
    productId = `prod-${Date.now()}`;
    productNameEn = 'Test Product';
    productNameAr = 'Test Product AR';
    jest
      .spyOn(salesService as any, 'generateOrderNumber')
      .mockResolvedValue(`TEST-${Date.now()}`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should not apply service charge to TAKEAWAY order', async () => {
    const result = await salesService.createOrder(
      {
        type: 'TAKEAWAY',
        sessionId,
        items: [
          {
            productId,
            name: productNameEn,
            nameAr: productNameAr,
            price: 100,
            quantity: 1,
          },
        ],
      } as any,
      'test-user',
    );

    expect(result.serviceChargeAmount?.toString()).toBe('0');
    expect(result.serviceChargeRate?.toString()).toBe('0');
  });

  it('should apply service charge to DINE_IN order', async () => {
    const result = await salesService.createOrder(
      {
        type: 'DINE_IN',
        sessionId,
        items: [
          {
            productId,
            name: productNameEn,
            nameAr: productNameAr,
            price: 100,
            quantity: 1,
          },
        ],
      } as any,
      'test-user',
    );

    expect(result.serviceChargeAmount?.toString()).toBe('12');
    expect(result.serviceChargeRate?.toString()).toBe('0.12');
  });

  it('should not apply service charge to DELIVERY order', async () => {
    const result = await salesService.createOrder(
      {
        type: 'DELIVERY',
        sessionId,
        items: [
          {
            productId,
            name: productNameEn,
            nameAr: productNameAr,
            price: 100,
            quantity: 1,
          },
        ],
      } as any,
      'test-user',
    );

    expect(result.serviceChargeAmount?.toString()).toBe('0');
    expect(result.serviceChargeRate?.toString()).toBe('0');
  });
});
