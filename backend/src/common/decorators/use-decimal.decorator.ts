// UseDecimal Decorator
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md line 47
// Marks a method or class as using Decimal.js for financial calculations

import { SetMetadata } from '@nestjs/common';

export const USE_DECIMAL = 'USE_DECIMAL';

export const UseDecimal = () => SetMetadata(USE_DECIMAL, true);
