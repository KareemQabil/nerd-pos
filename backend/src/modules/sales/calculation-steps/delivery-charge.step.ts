// Step 3: Delivery Charge (order: 30)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Applies delivery zone charge for DELIVERY orders

import { Injectable } from '@nestjs/common';
import {
  ICalculationStep,
  CalculationContext,
} from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';

@Injectable()
export class DeliveryChargeStep implements ICalculationStep {
  order = 30;

  async execute(ctx: CalculationContext): Promise<CalculationContext> {
    if (ctx.orderType === 'DELIVERY' && ctx.deliveryZoneCharge) {
      ctx.deliveryCharge = new Decimal(ctx.deliveryZoneCharge);
    } else {
      ctx.deliveryCharge = new Decimal(0);
    }
    return ctx;
  }
}
