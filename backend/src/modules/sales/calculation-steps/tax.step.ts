// Step 5: Tax Amount (order: 50)
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Applies 15% VAT on subtotalBeforeTax

import { Injectable } from '@nestjs/common';
import { ICalculationStep, CalculationContext } from '../../../core/calculation/calculation-step.interface';
import Decimal from 'decimal.js';

@Injectable()
export class TaxStep implements ICalculationStep {
    order = 50;

    async execute(ctx: CalculationContext): Promise<CalculationContext> {
        // 15% VAT (Saudi Arabia standard)
        ctx.taxPercent = new Decimal(15);
        ctx.taxAmount = ctx.subtotalBeforeTax
            .times(ctx.taxPercent)
            .dividedBy(100)
            .toDecimalPlaces(2);
        return ctx;
    }
}
