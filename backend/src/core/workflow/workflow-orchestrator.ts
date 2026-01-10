// Workflow Orchestrator
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
// Saga pattern for multi-step business processes

import { Injectable } from '@nestjs/common';
import { IWorkflowStep, IWorkflowContext } from './workflow-step.interface';

@Injectable()
export class WorkflowOrchestrator {
    async execute<TContext extends IWorkflowContext>(
        steps: IWorkflowStep<TContext>[],
        context: TContext,
    ): Promise<TContext> {
        // Sort steps by order
        const sortedSteps = [...steps].sort((a, b) => a.order - b.order);
        const executedSteps: IWorkflowStep<TContext>[] = [];

        try {
            for (const step of sortedSteps) {
                context.currentStep = step.name;
                context.status = 'IN_PROGRESS';

                // Check if step can execute
                const canExecute = await step.canExecute(context);
                if (!canExecute) {
                    continue; // Skip this step
                }

                // Execute step
                context = await step.execute(context);
                executedSteps.push(step);
            }

            context.status = 'COMPLETED';
            return context;
        } catch (error) {
            context.status = 'FAILED';
            context.error = error as Error;

            // Rollback in reverse order
            await this.rollback(executedSteps.reverse(), context);

            throw error;
        }
    }

    private async rollback<TContext extends IWorkflowContext>(
        steps: IWorkflowStep<TContext>[],
        context: TContext,
    ): Promise<void> {
        for (const step of steps) {
            if (step.rollback) {
                try {
                    await step.rollback(context);
                } catch (rollbackError) {
                    console.error(`Rollback failed for step ${step.name}:`, rollbackError);
                }
            }
        }
        context.status = 'ROLLED_BACK';
    }
}
