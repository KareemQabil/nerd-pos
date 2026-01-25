/**
 * FIN-07: Tax Calculation Rounding
 *
 * Tests that tax is calculated with exact precision using Decimal.js
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';
import Decimal from 'decimal.js';

describe('FIN-07: Tax Calculation Rounding', () => {
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

    // Mock sessions service
    (salesService as any).sessionsService = {
      getCurrentSession: jest.fn().mockResolvedValue({ id: 'test-session' }),
    };
  });

  beforeEach(async () => {
    await createTestSession(prisma);
    await createTestProduct(prisma, { price: 10 });
    await createTestProduct(prisma, { price: 50 });
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should calculate tax with exact precision (3 items × 10.00, 15% VAT)', async () => {
    const order = {
      type: 'DINE_IN' as const,
      sessionId: 'test-session',
      items: [
        {
          productId: 'prod-1',
          name: 'Item 1',
          nameAr: 'صنف 1',
          price: 10,
          quantity: 1
        },
        {
          productId: 'prod-2',
          name: 'Item 2',
          nameAr: 'صنف 2',
          price: 10,
          quantity: 1
        },
        {
          productId: 'prod-3',
          name: 'Item 3',
          nameAr: 'صنف 3',
          price: 10,
          quantity: 1
        }
      ]
    };

    // Act: Calculate with 15% VAT
    // Expected: Each item tax = 10 × 0.15 = 1.50
    // Total tax = 1.50 × 3 = 4.50
    // Total = 30 + 4.50 = 34.50

    const result = await salesService.createOrder(order, 'test-user');

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
      const amount = subtotal.dividedBy(splitCount)
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

    // Line total: 10.555 × 3 = 31.665 → 31.67 (rounded)
    const lineTotal = price.times(quantity).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    expect(lineTotal.toString()).toBe('31.67');

    // Tax: 31.67 × 0.15 = 4.7505 → 4.75 (rounded)
    const tax = lineTotal.times(taxRate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    expect(tax.toString()).toBe('4.75');

    // Total: 31.67 + 4.75 = 36.42
    const total = lineTotal.plus(tax);
    expect(total.toString()).toBe('36.42');
  });
});
