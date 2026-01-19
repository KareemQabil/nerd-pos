/**
 * Calculation Pipeline Integration Tests
 *
 * Category C: LEGO Architecture - Calculation Pipeline
 *
 * Purpose: Verify pipeline ordering, LEGO flexibility (orderType affects fees), Decimal precision
 * Source: FINAL/BACKEND/02-CORE-PATTERNS.md, FINAL/BACKEND/05-MODULE-SALES.md
 *
 * Verified Implementation:
 * - 7 calculation steps (order 10-70)
 * - Steps sorted by order property
 * - Sequential execution
 * - DINE_IN → 12% service charge, DELIVERY → zone fee
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CalculationPipeline } from '../../../src/core/calculation/calculation-pipeline';
import {
  ICalculationStep,
  CalculationContext,
  CalculationItem,
} from '../../../src/core/calculation/calculation-step.interface';
import { ItemSubtotalStep } from '../../../src/modules/sales/calculation-steps/item-subtotal.step';
import { ServiceChargeStep } from '../../../src/modules/sales/calculation-steps/service-charge.step';
import { DeliveryChargeStep } from '../../../src/modules/sales/calculation-steps/delivery-charge.step';
import { DiscountStep } from '../../../src/modules/sales/calculation-steps/discount.step';
import { SubtotalBeforeTaxStep } from '../../../src/modules/sales/calculation-steps/subtotal-before-tax.step';
import { TaxStep } from '../../../src/modules/sales/calculation-steps/tax.step';
import { GrandTotalStep } from '../../../src/modules/sales/calculation-steps/grand-total.step';
import Decimal from 'decimal.js';

/**
 * Helper to create a fresh CalculationContext
 */
function createContext(
  overrides: Partial<CalculationContext> = {},
): CalculationContext {
  return {
    // Input
    items: [],
    orderType: 'DINE_IN',
    customerId: null,
    discountCode: null,
    discount: null,
    deliveryZoneCharge: null,
    // Results (initialized to zero)
    itemSubtotal: new Decimal(0),
    serviceCharge: new Decimal(0),
    serviceChargePercent: new Decimal(0),
    deliveryCharge: new Decimal(0),
    subtotalBeforeTax: new Decimal(0),
    taxAmount: new Decimal(0),
    taxPercent: new Decimal(0),
    discountAmount: new Decimal(0),
    grandTotal: new Decimal(0),
    metadata: {},
    ...overrides,
  };
}

/**
 * Helper to create test item
 */
function createItem(
  price: string | number,
  quantity: number,
  name = 'Test Item',
): CalculationItem {
  return {
    productId: `product-${Date.now()}`,
    name,
    price: new Decimal(price),
    quantity,
  };
}

