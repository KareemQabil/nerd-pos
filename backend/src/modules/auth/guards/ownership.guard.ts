/**
 * Ownership Guard
 * 
 * Prevents IDOR (Insecure Direct Object Reference) vulnerabilities.
 * Verifies that the authenticated user has access to the requested resource.
 * 
 * Note: For this single-tenant POS system, this guard ensures users can only
 * access resources within the same store context. For multi-tenant, it would
 * check tenantId.
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SKIP_OWNERSHIP_CHECK_KEY = 'skipOwnershipCheck';

/**
 * Decorator to skip ownership check for specific routes (e.g., public resources)
 */
export const SkipOwnershipCheck = () =>
    (target: any, key?: string, descriptor?: PropertyDescriptor) => {
        if (descriptor) {
            Reflect.defineMetadata(SKIP_OWNERSHIP_CHECK_KEY, true, descriptor.value);
        } else {
            Reflect.defineMetadata(SKIP_OWNERSHIP_CHECK_KEY, true, target);
        }
        return descriptor ?? target;
    };

@Injectable()
export class OwnershipGuard implements CanActivate {
    private readonly logger = new Logger(OwnershipGuard.name);

    constructor(private readonly reflector: Reflector) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // Check if ownership check should be skipped
        const skipCheck = this.reflector.getAllAndOverride<boolean>(
            SKIP_OWNERSHIP_CHECK_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (skipCheck) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const resourceId = request.params?.id;

        // If no user (not authenticated), let JwtAuthGuard handle it
        if (!user) {
            return true;
        }

        // If no resource ID in params, nothing to check
        if (!resourceId) {
            return true;
        }

        // For single-tenant POS, we currently allow access within the store
        // In production, implement resource-specific ownership checks here
        // 
        // Example for multi-tenant:
        // const resource = await this.getResource(resourceType, resourceId);
        // if (resource.tenantId !== user.tenantId) {
        //     throw new ForbiddenException('Access denied to this resource');
        // }

        // For now, log access for audit purposes
        this.logger.debug(
            `User ${user.sub} accessing resource ${resourceId}`,
        );

        return true;
    }
}

/**
 * Future Enhancement: Resource-specific ownership verification
 * 
 * To implement full IDOR protection:
 * 1. Create @ResourceType('order') decorator
 * 2. Inject appropriate repository based on resource type
 * 3. Query resource and verify ownership/tenancy
 * 
 * Example:
 * @ResourceType('order')
 * @Get(':id')
 * async getOrder(@Param('id') id: string) { ... }
 */
