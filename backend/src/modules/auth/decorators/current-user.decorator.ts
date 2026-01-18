/**
 * CurrentUser Decorator
 * 
 * Extracts the authenticated user from the JWT token.
 * Use after JwtAuthGuard has validated the request.
 * 
 * @example
 * // Get full user object
 * @CurrentUser() user: JwtPayload
 * 
 * // Get specific field
 * @CurrentUser('id') userId: string
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
    sub: string;       // User ID
    username: string;
    roleId: string;
    role: string;
    iat?: number;      // Issued at
    exp?: number;      // Expiration
}

/**
 * Extract user or user field from JWT payload
 */
export const CurrentUser = createParamDecorator(
    (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string | undefined => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as JwtPayload;

        if (!user) return undefined;

        return data ? user[data] : user;
    },
);
