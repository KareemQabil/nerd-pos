// Calculation Step Decorator
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md line 23
// Used to mark calculation pipeline steps with their order

import { SetMetadata } from '@nestjs/common';

export const CALCULATION_STEP_ORDER = 'CALCULATION_STEP_ORDER';

export const CalculationStep = (order: number) =>
  SetMetadata(CALCULATION_STEP_ORDER, order);
