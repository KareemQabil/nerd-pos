/**
 * FIN-07: Tax Calculation Rounding
 *
 * Tests that tax is calculated with exact precision using Decimal.js
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
import Decimal from 'decimal.js';

describe('FIN-07: Tax Calculation Rounding', () => {
  let salesService: SalesService;
  let prisma: PrismaService;
  let sessionId: string;
  let products: Array<{
    id: string;
    nameEn?: string | null;
    nameAr?: string | null;
  }>;

  beforeAll(async () => {
    const orders = new Map<string, any>();
    const repo = {
      createWithItems: jest.fn(async (data: any, items: any[]) => {
        const id = `order-${orders.size + 1}`;
        const order = { id, ...data, items };
        orders.set(id, order);
        return order;
      }),
    };
    const prismaMock: any = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
      inventoryItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prismaMock.$transaction = jest.fn((fn: any) => fn(prismaMock));
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
        { provide: PrismaService, useValue: prismaMock },
        { provide: OutboxService, useValue: { enqueue: jest.fn(), flushPending: jest.fn() } },
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
        {
          provide: InventoryService,
          useValue: {
            getDefaultWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
            deductStockWithTx: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService) as unknown as PrismaService;
  });

  beforeEach(async () => {
    sessionId = 'test-session';
    products = [
      { id: 'prod-1', nameEn: 'Item 1', nameAr: 'Item 1' },
      { id: 'prod-2', nameEn: 'Item 2', nameAr: 'Item 2' },
      { id: 'prod-3', nameEn: 'Item 3', nameAr: 'Item 3' },
    ];
    jest
      .spyOn(salesService as any, 'generateOrderNumber')
      .mockResolvedValue(`ORD-TEST-${Date.now()}`);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should calculate tax with exact precision (3 items x 10.00, 15% VAT)', async () => {
    const order = {
      type: 'TAKEAWAY' as const,
      sessionId,
      items: [
        {
          productId: products[0].id,
          name: products[0].nameEn || 'Item 1',
          nameAr: products[0].nameAr || 'Item 1',
          price: 10,
          quantity: 1,
        },
        {
          productId: products[1].id,
          name: products[1].nameEn || 'Item 2',
          nameAr: products[1].nameAr || 'Item 2',
          price: 10,
          quantity: 1,
        },
        {
          productId: products[2].id,
          name: products[2].nameEn || 'Item 3',
          nameAr: products[2].nameAr || 'Item 3',
          price: 10,
          quantity: 1,
        },
      ],
    };

    // Act: Calculate with 15% VAT
    // Expected: Each item tax = 10 x 0.15 = 1.50
    // Total tax = 1.50 x 3 = 4.50
    // Total = 30 + 4.50 = 34.50

    const result = await salesService.createOrder(order as any, 'test-user');

    // Assert: Tax = 4.50 (exact, no floating point errors)
    expect(result.taxAmount?.toString()).toBe('4.5');
    expect(result.grandTotal?.toString()).toBe('34.5');
  });

  it('should handle edge case: 10 / 3 split payment', async () => {
    // Order total: 10.00 SAR
    // Split into 3 equal payments: 3.33, 3.33, 3.34 (last absorbs remainder)

    const subtotal = new Decimal(10);
    const splitCount = 3;

    const payments: Decimal[] = [];
    let totalPaid = new Decimal(0);

    for (let i = 0; i < splitCount - 1; i++) {
      const amount = subtotal
        .dividedBy(splitCount)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      payments.push(amount);
      totalPaid = totalPaid.plus(amount);
    }

    // Last payment absorbs the remainder
    const remainder = subtotal.minus(totalPaid);
    payments.push(remainder.toDecimalPlaces(2, Decimal.ROUND_HALF_UP));
    totalPaid = totalPaid.plus(remainder);

    // Assert: Total = 10.00 exactly
    expect(totalPaid.toString()).toBe('10');
    expect(payments[0].toString()).toBe('3.33');
    expect(payments[1].toString()).toBe('3.33');
    expect(payments[2].toString()).toBe('3.34');
  });

  it('should not lose precision with repeated calculations', async () => {
    // Test Decimal.js precision preservation
    const price = new Decimal('10.555');
    const quantity = new Decimal('3');
    const taxRate = new Decimal('0.15');

    // Line total: 10.555 x 3 = 31.665 -> 31.67 (rounded)
    const lineTotal = price
      .times(quantity)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    expect(lineTotal.toString()).toBe('31.67');

    // Tax: 31.67 x 0.15 = 4.7505 -> 4.75 (rounded)
    const tax = lineTotal
      .times(taxRate)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    expect(tax.toString()).toBe('4.75');

    // Total: 31.67 + 4.75 = 36.42
    const total = lineTotal.plus(tax);
    expect(total.toString()).toBe('36.42');
  });
});
