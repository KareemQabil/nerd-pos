// Step 6: Discount Amount (order: 60)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Applies discount (percentage or fixed)

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';

@Injectable()
export class DiscountStep implements ICalculationStep {
  order = 60;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.discount) {
      const totalBeforeDiscount = ctx.subtotalBeforeTax.plus(ctx.taxAmount);

      if (ctx.discount.type === 'PERCENTAGE') {
        ctx.discountAmount = totalBeforeDiscount
          .times(ctx.discount.value)
          .dividedBy(100)
          .toDecimalPlaces(2);
      } else {
        // FIXED discount
        ctx.discountAmount = new Decimal(ctx.discount.value);
      }

      // Ensure discount doesn't exceed total
      if (ctx.discountAmount.greaterThan(totalBeforeDiscount)) {
        ctx.discountAmount = totalBeforeDiscount;
      }
    } else {
      ctx.discountAmount = new Decimal(0);
    }
    return ctx;
  }
}
