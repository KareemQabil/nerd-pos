import { cn } from '../../lib/cn';

type NumberTextProps = {
  value: string | number;
  className?: string;
};

export function NumberText({ value, className }: NumberTextProps) {
  return (
    <span dir="ltr" className={cn('font-mono tabular-nums', className)}>
      {String(value)}
    </span>
  );
}
