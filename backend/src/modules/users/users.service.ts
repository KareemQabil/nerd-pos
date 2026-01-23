// Users Service
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md
// Handles: Authentication, authorization, user management, roles, permissions

import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import {
  CreateUserDto,
  UpdateUserDto,
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
} from './dto';
import {
  UserCreatedEvent,
  UserLoggedInEvent,
  UserPasswordChangedEvent,
} from './events/users.events';
import {
  User,
  UserProfile,
  Role,
  Permission,
  AuthResult,
} from './entities/users.entity';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) { }

  // ==================== AUTHENTICATION ====================

  async login(username: string, password: string): Promise<AuthResult> {
    const user = await this.repo.findByUsername(username);

    if (!user || !user.isActive) {
      await this.logAuthAttempt(
        user?.id,
        'PASSWORD',
        false,
        'Invalid credentials',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, user.password);

    if (!isValid) {
      await this.logAuthAttempt(user.id, 'PASSWORD', false, 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.logAuthAttempt(user.id, 'PASSWORD', true);
    await this.repo.update(user.id, { lastLogin: new Date() });

    // Generate simple token (in production, use JWT)
    const token = this.generateToken(
      user.id,
      user.username,
      user.roleId || user.role,
    );

    await this.eventBus.publish(
      'UserLoggedIn',
      new UserLoggedInEvent(user.id, user.username),
    );

    const userWithRole = await this.repo.findWithRole(user.id);

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nameAr: user.nameAr,
        nameEn: user.nameEn,
        phone: user.phone,
        roleId: user.roleId,
        role: user.role,
        roleName: userWithRole?.userRole?.name || user.role,
        isActive: user.isActive,
      },
    };
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const user = await this.repo.findById(userId);

    if (!user || !user.pin) {
      await this.logAuthAttempt(userId, 'PIN', false, 'No PIN set');
      return false;
    }

    const isValid = user.pin === pin;

    await this.logAuthAttempt(
      userId,
      'PIN',
      isValid,
      isValid ? undefined : 'Invalid PIN',
    );

    return isValid;
  }

  async verifyManagerPin(
    pin: string,
  ): Promise<{ valid: boolean; managerId?: string }> {
    const managers = await this.repo.findByRoleLevel(2); // MANAGER level

    for (const manager of managers) {
      if (manager.pin === pin && manager.isActive) {
        await this.logAuthAttempt(manager.id, 'PIN', true);
        return { valid: true, managerId: manager.id };
      }
    }

    return { valid: false };
  }

  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    // Use bcrypt for password verification
    return bcrypt.compare(password, hash);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private generateToken(
    userId: string,
    username: string,
    roleId: string,
  ): string {
    // Simple token (in production, use JWT)
    const payload = JSON.stringify({
      sub: userId,
      username,
      roleId,
      iat: Date.now(),
    });
    return Buffer.from(payload).toString('base64');
  }

  private async logAuthAttempt(
    userId: string | undefined,
    method: 'PASSWORD' | 'PIN',
    success: boolean,
    failureReason?: string,
  ): Promise<void> {
    if (!userId) return;

    await this.repo.createAuthLog({
      userId,
      method,
      success,
      failureReason,
    });
  }

  // ==================== USER CRUD ====================

  async createUser(dto: CreateUserDto): Promise<User> {
    // Check if username exists
    const existing = await this.repo.findByUsername(dto.username);
    if (existing) {
      throw new BadRequestException(`Username ${dto.username} already exists`);
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const user = await this.repo.create({
      username: dto.username,
      email: dto.email,
      password: hashedPassword,
      pin: dto.pin,
      nameAr: dto.nameAr,
      nameEn: dto.nameEn,
      phone: dto.phone,
      roleId: dto.roleId,
      role: dto.role,
      isActive: true,
    });

    await this.eventBus.publish(
      'UserCreated',
      new UserCreatedEvent(user.id, user.username, user.roleId || user.role),
    );

    return user;
  }

  async findById(id: string): Promise<UserProfile> {
    const user = await this.repo.findWithRole(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      nameAr: user.nameAr,
      nameEn: user.nameEn,
      phone: user.phone,
      roleId: user.roleId,
      role: user.role,
      roleName: user.userRole?.name || user.role,
      isActive: user.isActive,
    };
  }

  async findAll(): Promise<User[]> {
    return this.repo.findActive();
  }

  // Paginated version for API endpoints
  async findAllPaginated(options: { page?: number; limit?: number }): Promise<{
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.repo.findActivePaginated(options);
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const updateData: Partial<UpdateUserDto> & { passwordHash?: string } = { ...dto };
    if (dto.password) {
      updateData.passwordHash = await this.hashPassword(dto.password);
      delete updateData.password;
    }
    return this.repo.update(id, updateData);
  }

  async updatePin(userId: string, newPin: string): Promise<void> {
    await this.repo.update(userId, { pin: newPin });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const isValid = await this.verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = await this.hashPassword(newPassword);
    await this.repo.update(userId, { password: newHash });

    await this.eventBus.publish(
      'UserPasswordChanged',
      new UserPasswordChangedEvent(userId),
    );
  }

  // ==================== AUTHORIZATION ====================

  async hasPermission(
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const user = await this.repo.findWithRole(userId);
    if (!user || !user.roleId) return false;

    const permissions = await this.repo.getPermissions(user.roleId);
    return permissions.some((p) => p.code === permissionCode);
  }

  // ==================== ROLES ====================

  async getAllRoles(): Promise<Role[]> {
    return this.repo.findAllRoles();
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    return this.repo.createRole({
      name: dto.name,
      nameAr: dto.nameAr,
      description: dto.description,
      level: dto.level,
      isSystem: false,
      isActive: true,
    });
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    return this.repo.updateRole(id, dto);
  }

  // ==================== PERMISSIONS ====================

  async getAllPermissions(): Promise<Permission[]> {
    return this.repo.findAllPermissions();
  }

  async getPermissionsByModule(module: string): Promise<Permission[]> {
    return this.repo.findPermissionsByModule(module);
  }

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    return this.repo.createPermission(dto);
  }
}
