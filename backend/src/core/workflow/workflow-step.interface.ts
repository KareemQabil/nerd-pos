// Workflow Step Interface
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md

export interface IWorkflowStep<TContext> {
    readonly name: string;
    readonly order: number;

    canExecute(context: TContext): Promise<boolean>;
    execute(context: TContext): Promise<TContext>;
    rollback?(context: TContext): Promise<TContext>;
}

export interface IWorkflowContext {
    readonly workflowId: string;
    readonly startedAt: Date;
    currentStep: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
    error?: Error;
    metadata: Record<string, any>;
}