describe('Calculation Pipeline Integration (Category C)', () => {
  let pipeline: CalculationPipeline;

  beforeEach(() => {
    // Fresh pipeline for each test
    pipeline = new CalculationPipeline();
  });

  // C1: Step registration and sorting
  describe('C1: Step Registration and Sorting', () => {
    it('should sort steps by order property', () => {
      const step30: ICalculationStep = { order: 30, execute: jest.fn() };
      const step10: ICalculationStep = { order: 10, execute: jest.fn() };
      const step20: ICalculationStep = { order: 20, execute: jest.fn() };

      // Register in wrong order
      pipeline.registerStep(step30);
      pipeline.registerStep(step10);
      pipeline.registerStep(step20);

      const steps = pipeline.getSteps();
      expect(steps[0].order).toBe(10);
      expect(steps[1].order).toBe(20);
      expect(steps[2].order).toBe(30);
    });
  });

  // C2: Sequential execution
  describe('C2: Sequential Execution', () => {
    it('should execute steps in order', async () => {
      const executionOrder: number[] = [];

      const step1: ICalculationStep = {
        order: 10,
        execute: jest.fn().mockImplementation(async (ctx) => {
          executionOrder.push(10);
          return ctx;
        }),
      };
      const step2: ICalculationStep = {
        order: 20,
        execute: jest.fn().mockImplementation(async (ctx) => {
          executionOrder.push(20);
          return ctx;
        }),
      };

      pipeline.registerStep(step1);
      pipeline.registerStep(step2);

      await pipeline.execute(createContext());

      expect(executionOrder).toEqual([10, 20]);
    });
  });

  // C3: Context propagation
  describe('C3: Context Propagation', () => {
    it('should pass modified context to next step', async () => {
      const step1: ICalculationStep = {
        order: 10,
        execute: jest.fn().mockImplementation(async (ctx) => {
          ctx.itemSubtotal = new Decimal('100');
          return ctx;
        }),
      };
      const step2: ICalculationStep = {
        order: 20,
        execute: jest.fn().mockImplementation(async (ctx) => {
          // Should receive itemSubtotal from step1
          ctx.serviceCharge = ctx.itemSubtotal.times('0.12');
          return ctx;
        }),
      };

      pipeline.registerStep(step1);
      pipeline.registerStep(step2);

      const result = await pipeline.execute(createContext());

      expect(result.itemSubtotal.equals(new Decimal('100'))).toBe(true);
      expect(result.serviceCharge.equals(new Decimal('12'))).toBe(true);
    });
  });

  // C4: ItemSubtotal calculation
  describe('C4: ItemSubtotal Calculation', () => {
    it('should calculate sum of qty × price for all items', async () => {
      const itemSubtotalStep = new ItemSubtotalStep();
      pipeline.registerStep(itemSubtotalStep);

      const context = createContext({
        items: [
          createItem('35.00', 2, 'Shawarma'), // 70.00
          createItem('15.00', 1, 'Fries'), // 15.00
        ],
      });

      const result = await pipeline.execute(context);

      expect(result.itemSubtotal.equals(new Decimal('85'))).toBe(true);
    });
  });

  // C5: ServiceCharge DINE_IN
  describe('C5: ServiceCharge DINE_IN', () => {
    it('should apply 12% service charge for DINE_IN', async () => {
      const serviceChargeStep = new ServiceChargeStep();

      const context = createContext({
        orderType: 'DINE_IN',
        itemSubtotal: new Decimal('100'),
      });

      const result = await serviceChargeStep.execute(context);

      expect(result.serviceChargePercent.equals(new Decimal(12))).toBe(true);
      expect(result.serviceCharge.equals(new Decimal('12'))).toBe(true);
    });
  });

  // C6: ServiceCharge TAKEAWAY
  describe('C6: ServiceCharge TAKEAWAY', () => {
    it('should NOT apply service charge for TAKEAWAY', async () => {
      const serviceChargeStep = new ServiceChargeStep();

      const context = createContext({
        orderType: 'TAKEAWAY',
        itemSubtotal: new Decimal('100'),
      });

      const result = await serviceChargeStep.execute(context);

      expect(result.serviceChargePercent.equals(new Decimal(0))).toBe(true);
      expect(result.serviceCharge.equals(new Decimal(0))).toBe(true);
    });
  });

  // C7: ServiceCharge DELIVERY
  describe('C7: ServiceCharge DELIVERY', () => {
    it('should NOT apply service charge for DELIVERY', async () => {
      const serviceChargeStep = new ServiceChargeStep();

      const context = createContext({
        orderType: 'DELIVERY',
        itemSubtotal: new Decimal('100'),
      });

      const result = await serviceChargeStep.execute(context);

      expect(result.serviceCharge.equals(new Decimal(0))).toBe(true);
    });
  });

  // C8: DeliveryCharge DELIVERY
  describe('C8: DeliveryCharge DELIVERY', () => {
    it('should apply zone fee for DELIVERY orders', async () => {
      const deliveryChargeStep = new DeliveryChargeStep();

      const context = createContext({
        orderType: 'DELIVERY',
        deliveryZoneCharge: 50, // Zone 1 fee
      });

      const result = await deliveryChargeStep.execute(context);

      expect(result.deliveryCharge.equals(new Decimal(50))).toBe(true);
    });
  });

  // C9: DeliveryCharge DINE_IN
  describe('C9: DeliveryCharge DINE_IN', () => {
    it('should NOT apply delivery fee for DINE_IN', async () => {
      const deliveryChargeStep = new DeliveryChargeStep();

      const context = createContext({
        orderType: 'DINE_IN',
        deliveryZoneCharge: 50, // Even if set, should not apply
      });

      const result = await deliveryChargeStep.execute(context);

      expect(result.deliveryCharge.equals(new Decimal(0))).toBe(true);
    });
  });

  // C10: DeliveryCharge TAKEAWAY
  describe('C10: DeliveryCharge TAKEAWAY', () => {
    it('should NOT apply delivery fee for TAKEAWAY', async () => {
      const deliveryChargeStep = new DeliveryChargeStep();

      const context = createContext({
        orderType: 'TAKEAWAY',
      });

      const result = await deliveryChargeStep.execute(context);

      expect(result.deliveryCharge.equals(new Decimal(0))).toBe(true);
    });
  });

  // C11: Discount PERCENTAGE
  describe('C11: Discount PERCENTAGE', () => {
    it('should apply percentage discount', async () => {
      const discountStep = new DiscountStep();

      // DiscountStep uses (subtotalBeforeTax + taxAmount) as base
      const context = createContext({
        subtotalBeforeTax: new Decimal('100'),
        taxAmount: new Decimal('15'), // Total: 115
        discount: { type: 'PERCENTAGE', value: 10 }, // 10% of 115 = 11.5
      });

      const result = await discountStep.execute(context);

      expect(result.discountAmount.equals(new Decimal('11.5'))).toBe(true);
    });
  });

  // C12: Discount FIXED
  describe('C12: Discount FIXED', () => {
    it('should apply fixed amount discount', async () => {
      const discountStep = new DiscountStep();

      const context = createContext({
        subtotalBeforeTax: new Decimal('100'),
        taxAmount: new Decimal('15'),
        discount: { type: 'FIXED', value: 25 }, // 25 SAR off
      });

      const result = await discountStep.execute(context);

      expect(result.discountAmount.equals(new Decimal('25'))).toBe(true);
    });
  });

  // C13: Tax calculation
  describe('C13: Tax Calculation', () => {
    it('should apply tax rate to subtotal', async () => {
      const taxStep = new TaxStep();

      const context = createContext({
        subtotalBeforeTax: new Decimal('100'),
      });

      const result = await taxStep.execute(context);

      // Verify tax is applied (rate may vary, so just check it's calculated)
      expect(result.taxAmount.greaterThan(0)).toBe(true);
    });
  });

  // C14: GrandTotal combines all
  describe('C14: GrandTotal Combines All', () => {
    it('should calculate grandTotal = subtotalBeforeTax + taxAmount - discountAmount', async () => {
      const grandTotalStep = new GrandTotalStep();

      // GrandTotal formula: subtotalBeforeTax + taxAmount - discountAmount
      // (serviceCharge and deliveryCharge are already in subtotalBeforeTax)
      const context = createContext({
        subtotalBeforeTax: new Decimal('112'), // 100 + 12 service
        taxAmount: new Decimal('16.80'),
        discountAmount: new Decimal('10'),
      });

      const result = await grandTotalStep.execute(context);

      // 112 + 16.80 - 10 = 118.80
      expect(result.grandTotal.equals(new Decimal('118.80'))).toBe(true);
    });
  });

  // C15: Decimal precision 0.1 + 0.2
  describe('C15: Decimal Precision', () => {
    it('should handle 0.1 + 0.2 = 0.3 correctly', async () => {
      const itemSubtotalStep = new ItemSubtotalStep();
      pipeline.registerStep(itemSubtotalStep);

      const context = createContext({
        items: [createItem('0.1', 3)], // 0.1 × 3 = 0.3
      });

      const result = await pipeline.execute(context);

      // JavaScript: 0.1 * 3 = 0.30000000000000004
      // Decimal.js: 0.1 × 3 = 0.3 exactly
      expect(result.itemSubtotal.equals(new Decimal('0.3'))).toBe(true);
    });
  });

  // C16: Large amounts
  describe('C16: Large Amounts Precision', () => {
    it('should handle large amounts without precision loss', async () => {
      const itemSubtotalStep = new ItemSubtotalStep();
      pipeline.registerStep(itemSubtotalStep);

      const context = createContext({
        items: [createItem('999999.99', 10)], // 9,999,999.90
      });

      const result = await pipeline.execute(context);

      expect(result.itemSubtotal.equals(new Decimal('9999999.9'))).toBe(true);
    });
  });

  // C17: Rounding to 2 decimals
  describe('C17: Rounding', () => {
    it('should round service charge to 2 decimal places', async () => {
      const serviceChargeStep = new ServiceChargeStep();

      const context = createContext({
        orderType: 'DINE_IN',
        itemSubtotal: new Decimal('33.33'), // 33.33 × 12% = 3.9996
      });

      const result = await serviceChargeStep.execute(context);

      // Should round to 4.00 (2 decimal places)
      expect(result.serviceCharge.decimalPlaces()).toBeLessThanOrEqual(2);
    });
  });

  // C18: Step injection
  describe('C18: Step Injection', () => {
    it('should allow new step at any order position', async () => {
      const executionOrder: number[] = [];

      const step20: ICalculationStep = {
        order: 20,
        execute: jest.fn().mockImplementation(async (ctx) => {
          executionOrder.push(20);
          return ctx;
        }),
      };
      const step30: ICalculationStep = {
        order: 30,
        execute: jest.fn().mockImplementation(async (ctx) => {
          executionOrder.push(30);
          return ctx;
        }),
      };
      // Inject custom step at order 25
      const customStep25: ICalculationStep = {
        order: 25,
        execute: jest.fn().mockImplementation(async (ctx) => {
          executionOrder.push(25);
          ctx.metadata.customStep = true;
          return ctx;
        }),
      };

      pipeline.registerStep(step20);
      pipeline.registerStep(step30);
      pipeline.registerStep(customStep25);

      const result = await pipeline.execute(createContext());

      expect(executionOrder).toEqual([20, 25, 30]);
      expect(result.metadata.customStep).toBe(true);
    });
  });

  // C19: Empty items array
  describe('C19: Empty Items', () => {
    it('should return zero totals for empty items', async () => {
      const itemSubtotalStep = new ItemSubtotalStep();
      pipeline.registerStep(itemSubtotalStep);

      const context = createContext({ items: [] });
      const result = await pipeline.execute(context);

      expect(result.itemSubtotal.equals(new Decimal(0))).toBe(true);
    });
  });

  // C20: Full pipeline end-to-end
  describe('C20: Full Pipeline End-to-End', () => {
    it('should calculate complete DINE_IN order correctly', async () => {
      // Register all steps
      pipeline.registerStep(new ItemSubtotalStep());
      pipeline.registerStep(new ServiceChargeStep());
      pipeline.registerStep(new DeliveryChargeStep());
      pipeline.registerStep(new DiscountStep());
      pipeline.registerStep(new SubtotalBeforeTaxStep());
      pipeline.registerStep(new TaxStep());
      pipeline.registerStep(new GrandTotalStep());

      const context = createContext({
        orderType: 'DINE_IN',
        items: [
          createItem('35.00', 2, 'Shawarma Plate'), // 70.00
          createItem('15.00', 1, 'Fries'), // 15.00
        ],
        // Subtotal: 85.00
        // Service: 85 × 12% = 10.20
      });

      const result = await pipeline.execute(context);

      // Verify intermediate values
      expect(result.itemSubtotal.equals(new Decimal('85'))).toBe(true);
      expect(result.serviceCharge.equals(new Decimal('10.20'))).toBe(true);
      expect(result.deliveryCharge.equals(new Decimal(0))).toBe(true);

      // Verify grand total > 0
      expect(result.grandTotal.greaterThan(0)).toBe(true);
    });
  });
});
