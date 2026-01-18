/**
 * JWT Auth Guard
 * 
 * Global guard that protects all routes by default.
 * Checks for @Public() decorator to skip authentication.
 */

import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // Check for @Public() decorator on handler or class
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );

        // Skip authentication for public routes
        if (isPublic) {
            return true;
        }

        // Proceed with JWT validation
        return super.canActivate(context);
    }
}
