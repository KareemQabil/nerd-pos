# Workflow Step Pattern

**Pattern**: Long-Running Business Workflows  
**Framework**: Saga Pattern  
**Status**: Tracked per step  

---

## **WORKFLOW ENTITY**

```prisma
model Workflow {
  id              String   @id @default(uuid())
  type            WorkflowType
  status          WorkflowStatus
  currentStep     Int      @default(0)
  totalSteps      Int
  context         Json     // Workflow state
  
  steps           WorkflowStep[]
  
  createdAt       DateTime @default(now())
  completedAt     DateTime?
}

model WorkflowStep {
  id              String   @id @default(uuid())
  workflowId      String
  workflow        Workflow @relation(fields: [workflowId], references: [id])
  
  stepNumber      Int
  stepName        String
  status          StepStatus
  input           Json
  output          Json?
  errorMessage    String?
  
  startedAt       DateTime @default(now())
  completedAt     DateTime?
  
  @@index([workflowId])
}

enum WorkflowType {
  DELIVERY_ORDER
  INVENTORY_TRANSFER
  SESSION_CLOSE
  COMPLIANCE_SUBMISSION
}

enum WorkflowStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  COMPENSATING
}

enum StepStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
}
```

---

## **WORKFLOW SERVICE**

```typescript
// backend/modules/workflows/workflow.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowService {
  constructor(private prisma: PrismaService) {}

  async startWorkflow(type: WorkflowType, context: any) {
    const workflow = await this.prisma.workflow.create({
      data: {
        type,
        status: 'PENDING',
        currentStep: 0,
        totalSteps: this.getStepCount(type),
        context,
      },
    });

    // Start execution
    await this.executeNextStep(workflow.id);
    
    return workflow;
  }

  async executeNextStep(workflowId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: true },
    });

    if (workflow.status === 'COMPLETED') return;

    const nextStepNumber = workflow.currentStep + 1;
    const stepHandler = this.getStepHandler(workflow.type, nextStepNumber);

    const step = await this.prisma.workflowStep.create({
      data: {
        workflowId,
        stepNumber: nextStepNumber,
        stepName: stepHandler.name,
        status: 'IN_PROGRESS',
        input: workflow.context,
      },
    });

    try {
      // Execute step
      const output = await stepHandler.execute(workflow.context);

      // Mark complete
      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: 'COMPLETED',
          output,
          completedAt: new Date(),
        },
      });

      // Update workflow
      await this.prisma.workflow.update({
        where: { id: workflowId },
        data: {
          currentStep: nextStepNumber,
          context: { ...workflow.context, ...output },
          status: nextStepNumber === workflow.totalSteps ? 'COMPLETED' : 'IN_PROGRESS',
          completedAt: nextStepNumber === workflow.totalSteps ? new Date() : null,
        },
      });

      // Continue to next step
      if (nextStepNumber < workflow.totalSteps) {
        await this.executeNextStep(workflowId);
      }
      
    } catch (error) {
      // Mark failed
      await this.prisma.workflowStep.update({
        where: { id: step.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
        },
      });

      await this.prisma.workflow.update({
        where: { id: workflowId },
        data: { status: 'FAILED' },
      });

      // Start compensation
      await this.compensate(workflowId);
    }
  }

  async compensate(workflowId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { steps: { orderBy: { stepNumber: 'desc' } } },
    });

    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: { status: 'COMPENSATING' },
    });

    // Reverse completed steps
    for (const step of workflow.steps) {
      if (step.status === 'COMPLETED') {
        const compensator = this.getCompensator(workflow.type, step.stepNumber);
        await compensator.compensate(step.output);
      }
    }
  }

  private getStepHandler(type: WorkflowType, stepNumber: number) {
    const handlers = {
      DELIVERY_ORDER: [
        new ValidateCustomerStep(),
        new ReserveInventoryStep(),
        new CreateOrderStep(),
        new AssignDriverStep(),
        new NotifyCustomerStep(),
      ],
    };
    
    return handlers[type][stepNumber - 1];
  }
}
```

---

## **STEP HANDLER INTERFACE**

```typescript
// Workflow step handler
interface WorkflowStepHandler {
  name: string;
  execute(context: any): Promise<any>;
  compensate?(context: any): Promise<void>;
}

// Example: Reserve Inventory Step
class ReserveInventoryStep implements WorkflowStepHandler {
  name = 'RESERVE_INVENTORY';

  async execute(context: { orderId: string; items: OrderItem[] }) {
    const reservations = [];
    
    for (const item of context.items) {
      const reservation = await inventoryService.reserve({
        productId: item.productId,
        quantity: item.quantity,
        orderId: context.orderId,
      });
      
      reservations.push(reservation);
    }

    return { reservations };
  }

  async compensate(context: { reservations: any[] }) {
    // Release all reservations
    for (const reservation of context.reservations) {
      await inventoryService.releaseReservation(reservation.id);
    }
  }
}
```

---

## **USAGE EXAMPLE**

```typescript
// Start a delivery order workflow
const workflow = await workflowService.startWorkflow('DELIVERY_ORDER', {
  customerId: 'cust-123',
  items: [
    { productId: 'prod-1', quantity: 2 },
    { productId: 'prod-2', quantity: 1 },
  ],
  deliveryAddress: '123 Main St',
  scheduledTime: new Date('2026-01-10T15:00:00Z'),
});

// Track progress
const status = await workflowService.getStatus(workflow.id);
// status.currentStep = 3
// status.status = 'IN_PROGRESS'
```

---

## **KEY BENEFITS**

- **Resumable**: Continue from last step after failure
- **Compensating**: Auto-rollback on errors
- **Trackable**: Full audit trail of each step
- **Testable**: Each step is isolated and testable

---

**NEXT**: [06-migrations.md](06-migrations.md)
