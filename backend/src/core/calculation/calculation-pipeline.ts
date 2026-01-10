// Calculation Pipeline
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md
// Executes steps in order to calculate totals

import { Injectable } from '@nestjs/common';
import { ICalculationStep, ICalculationContext } from './calculation-step.interface';

@Injectable()
export class CalculationPipeline {
    private steps: ICalculationStep[] = [];

    registerStep(step: ICalculationStep): void {
        this.steps.push(step);
        // Sort by order
        this.steps.sort((a, b) => a.order - b.order);
    }

    async execute(context: ICalculationContext): Promise<ICalculationContext> {
        let result = { ...context };

        for (const step of this.steps) {
            result = await step.execute(result);
        }

        return result;
    }

    getSteps(): ICalculationStep[] {
        return [...this.steps];
    }
}
