/**
 * Response Transform Interceptor
 *
 * Standardizes ALL success responses to follow a consistent envelope format:
 * {
 *   "result": { ... },
 *   "error": null
 * }
 *
 * This provides:
 * - Consistent API contract for frontend consumers
 * - Easy response validation
 * - Matches the error response format
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../types';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // Don't double-wrap if already in standard format
        if (
          result &&
          typeof result === 'object' &&
          'result' in result &&
          'error' in result
        ) {
          return result as ApiResponse<T>;
        }

        return {
          result: result ?? null,
          error: null,
        };
      }),
    );
  }
}
