// Decimal Transform Interceptor
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md + nerderpjsdon.md
// CRITICAL: Converts Decimal instances to strings for JSON serialization
// ENHANCED: Also wraps responses in standard format (Production Cleanup 2026-01-23)

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Decimal from 'decimal.js';
import { ApiResponse } from '../types';

// Metadata key reserved for legacy response message decorator
export const RESPONSE_MESSAGE_KEY = 'responseMessage';

@Injectable()
export class DecimalTransformInterceptor implements NestInterceptor {

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    return next.handle().pipe(
      map((data) => {
        // First, transform all Decimals to strings
        const transformedData = this.transformDecimals(data);
        if (
          transformedData &&
          typeof transformedData === 'object' &&
          'data' in transformedData &&
          'error' in transformedData
        ) {
          return transformedData as ApiResponse<unknown>;
        }

        return {
          data: transformedData ?? null,
          error: null,
        };
      }),
    );
  }

  private transformDecimals(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Check for Decimal.js instances or Prisma Decimal (by constructor name)
    if (obj instanceof Decimal || obj.constructor?.name === 'Decimal') {
      return obj.toString();
    }

    // Duck typing for serialized Decimal objects (s, e, d)
    if (
      obj &&
      typeof obj === 'object' &&
      's' in obj &&
      'e' in obj &&
      'd' in obj &&
      Array.isArray(obj.d)
    ) {
      return new Decimal(obj).toString();
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => this.transformDecimals(item));
    }

    // Handle objects
    if (typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
          key,
          this.transformDecimals(value),
        ]),
      );
    }

    return obj;
  }
}
