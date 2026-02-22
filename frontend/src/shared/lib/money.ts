import Decimal from 'decimal.js';

Decimal.set({
  rounding: Decimal.ROUND_HALF_UP,
});

export type MoneyInput = Decimal.Value;

export function D(value: MoneyInput): Decimal {
  return new Decimal(value ?? 0);
}

export function roundMoney(value: MoneyInput, dp = 2): Decimal {
  return D(value).toDecimalPlaces(dp, Decimal.ROUND_HALF_UP);
}

export function add(a: MoneyInput, b: MoneyInput): Decimal {
  return D(a).plus(D(b));
}

export function sub(a: MoneyInput, b: MoneyInput): Decimal {
  return D(a).minus(D(b));
}

export function mul(a: MoneyInput, b: MoneyInput): Decimal {
  return D(a).times(D(b));
}

export function taxOf(subtotal: MoneyInput, rate: MoneyInput): Decimal {
  return roundMoney(mul(subtotal, rate), 2);
}

export function formatMoney(amount: MoneyInput, currency = 'SAR'): string {
  const value = roundMoney(amount, 2);
  return `${value.toFixed(2)} ${currency}`;
}
