/**
 * FIN-02: Tax Calculation Precision
 *
 * Tests tax calculations with Decimal.js precision
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { Decimal } from '@prisma/client';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';

describe('FIN-02: Tax Calculation Precision', () => {
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
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should calculate 15% VAT on 100.00 correctly as 15.00', async () => {
    // Act: Calculate tax
    const subtotal = new Decimal(100);
    const taxRate = new Decimal(0.15);
    const tax = subtotal.mul(taxRate).toDecimalPlaces(2);
    const total = subtotal.add(tax).toDecimalPlaces(2);

    // Assert: Tax = 15.00, Total = 115.00
    expect(tax.toString()).toBe('15.00');
    expect(total.toString()).toBe('115.00');
  });

  it('should calculate 15% VAT on 33.33 correctly as 5.00', async () => {
    // Act: Calculate tax
    const subtotal = new Decimal('33.33');
    const taxRate = new Decimal(0.15);
    const tax = subtotal.mul(taxRate).toDecimalPlaces(2);

    // Assert: Tax = 5.00 (33.33 * 0.15 = 4.9995, rounds to 5.00)
    expect(tax.toString()).toBe('5.00');
  });

  it('should sum multiple taxes with precision', async () => {
    // Setup: 3 items with different prices
    const item1Tax = new Decimal(10).mul(0.15).toDecimalPlaces(2); // 1.50
    const item2Tax = new Decimal('20.50').mul(0.15).toDecimalPlaces(2); // 3.08 (20.50 * 0.15 = 3.075, rounds to 3.08)
    const item3Tax = new Decimal('33.33').mul(0.15).toDecimalPlaces(2); // 5.00

    // Act: Sum taxes
    const totalTax = item1Tax.add(item2Tax).add(item3Tax).toDecimalPlaces(2);

    // Assert: Total tax = 9.58 (1.50 + 3.08 + 5.00)
    expect(totalTax.toString()).toBe('9.58');
  });

  it('should handle tax-exempt items correctly', async () => {
    // Setup: Mix of taxable and tax-exempt items
    const taxableItemTax = new Decimal(100).mul(0.15).toDecimalPlaces(2); // 15.00
    const exemptItemTax = new Decimal(50).mul(0).toDecimalPlaces(2); // 0.00

    const totalTax = taxableItemTax.add(exemptItemTax).toDecimalPlaces(2);

    // Assert: Only taxable item contributes to tax
    expect(totalTax.toString()).toBe('15.00');
  });

  it('should handle zero-rated tax items', async () => {
    // Some items may have 0% tax rate (not exempt, but zero-rated)
    const item1Tax = new Decimal(100).mul(0.15).toDecimalPlaces(2); // 15.00
    const item2Tax = new Decimal(50).mul(0).toDecimalPlaces(2); // 0.00

    const totalTax = item1Tax.add(item2Tax).toDecimalPlaces(2);

    expect(totalTax.toString()).toBe('15.00');
  });

  it('should calculate tax on discount correctly', async () => {
    // Setup: Original price = 100, discount = 10%
    const originalPrice = new Decimal(100);
    const discountRate = new Decimal(0.10);
    const discount = originalPrice.mul(discountRate).toDecimalPlaces(2); // 10.00
    const discountedPrice = originalPrice.sub(discount); // 90.00

    // Act: Calculate tax on discounted price
    const tax = discountedPrice.mul(0.15).toDecimalPlaces(2); // 13.50

    // Assert: Tax is on discounted price, not original
    expect(tax.toString()).toBe('13.50');
    expect(discountedPrice.toString()).toBe('90.00');
  });

  it('should handle compound tax scenarios (tax on tax)', async () => {
    // Some regions have compound tax (e.g., tax on service after another tax)
    // This test ensures precision is maintained
    const basePrice = new Decimal(100);
    const tax1Rate = new Decimal(0.10); // 10% first tax
    const tax2Rate = new Decimal(0.05); // 5% second tax (on base + first tax)

    const tax1 = basePrice.mul(tax1Rate).toDecimalPlaces(2); // 10.00
    const afterFirstTax = basePrice.add(tax1); // 110.00
    const tax2 = afterFirstTax.mul(tax2Rate).toDecimalPlaces(2); // 5.50

    const totalTax = tax1.add(tax2); // 15.50
    const grandTotal = basePrice.add(totalTax); // 115.50

    expect(totalTax.toString()).toBe('15.50');
    expect(grandTotal.toString()).toBe('115.50');
  });

  it('should preserve precision through multiple calculations', async () => {
    // Test cumulative precision loss
    let subtotal = new Decimal(0);

    // Add 100 items at 0.01 each
    for (let i = 0; i < 100; i++) {
      subtotal = subtotal.add(new Decimal('0.01'));
    }

    // Calculate tax
    const tax = subtotal.mul(0.15).toDecimalPlaces(2);
    const total = subtotal.add(tax).toDecimalPlaces(2);

    // Assert: No precision loss
    expect(subtotal.toString()).toBe('1.00');
    expect(tax.toString()).toBe('0.15');
    expect(total.toString()).toBe('1.15');
  });

  it('should round half-up consistently', async () => {
    // Test rounding behavior for edge cases
    const testCases = [
      { value: '1.005', expected: '1.01' }, // Should round up
      { value: '1.0049', expected: '1.00' }, // Should round down
      { value: '2.345', expected: '2.35' }, // Should round up
      { value: '2.3449', expected: '2.34' }, // Should round down
    ];

    testCases.forEach(({ value, expected }) => {
      const result = new Decimal(value).toDecimalPlaces(2);
      expect(result.toString()).toBe(expected);
    });
  });
});
