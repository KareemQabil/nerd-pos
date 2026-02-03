/**
 * Response Transform Interceptor
 *
 * Standardizes ALL success responses to follow a consistent envelope format:
 * {
 *   "data": { ... },
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
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Don't double-wrap if already in standard format
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'error' in data
        ) {
          return data as ApiResponse<T>;
        }

        return {
          data: data ?? null,
          error: null,
        };
      }),
    );
  }
}
