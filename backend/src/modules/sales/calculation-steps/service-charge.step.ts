// Step 2: Service Charge (order: 20)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Applies 12% service charge for DINE_IN orders

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';

@Injectable()
export class ServiceChargeStep implements ICalculationStep {
  order = 20;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.orderType === 'DINE_IN') {
      ctx.serviceChargePercent = new Decimal(12); // 12% for dine-in
      ctx.serviceCharge = ctx.itemSubtotal
        .times(ctx.serviceChargePercent)
        .dividedBy(100)
        .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
    } else {
      ctx.serviceChargePercent = new Decimal(0);
      ctx.serviceCharge = new Decimal(0);
    }
    return ctx;
  }
}
