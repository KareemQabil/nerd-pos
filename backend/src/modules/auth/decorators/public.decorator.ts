/**
 * Public Decorator
 * 
 * Use @Public() on routes that should be accessible without authentication.
 * Works with JwtAuthGuard to skip JWT validation for marked routes.
 * 
 * @example
 * @Public()
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route as public (no authentication required)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
