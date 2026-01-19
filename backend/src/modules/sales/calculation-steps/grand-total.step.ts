// Step 7: Grand Total (order: 70)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Final calculation: subtotalBeforeTax + taxAmount - discountAmount

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';

@Injectable()
export class GrandTotalStep implements ICalculationStep {
  order = 70;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.grandTotal = ctx.subtotalBeforeTax
      .plus(ctx.taxAmount)
      .minus(ctx.discountAmount)
      .toDecimalPlaces(2);

    // Ensure non-negative
    if (ctx.grandTotal.lessThan(0)) {
      ctx.grandTotal = new Decimal(0);
    }

    return ctx;
  }
}
