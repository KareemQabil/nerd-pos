// Step 1: Item Subtotal (order: 10)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Calculates sum of (item.price + modifiers) * quantity

import { Injectable } from '@nestjs/common';
import { ICalculationStep, CalculationContext } from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';

@Injectable()
export class ItemSubtotalStep implements ICalculationStep {
    order = 10;

    async execute(ctx: CalculationContext): Promise<CalculationContext> {
        ctx.itemSubtotal = ctx.items.reduce((sum, item) => {
            let itemPrice = new Decimal(item.price);

            // Add modifier prices
            if (item.modifiers && item.modifiers.length > 0) {
                const modifierTotal = item.modifiers.reduce(
                    (modSum, mod) => modSum.plus(new Decimal(mod.price)),
                    new Decimal(0),
                );
                itemPrice = itemPrice.plus(modifierTotal);
            }

            const itemSubtotal = itemPrice.times(item.quantity);
            return sum.plus(itemSubtotal);
        }, new Decimal(0));

        return ctx;
    }
}
