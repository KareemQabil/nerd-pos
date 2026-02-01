/**
 * Response Transform Interceptor
 *
 * Standardizes ALL success responses to follow a consistent envelope format:
 * {
 *   "success": true,
 *   "statusCode": 200,
 *   "data": { ... },
 *   "timestamp": "2026-01-25T10:00:00.000Z",
 *   "path": "/api/v1/..."
 * }
 *
 * This provides:
 * - Consistent API contract for frontend consumers
 * - Easy response validation
 * - Built-in metadata (timestamp, path, request ID)
 * - Matches the error response format (RFC 9457)
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';

export interface SuccessResponse<T = any> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
  path: string;
  requestId?: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  SuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<SuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        // Don't double-wrap if already in standard format
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Wrap in standard success envelope
        return {
          success: true,
          statusCode,
          data,
          timestamp: new Date().toISOString(),
          path: request.url,
          requestId:
            (request as any).id || (request.headers['x-request-id'] as string),
        };
      }),
    );
  }
}
