/**
 * Response Headers Middleware
 * Production Cleanup 2026-01-23
 *
 * Adds standard response headers for API versioning.
 * Follows: FINAL/BACKEND/02-CORE-PATTERNS.md
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ResponseHeadersMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // API version header
        res.setHeader('X-API-Version', '1.0.0');

        next();
    }
}
