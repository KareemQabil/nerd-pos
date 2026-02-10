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
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../core/prisma/prisma.service';

export const SKIP_OWNERSHIP_CHECK_KEY = 'skipOwnershipCheck';
export const RESOURCE_TYPE_KEY = 'resourceType';

export type ResourceType = 'order' | 'session' | 'payment';
export interface ResourceMeta {
  type: ResourceType;
  param?: string;
}

/**
 * Decorator to skip ownership check for specific routes (e.g., public resources)
 */
export const SkipOwnershipCheck =
  () => (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_OWNERSHIP_CHECK_KEY, true, descriptor.value);
    } else {
      Reflect.defineMetadata(SKIP_OWNERSHIP_CHECK_KEY, true, target);
    }
    return descriptor ?? target;
  };

/**
 * Decorator to mark routes for ownership checks.
 */
export const ResourceType =
  (type: ResourceType, param = 'id') =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      SetMetadata(RESOURCE_TYPE_KEY, { type, param })(
        target,
        key,
        descriptor,
      );
    } else {
      SetMetadata(RESOURCE_TYPE_KEY, { type, param })(target);
    }
    return descriptor ?? target;
  };

@Injectable()
export class OwnershipGuard implements CanActivate {
  private readonly logger = new Logger(OwnershipGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

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
    const resourceMeta = this.reflector.getAllAndOverride<ResourceMeta>(
      RESOURCE_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!resourceMeta) {
      return true;
    }

    const resourceId = request.params?.[resourceMeta.param ?? 'id'];

    // If no user (not authenticated), let JwtAuthGuard handle it
    if (!user) {
      return true;
    }

    // If no resource ID in params, nothing to check
    if (!resourceId) {
      return true;
    }

    // Privileged roles can access all resources
    if (this.isPrivileged(user)) {
      return true;
    }

    const hasAccess = await this.checkOwnership(
      resourceMeta.type,
      resourceId,
      user.sub,
    );

    if (!hasAccess) {
      throw new ForbiddenException('Access denied to this resource');
    }

    this.logger.debug(`User ${user.sub} accessing ${resourceMeta.type} ${resourceId}`);
    return true;
  }

  private isPrivileged(user: { role?: string }): boolean {
    return ['ADMIN', 'MANAGER', 'SUPERVISOR'].includes(user.role ?? '');
  }

  private async checkOwnership(
    type: ResourceType,
    resourceId: string,
    userId: string,
  ): Promise<boolean> {
    switch (type) {
      case 'session': {
        const session = await this.prisma.registerSession.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        if (!session) return true;
        return session.userId === userId;
      }
      case 'order': {
        const order = await this.prisma.salesOrder.findUnique({
          where: { id: resourceId },
          select: { sessionId: true },
        });
        if (!order) return true;
        const session = await this.prisma.registerSession.findUnique({
          where: { id: order.sessionId },
          select: { userId: true },
        });
        if (!session) return true;
        return session.userId === userId;
      }
      case 'payment': {
        const payment = await this.prisma.payment.findUnique({
          where: { id: resourceId },
          select: { sessionId: true },
        });
        if (!payment) return true;
        const session = await this.prisma.registerSession.findUnique({
          where: { id: payment.sessionId },
          select: { userId: true },
        });
        if (!session) return true;
        return session.userId === userId;
      }
      default:
        return true;
    }
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
