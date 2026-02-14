// Step 4.5: Discount Amount (order: 45) - ZATCA FIX: BEFORE TAX
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// ZATCA Compliance: Discount applied BEFORE tax calculation
// Forensic Audit Fix: Changed order from 60 to 45

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';
import { ZATCAMath } from '../../../common/utils';

@Injectable()
export class DiscountStep implements ICalculationStep {
  // ZATCA FIX: Changed from 60 to 45 (before tax at 50)
  order = 45;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.discount) {
      // ZATCA FIX: Apply discount to subtotal BEFORE tax (was subtotalBeforeTax + taxAmount)
      const discountBase = ctx.subtotalBeforeTax;

      if (ctx.discount.type === 'PERCENTAGE') {
        ctx.discountAmount = ZATCAMath.roundSAR(
          discountBase.times(ctx.discount.value).dividedBy(100),
        );
      } else {
        // FIXED discount
        ctx.discountAmount = new Decimal(ctx.discount.value);
      }

      // Ensure discount doesn't exceed subtotal
      if (ctx.discountAmount.greaterThan(discountBase)) {
        ctx.discountAmount = discountBase;
      }

      // ZATCA FIX: Calculate discounted subtotal for tax calculation
      ctx.discountedSubtotal = discountBase.minus(ctx.discountAmount);
    } else {
      ctx.discountAmount = new Decimal(0);
      ctx.discountedSubtotal = ctx.subtotalBeforeTax;
    }
    return ctx;
  }
}
