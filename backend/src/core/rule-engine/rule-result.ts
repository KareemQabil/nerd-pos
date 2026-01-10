// Rule Result
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md line 41
// Result from business rule evaluation

export interface RuleResult {
    passed: boolean;
    ruleName: string;
    message?: string;
    violations?: RuleViolation[];
}

export interface RuleViolation {
    field?: string;
    code: string;
    message: string;
}

export function createPassResult(ruleName: string): RuleResult {
    return { passed: true, ruleName };
}

export function createFailResult(
    ruleName: string,
    message: string,
    violations?: RuleViolation[],
): RuleResult {
    return { passed: false, ruleName, message, violations };
}
