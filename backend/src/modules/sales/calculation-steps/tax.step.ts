// Step 5: Tax Amount (order: 50)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// ZATCA Compliance: Uses banker's rounding and calculates tax on discounted subtotal
// Forensic Audit Fix: Added banker's rounding, use discountedSubtotal as base

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';

@Injectable()
export class TaxStep implements ICalculationStep {
  order = 50;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    // 15% VAT (Saudi Arabia standard)
    ctx.taxPercent = new Decimal(15);

    // ZATCA FIX: Use discountedSubtotal (after discount) as tax base
    // Falls back to subtotalBeforeTax if no discount was applied
    const taxBase = ctx.discountedSubtotal || ctx.subtotalBeforeTax;

    ctx.taxAmount = taxBase
      .times(ctx.taxPercent)
      .dividedBy(100)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN); // Banker's rounding

    return ctx;
  }
}
