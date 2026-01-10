// Decimal Transform Interceptor
// Source: FINAL/BACKEND/02-CORE-PATTERNS.md + nerderpjsdon.md
// CRITICAL: Converts Decimal instances to strings for JSON serialization

import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import Decimal from 'decimal.js';

@Injectable()
export class DecimalTransformInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(map((data) => this.transformDecimals(data)));
    }

    private transformDecimals(obj: any): any {
        if (obj === null || obj === undefined) {
            return obj;
        }

        // Check for Decimal.js instances or Prisma Decimal (by constructor name)
        if (
            obj instanceof Decimal ||
            obj.constructor?.name === 'Decimal'
        ) {
            return obj.toString(); // Convert to string for precision
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
                ])
            );
        }

        return obj;
    }
}
