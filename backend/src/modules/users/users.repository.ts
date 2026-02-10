// Users Repository
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md, 08-repository.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../core/interfaces/pagination.interface';
import {
  User,
  UserProfile,
  Role,
  RoleWithPermissions,
  Permission,
} from './entities/users.entity';

@Injectable()
export class UsersRepository extends BaseRepository<User, 'user'> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model(): 'user' {
    return 'user';
  }

  // ==================== USERS ====================

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findWithRole(
    id: string,
  ): Promise<(User & { userRole: Role | null }) | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { userRole: true },
    });
  }

  async findActive(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { isActive: true },
      include: { userRole: true },
      orderBy: { nameEn: 'asc' },
    });
  }

  // PAGINATION FIX: Paginated version for API endpoints
  async findActivePaginated(
    options: PaginationOptions,
  ): Promise<PaginatedResult<User>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = { isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { userRole: true },
        orderBy: { nameEn: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByRoleLevel(level: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        userRole: { is: { level } },
      },
      include: { userRole: true },
    });
  }

  // ==================== AUTH LOGGING ====================

  async createAuthLog(data: {
    userId: string;
    method: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    failureReason?: string;
  }): Promise<void> {
    await this.prisma.authenticationLog.create({ data });
  }

  async findAuthLogsByUser(userId: string, limit: number = 20): Promise<any[]> {
    return this.prisma.authenticationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async countFailedAuthAttempts(
    userId: string,
    method: 'PASSWORD' | 'PIN',
    since: Date,
  ): Promise<number> {
    return this.prisma.authenticationLog.count({
      where: {
        userId,
        method,
        success: false,
        createdAt: { gte: since },
      },
    });
  }

  // ==================== ROLES ====================

  async findAllRoles(): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async findRoleById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
    });
  }

  async findRoleWithPermissions(
    id: string,
  ): Promise<RoleWithPermissions | null> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) {
      return null;
    }
    return {
      ...role,
      permissions: role.permissions.map((rp) => rp.permission),
    };
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  async createRole(
    data: Partial<Role> & { name: string; nameAr: string },
  ): Promise<Role> {
    return this.prisma.role.create({ data });
  }

  async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  async getPermissions(roleId: string): Promise<Permission[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rolePermissions.map(
      (rp: { permission: Permission }) => rp.permission,
    );
  }

  // ==================== PERMISSIONS ====================

  async findAllPermissions(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async findPermissionsByModule(module: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { module },
      orderBy: { code: 'asc' },
    });
  }

  async createPermission(data: {
    code: string;
    name: string;
    nameAr: string;
    module: string;
    section?: string | null;
    description?: string | null;
  }): Promise<Permission> {
    return this.prisma.permission.create({ data });
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    assignedBy: string,
  ): Promise<void> {
    await this.prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
        assignedBy,
      },
    });
  }

  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });
  }
}
