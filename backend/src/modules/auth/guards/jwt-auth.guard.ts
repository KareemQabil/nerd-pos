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
    // 1. Check for @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. Explicitly whitelist Swagger and Health paths
    const request = context.switchToHttp().getRequest();
    const path = request.path;
    const whitelistedPaths = [
      '/api/docs',
      '/api/docs-json',
      '/health',
      '/favicon.ico',
    ];

    // Check if path starts with any whitelisted path
    if (whitelistedPaths.some((p) => path.startsWith(p))) {
      return true;
    }

    // 3. Proceed with JWT validation
    return super.canActivate(context);
  }
}
