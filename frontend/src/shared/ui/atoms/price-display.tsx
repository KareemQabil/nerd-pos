import { cn } from '../../lib/cn';
import { formatMoney, type MoneyInput } from '../../lib/money';

type PriceDisplayProps = {
  amount: unknown;
  currency?: string;
  className?: string;
};

export function PriceDisplay({ amount, currency = 'SAR', className }: PriceDisplayProps) {
  const text = formatMoney(amount as MoneyInput, currency);

  return (
    <span dir="ltr" className={cn('font-mono tabular-nums', className)}>
      {text}
    </span>
  );
}
