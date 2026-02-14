// Step 4: Subtotal Before Tax (order: 40)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Sums itemSubtotal + serviceCharge + deliveryCharge

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';
import { ZATCAMath } from '../../../common/utils';

@Injectable()
export class SubtotalBeforeTaxStep implements ICalculationStep {
  order = 40;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    ctx.subtotalBeforeTax = ZATCAMath.roundSAR(
      ctx.itemSubtotal.plus(ctx.serviceCharge).plus(ctx.deliveryCharge),
    );
    return ctx;
  }
}
