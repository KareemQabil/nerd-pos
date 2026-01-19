// Rule Engine
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
// Evaluates business rules before operations

import { Injectable } from '@nestjs/common';
import {
  IBusinessRule,
  IRuleResult,
  IRuleContext,
} from './business-rule.interface';

export class RuleViolationError extends Error {
  constructor(public readonly violations: IRuleResult[]) {
    super(`Rule violations: ${violations.map((v) => v.message).join(', ')}`);
    this.name = 'RuleViolationError';
  }
}

@Injectable()
export class RuleEngine {
  private rules: Map<string, IBusinessRule<any>[]> = new Map();

  register<TContext>(entityType: string, rule: IBusinessRule<TContext>): void {
    if (!this.rules.has(entityType)) {
      this.rules.set(entityType, []);
    }
    this.rules.get(entityType)!.push(rule);
    // Sort by priority
    this.rules.get(entityType)!.sort((a, b) => a.priority - b.priority);
  }

  async evaluate<TContext extends IRuleContext>(
    context: TContext,
  ): Promise<IRuleResult[]> {
    const rules = this.rules.get(context.entityType) || [];
    const results: IRuleResult[] = [];

    for (const rule of rules) {
      const result = await rule.evaluate(context);
      results.push(result);
    }

    return results;
  }

  async enforceRules<TContext extends IRuleContext>(
    context: TContext,
  ): Promise<void> {
    const results = await this.evaluate(context);
    const violations = results.filter((r) => !r.passed);

    if (violations.length > 0) {
      throw new RuleViolationError(violations);
    }
  }
}
