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
export class UsersRepository extends BaseRepository<User> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return 'user';
  }

  // ==================== USERS ====================

  async findByUsername(username: string): Promise<User | null> {
    return (this.prisma as any).user.findUnique({
      where: { username },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return (this.prisma as any).user.findUnique({
      where: { email },
    });
  }

  async findWithRole(
    id: string,
  ): Promise<(User & { userRole: Role | null }) | null> {
    return (this.prisma as any).user.findUnique({
      where: { id },
      include: { userRole: true },
    });
  }

  async findActive(): Promise<User[]> {
    return (this.prisma as any).user.findMany({
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
      (this.prisma as any).user.findMany({
        where,
        include: { userRole: true },
        orderBy: { nameEn: 'asc' },
        skip,
        take: limit,
      }),
      (this.prisma as any).user.count({ where }),
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
    return (this.prisma as any).user.findMany({
      where: {
        isActive: true,
        role: { level },
      },
      include: { role: true },
    });
  }

  // ==================== AUTH LOGGING ====================

  async createAuthLog(data: {
    userId: string;
    action?: string;
    method?: string;
    ipAddress?: string;
    userAgent?: string;
    success?: boolean;
    failureReason?: string;
  }): Promise<void> {
    await (this.prisma as any).authenticationLog.create({ data });
  }

  async findAuthLogsByUser(userId: string, limit: number = 20): Promise<any[]> {
    return (this.prisma as any).authenticationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==================== ROLES ====================

  async findAllRoles(): Promise<Role[]> {
    return (this.prisma as any).role.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async findRoleById(id: string): Promise<Role | null> {
    return (this.prisma as any).role.findUnique({
      where: { id },
    });
  }

  async findRoleWithPermissions(
    id: string,
  ): Promise<RoleWithPermissions | null> {
    return (this.prisma as any).role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return (this.prisma as any).role.findUnique({
      where: { name },
    });
  }

  async createRole(
    data: Partial<Role> & { name: string; nameAr: string },
  ): Promise<Role> {
    return (this.prisma as any).role.create({ data });
  }

  async updateRole(id: string, data: Partial<Role>): Promise<Role> {
    return (this.prisma as any).role.update({
      where: { id },
      data,
    });
  }

  async getPermissions(roleId: string): Promise<Permission[]> {
    const rolePermissions = await (this.prisma as any).rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rolePermissions.map(
      (rp: { permission: Permission }) => rp.permission,
    );
  }

  // ==================== PERMISSIONS ====================

  async findAllPermissions(): Promise<Permission[]> {
    return (this.prisma as any).permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async findPermissionsByModule(module: string): Promise<Permission[]> {
    return (this.prisma as any).permission.findMany({
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
    return (this.prisma as any).permission.create({ data });
  }

  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
    assignedBy: string,
  ): Promise<void> {
    await (this.prisma as any).rolePermission.create({
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
    await (this.prisma as any).rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });
  }
}
