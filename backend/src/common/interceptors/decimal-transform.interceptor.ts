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
import { Reflector } from '@nestjs/core';
import Decimal from 'decimal.js';

/**
 * Standard API Response Format
 * ALL responses follow this structure
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: any; // Preserved for paginated responses
  timestamp: string;
  path: string;
  requestId?: string;
}

// Metadata key for custom response messages
export const RESPONSE_MESSAGE_KEY = 'responseMessage';

@Injectable()
export class DecimalTransformInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    // Get custom message from decorator if exists
    const customMessage = this.reflector.get<string>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    return next.handle().pipe(
      map((data) => {
        // First, transform all Decimals to strings
        const transformedData = this.transformDecimals(data);

        // Handle paginated responses (preserve meta object)
        if (
          transformedData &&
          typeof transformedData === 'object' &&
          'data' in transformedData &&
          'meta' in transformedData
        ) {
          return {
            success: true,
            message:
              customMessage || transformedData.message || 'Request successful',
            data: transformedData.data,
            meta: transformedData.meta,
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId: request.id,
          };
        }

        // Handle standard responses
        return {
          success: true,
          message: customMessage || 'Request successful',
          data: transformedData,
          timestamp: new Date().toISOString(),
          path: request.url,
          requestId: request.id,
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
