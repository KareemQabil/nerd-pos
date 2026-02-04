/**
 * Permissions Guard
 *
 * Dynamic LEGO-style permissions guard that checks DB for user permissions.
 * Works with @Permissions() decorator to authorize routes.
 *
 * Flow:
 * 1. JwtAuthGuard runs first (authenticates user)
 * 2. This guard runs second (authorizes user based on DB permissions)
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsersService } from '../../users/users.service';
import { ErrorMessages } from '../../../common/constants';
import {
  ForbiddenAppException,
  UnauthorizedAppException,
} from '../../../common/exceptions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required - allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // No user - deny access
    if (!user || !user.sub) {
      throw new UnauthorizedAppException(ErrorMessages.Unauthorized);
    }

    // Check if user has ALL required permissions
    const hasAllPermissions = await this.checkPermissions(
      user.sub,
      requiredPermissions,
    );

    if (!hasAllPermissions) {
      throw new ForbiddenAppException(ErrorMessages.Forbidden, {
        requiredPermissions,
      });
    }

    return true;
  }

  /**
   * Check if user has all required permissions via DB lookup
   */
  private async checkPermissions(
    userId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    for (const permissionCode of requiredPermissions) {
      const hasPermission = await this.usersService.hasPermission(
        userId,
        permissionCode,
      );
      if (!hasPermission) {
        return false;
      }
    }
    return true;
  }
}
