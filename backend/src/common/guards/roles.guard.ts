// Roles Guard
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md
// Role-based access control

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => {
    return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
        Reflect.defineMetadata(ROLES_KEY, roles, descriptor?.value ?? target);
    };
};

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true; // No roles required
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return false;
        }

        return requiredRoles.some((role) => user.role === role);
    }
}
