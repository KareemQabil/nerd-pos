// Business Rule Interface
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md

export interface IRuleResult {
  passed: boolean;
  message?: string;
  code?: string;
}

export interface IBusinessRule<TContext> {
  readonly name: string;
  readonly priority: number;

  evaluate(context: TContext): Promise<IRuleResult>;
}

export interface IRuleContext {
  readonly entityType: string;
  readonly entityId: string;
  readonly action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  readonly data: any;
  metadata: Record<string, any>;
}
