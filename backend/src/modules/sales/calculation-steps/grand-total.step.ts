// Step 7: Grand Total (order: 70)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// ZATCA Compliance: Grand Total = Discounted Subtotal + Tax
// Forensic Audit Fix: Updated formula to use discountedSubtotal

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';
import { ZATCAMath } from '../../../common/utils';

@Injectable()
export class GrandTotalStep implements ICalculationStep {
  order = 70;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    // ZATCA FIX: Grand Total = Discounted Subtotal + Tax
    // (discount already subtracted from subtotalBeforeTax)
    const base = ctx.discountedSubtotal || ctx.subtotalBeforeTax;

    ctx.grandTotal = ZATCAMath.roundSAR(base.plus(ctx.taxAmount));

    // Ensure non-negative
    if (ctx.grandTotal.lessThan(0)) {
      ctx.grandTotal = new Decimal(0);
    }

    return ctx;
  }
}
