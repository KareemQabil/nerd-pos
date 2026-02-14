import Decimal from 'decimal.js';

// ZATCA-compliant rounding and totals
// Uses ROUND_HALF_UP per project directive.

export class ZATCAMath {
  static roundSAR(value: Decimal): Decimal {
    return value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  static round(value: Decimal, places: number): Decimal {
    return value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP);
  }

  static calculateLineTotal(
    unitPrice: Decimal,
    modifiers: Decimal,
    quantity: Decimal,
  ): Decimal {
    const total = unitPrice.plus(modifiers).times(quantity);
    return this.roundSAR(total);
  }

  static calculateVAT(subtotal: Decimal, taxRate: Decimal): Decimal {
    const vat = subtotal.times(taxRate);
    return this.roundSAR(vat);
  }

  static calculateInvoiceTotals(lineItems: Array<{
    unitPrice: number;
    modifiers: number;
    quantity: number;
  }>): {
    lineItems: Array<{ lineTotal: Decimal }>;
    subtotal: Decimal;
    vat: Decimal;
    grandTotal: Decimal;
  } {
    const roundedLines = lineItems.map((item) => ({
      lineTotal: this.calculateLineTotal(
        new Decimal(item.unitPrice),
        new Decimal(item.modifiers),
        new Decimal(item.quantity),
      ),
    }));

    const subtotal = roundedLines.reduce(
      (sum, line) => sum.plus(line.lineTotal),
      new Decimal(0),
    );

    const vat = this.calculateVAT(subtotal, new Decimal(0.15));
    const grandTotal = subtotal.plus(vat);

    return { lineItems: roundedLines, subtotal, vat, grandTotal };
  }

  static validateInvoiceTotals(
    lineItems: Decimal[],
    subtotal: Decimal,
    vat: Decimal,
    grandTotal: Decimal,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const calculatedSubtotal = lineItems.reduce(
      (sum, line) => sum.plus(line),
      new Decimal(0),
    );
    if (!calculatedSubtotal.equals(subtotal)) {
      errors.push(
        `Subtotal mismatch: ${calculatedSubtotal.toFixed(2)} != ${subtotal.toFixed(2)}`,
      );
    }

    const calculatedGrandTotal = subtotal.plus(vat);
    if (!calculatedGrandTotal.equals(grandTotal)) {
      errors.push(
        `Grand total mismatch: ${calculatedGrandTotal.toFixed(2)} != ${grandTotal.toFixed(2)}`,
      );
    }

    return { valid: errors.length === 0, errors };
  }
}
