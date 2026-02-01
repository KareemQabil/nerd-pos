/**
 * Request ID Middleware
 * Production Cleanup 2026-01-23
 *
 * Generates or propagates request IDs for tracing.
 * Follows: FINAL/BACKEND/02-CORE-PATTERNS.md
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing request ID
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();

    // Attach to request for logging and response interceptor
    (req as any).id = requestId;

    // Return in response header
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
