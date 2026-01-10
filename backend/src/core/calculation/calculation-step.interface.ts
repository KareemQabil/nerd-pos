// Calculation Step Interface
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md + BACKEND/05-MODULE-SALES.md
// Used for 7-step calculation pipeline

import Decimal from 'decimal.js';

export interface CalculationItem {
    productId: string;
    name: string;
    price: Decimal;
    quantity: number;
    modifiers?: { price: Decimal }[];
}

export interface CalculationDiscount {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    code?: string;
}

export interface CalculationContext {
    // Input
    items: CalculationItem[];
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    customerId: string | null;
    discountCode: string | null;
    discount: CalculationDiscount | null;
    deliveryZoneCharge: number | null;

    // 7-Step Calculation Results
    itemSubtotal: Decimal;
    serviceCharge: Decimal;
    serviceChargePercent: Decimal;
    deliveryCharge: Decimal;
    subtotalBeforeTax: Decimal;
    taxAmount: Decimal;
    taxPercent: Decimal;
    discountAmount: Decimal;
    grandTotal: Decimal;

    // Metadata
    metadata: Record<string, any>;
}

export interface ICalculationStep {
    readonly order: number;
    execute(context: CalculationContext): Promise<CalculationContext>;
}

// Legacy interface for compatibility
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
