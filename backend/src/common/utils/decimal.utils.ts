// Decimal Utilities
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md
// CRITICAL: All money calculations MUST use Decimal.js

import Decimal from 'decimal.js';

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,
  // Banker's rounding for financial compliance
  rounding: Decimal.ROUND_HALF_EVEN,
});

export const DecimalUtils = {
  /**
   * Create a Decimal from any value, safely handling undefined/null
   */
  from(value: number | string | Decimal | null | undefined): Decimal {
    if (value === null || value === undefined) {
      return new Decimal(0);
    }
    return new Decimal(value);
  },

  /**
   * Add two decimal values
   */
  add(a: number | Decimal, b: number | Decimal): Decimal {
    return new Decimal(a).plus(b);
  },

  /**
   * Subtract b from a
   */
  subtract(a: number | Decimal, b: number | Decimal): Decimal {
    return new Decimal(a).minus(b);
  },

  /**
   * Multiply two values
   */
  multiply(a: number | Decimal, b: number | Decimal): Decimal {
    return new Decimal(a).times(b);
  },

  /**
   * Divide a by b
   */
  divide(a: number | Decimal, b: number | Decimal): Decimal {
    return new Decimal(a).dividedBy(b);
  },

  /**
   * Round to 2 decimal places (for money)
   */
  roundMoney(value: Decimal): Decimal {
    return value.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
  },

  /**
   * Round to 3 decimal places (for Gulf currencies with fils)
   */
  roundGulf(value: Decimal): Decimal {
    return value.toDecimalPlaces(3, Decimal.ROUND_HALF_EVEN);
  },

  /**
   * Calculate percentage
   */
  percentage(value: Decimal, percent: number): Decimal {
    return value.times(percent).dividedBy(100);
  },

  /**
   * Convert to number for storage (use with caution)
   */
  toNumber(value: Decimal): number {
    return value.toNumber();
  },

  /**
   * Convert to string for display/API
   */
  toString(value: Decimal): string {
    return value.toString();
  },

  /**
   * Check if value is zero
   */
  isZero(value: Decimal): boolean {
    return value.isZero();
  },

  /**
   * Check if value is positive
   */
  isPositive(value: Decimal): boolean {
    return value.isPositive() && !value.isZero();
  },

  /**
   * Check if value is negative
   */
  isNegative(value: Decimal): boolean {
    return value.isNegative();
  },
};
