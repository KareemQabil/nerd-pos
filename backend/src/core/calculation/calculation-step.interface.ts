// Calculation Step Interface
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md + BACKEND/05-MODULE-SALES.md
// Used for 7-step calculation pipeline

import Decimal from 'decimal.js';

export interface ICalculationContext {
    itemSubtotal: Decimal;
    serviceChargeRate?: Decimal;
    serviceChargeAmount?: Decimal;
    deliveryCharge?: Decimal;
    subtotalBeforeTax: Decimal;
    taxRate: Decimal;
    taxAmount?: Decimal;
    discountAmount?: Decimal;
    grandTotal: Decimal;
    metadata?: Record<string, any>;
}

export interface ICalculationStep {
    readonly name: string;
    readonly order: number;
    execute(context: ICalculationContext): Promise<ICalculationContext>;
}
