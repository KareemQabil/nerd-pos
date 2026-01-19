// Workflow Context
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md line 36
// Context passed through workflow steps

export interface WorkflowContext<T = any> {
  data: T;
  currentStep: string;
  completedSteps: string[];
  failedStep?: string;
  errors: Error[];
  metadata: Record<string, any>;
}

export function createWorkflowContext<T>(data: T): WorkflowContext<T> {
  return {
    data,
    currentStep: '',
    completedSteps: [],
    errors: [],
    metadata: {},
  };
}
