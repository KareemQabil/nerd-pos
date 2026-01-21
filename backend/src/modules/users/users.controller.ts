// Users Controller
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { RequestWithUser } from '../auth/interfaces/request.interface';
import { UsersService } from './users.service';
import {
  LoginDto,
  VerifyPinDto,
  CreateUserDto,
  UpdateUserDto,
  UpdatePinDto,
  ChangePasswordDto,
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) { }

  // ==================== AUTH (Public) ====================

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.service.login(dto.username, dto.password);
  }

  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Required for any authenticated user
  @Post('verify-pin')
  async verifyPin(@Body() dto: VerifyPinDto & { userId: string }) {
    return this.service.verifyPin(dto.userId, dto.pin);
  }

  @Permissions(PERMISSIONS.SESSIONS_CLOSE) // 🔒 Manager+ (manager auth required)
  @Post('manager-auth')
  async verifyManagerPin(@Body() dto: VerifyPinDto) {
    return this.service.verifyManagerPin(dto.pin);
  }

  // ==================== USERS ====================

  @Permissions(PERMISSIONS.USERS_CREATE) // 🔒 Admin only
  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Permissions(PERMISSIONS.USERS_VIEW) // 🔒 Manager+
  @Get()
  async getAll() {
    return this.service.findAll();
  }

  /**
   * GET /users/:id - User can only view their own profile (unless ADMIN/MANAGER)
   */
  @Permissions(PERMISSIONS.USERS_VIEW) // 🔒 Manager+ (or self via ownership check)
  @Get(':id')
  async findById(@Param('id') id: string, @Request() req: RequestWithUser) {
    // Self-ownership check: user can only view their own profile
    const userId = req.user.sub;
    const userRole = req.user.role;

    // Allow if viewing own profile or if ADMIN/MANAGER
    if (userId !== id && !['ADMIN', 'MANAGER'].includes(userRole)) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return this.service.findById(id);
  }

  /**
   * PUT /users/:id - User can only edit their own profile (unless ADMIN/MANAGER)
   */
  @Permissions(PERMISSIONS.USERS_UPDATE) // 🔒 Admin only (or self for limited fields)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: RequestWithUser,
  ) {
    const userId = req.user.sub;
    const userRole = req.user.role;

    // Self-ownership check
    if (userId !== id && !['ADMIN', 'MANAGER'].includes(userRole)) {
      throw new ForbiddenException('You can only edit your own profile');
    }

    return this.service.updateUser(id, dto);
  }

  @Permissions(PERMISSIONS.USERS_PIN_UPDATE) // Self or Admin
  @Put(':id/pin')
  async updatePin(@Param('id') id: string, @Body() dto: UpdatePinDto) {
    return this.service.updatePin(id, dto.newPin);
  }

  @Permissions(PERMISSIONS.USERS_PASSWORD_CHANGE) // Self or Admin
  @Post(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.service.changePassword(
      id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Permissions(PERMISSIONS.PERMISSIONS_VIEW) // 🔒 Admin only
  @Get(':id/permissions/:code')
  async hasPermission(@Param('id') id: string, @Param('code') code: string) {
    return { hasPermission: await this.service.hasPermission(id, code) };
  }

  // ==================== ROLES ====================

  @Permissions(PERMISSIONS.ROLES_VIEW) // 🔒 Manager+
  @Get('roles')
  async getAllRoles() {
    return this.service.getAllRoles();
  }

  @Permissions(PERMISSIONS.ROLES_MANAGE) // 🔒 Admin only
  @Post('roles')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.service.createRole(dto);
  }

  @Permissions(PERMISSIONS.ROLES_MANAGE) // 🔒 Admin only
  @Put('roles/:id')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.service.updateRole(id, dto);
  }

  // ==================== PERMISSIONS ====================

  @Permissions(PERMISSIONS.PERMISSIONS_VIEW) // 🔒 Admin only
  @Get('permissions')
  async getAllPermissions() {
    return this.service.getAllPermissions();
  }

  @Permissions(PERMISSIONS.PERMISSIONS_VIEW) // 🔒 Admin only
  @Get('permissions/module/:module')
  async getPermissionsByModule(@Param('module') module: string) {
    return this.service.getPermissionsByModule(module);
  }

  @Permissions(PERMISSIONS.PERMISSIONS_ASSIGN) // 🔒 Admin only
  @Post('permissions')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.service.createPermission(dto);
  }
}
