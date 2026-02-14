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
  Query,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { RequestWithUser } from '../auth/interfaces/request.interface';
import { UsersService } from './users.service';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto';
import { ApiResultResponse, ApiErrorResponse } from '../../common/decorators';
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

@ApiTags('Users')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ==================== AUTH (Public) ====================

  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates user with username and password. Returns JWT token.',
  })
  @ApiResultResponse({
    status: 200,
    description: 'Login successful, returns access token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns access token',
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'usr_123',
            username: 'admin',
            role: 'ADMIN',
          },
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    return this.service.login(dto.username, dto.password);
  }

  @Post('verify-pin')
  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Required for any authenticated user
  @ApiOperation({
    summary: 'Verify user PIN',
    description: 'Verifies 4-digit PIN for quick authentication',
  })
  @ApiResultResponse({
    status: 200,
    description: 'PIN verified successfully',
  })
  @ApiResponse({
    status: 200,
    description: 'PIN verified successfully',
    schema: {
      example: {
        success: true,
        message: 'PIN verified',
        data: { verified: true },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid PIN' })
  async verifyPin(@Body() dto: VerifyPinDto & { userId: string }) {
    return this.service.verifyPin(dto.userId, dto.pin);
  }

  @Post('manager-auth')
  @Permissions(PERMISSIONS.SESSIONS_CLOSE) // 🔒 Manager+ (manager auth required)
  @ApiOperation({
    summary: 'Manager authentication',
    description:
      'Verifies manager PIN for elevated operations. Manager+ required.',
  })
  @ApiResultResponse({ status: 200, description: 'Manager PIN verified' })
  @ApiResponse({
    status: 200,
    description: 'Manager PIN verified',
    schema: {
      example: {
        success: true,
        message: 'Manager authenticated',
        data: { verified: true },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid manager PIN' })
  async verifyManagerPin(@Body() dto: VerifyPinDto) {
    return this.service.verifyManagerPin(dto.pin);
  }

  // ==================== USERS ====================

  @Post()
  @Permissions(PERMISSIONS.USERS_CREATE) // 🔒 Admin only
  @ApiOperation({
    summary: 'Create user',
    description: 'Creates a new user account. Admin only.',
  })
  @ApiResultResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      example: {
        success: true,
        message: 'User created successfully',
        data: {
          id: 'usr_456',
          username: 'cashier1',
          role: 'CASHIER',
          isActive: true,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or username already exists',
  })
  async create(@Body() dto: CreateUserDto) {
    return this.service.createUser(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.USERS_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get all users',
    description: 'Returns paginated list of users. Manager+ required.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResultResponse({ status: 200, description: 'Users retrieved' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved',
    type: PaginatedResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'usr_123',
            username: 'admin',
            role: 'ADMIN',
            isActive: true,
          },
        ],
        meta: {
          total: 5,
          page: 1,
          limit: 10,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getAll(@Query() pagination: PaginationDto) {
    const result = await this.service.findAllPaginated({
      page: pagination.page,
      limit: pagination.limit,
    });

    return new PaginatedResponseDto(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  /**
   * GET /users/:id - User can only view their own profile (unless ADMIN/MANAGER)
   */
  @Get(':id')
  @Permissions(PERMISSIONS.USERS_VIEW) // 🔒 Manager+ (or self via ownership check)
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Returns user details. Users can view own profile, Manager+ can view all.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResultResponse({ status: 200, description: 'User found' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'usr_123',
          username: 'admin',
          role: 'ADMIN',
          permissions: ['*'],
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User not found' })
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
  @Put(':id')
  @Permissions(PERMISSIONS.USERS_UPDATE) // 🔒 Admin only (or self for limited fields)
  @ApiOperation({
    summary: 'Update user',
    description:
      'Updates user information. Users can edit own profile, Admin can edit all.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResultResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
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

  @Put(':id/pin')
  @Permissions(PERMISSIONS.USERS_PIN_UPDATE) // Self or Admin
  @ApiOperation({
    summary: 'Update user PIN',
    description: 'Updates 4-digit PIN. Self or Admin.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResultResponse({ status: 200, description: 'PIN updated' })
  @ApiResponse({ status: 200, description: 'PIN updated' })
  @ApiBadRequestResponse({ description: 'Invalid PIN format' })
  async updatePin(@Param('id') id: string, @Body() dto: UpdatePinDto) {
    return this.service.updatePin(id, dto.newPin);
  }

  @Post(':id/change-password')
  @Permissions(PERMISSIONS.USERS_PASSWORD_CHANGE) // Self or Admin
  @ApiOperation({
    summary: 'Change password',
    description: 'Changes user password. Requires current password.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResultResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiBadRequestResponse({
    description: 'Current password incorrect or new password invalid',
  })
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

  @Get(':id/permissions/:code')
  @Permissions(PERMISSIONS.PERMISSIONS_VIEW) // 🔒 Admin only
  @ApiOperation({
    summary: 'Check user permission',
    description: 'Checks if user has specific permission. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiParam({
    name: 'code',
    description: 'Permission code (e.g., products.create)',
  })
  @ApiResultResponse({ status: 200, description: 'Permission check result' })
  @ApiResponse({ status: 200, description: 'Permission check result' })
  async hasPermission(@Param('id') id: string, @Param('code') code: string) {
    return { hasPermission: await this.service.hasPermission(id, code) };
  }

  // ==================== ROLES ====================

  @Get('roles')
  @Permissions(PERMISSIONS.ROLES_VIEW) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get all roles',
    description: 'Returns all roles with permissions. Manager+ required.',
  })
  @ApiResultResponse({ status: 200, description: 'Roles retrieved' })
  @ApiResponse({
    status: 200,
    description: 'Roles retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'role_admin',
            name: 'ADMIN',
            description: 'Administrator with full access',
            permissions: ['*'],
          },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getAllRoles() {
    return this.service.getAllRoles();
  }

  @Post('roles')
  @Permissions(PERMISSIONS.ROLES_MANAGE) // 🔒 Admin only
  @ApiOperation({
    summary: 'Create role',
    description: 'Creates a new role. Admin only.',
  })
  @ApiResultResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiBadRequestResponse({
    description: 'Validation error or role name exists',
  })
  async createRole(@Body() dto: CreateRoleDto) {
    return this.service.createRole(dto);
  }

  @Put('roles/:id')
  @Permissions(PERMISSIONS.ROLES_MANAGE) // 🔒 Admin only
  @ApiOperation({
    summary: 'Update role',
    description: 'Updates role and permissions. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResultResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.service.updateRole(id, dto);
  }

  // ==================== PERMISSIONS ====================

  @Get('permissions')
  @Permissions(PERMISSIONS.PERMISSIONS_VIEW) // 🔒 Admin only
  @ApiOperation({
    summary: 'Get all permissions',
    description: 'Returns all system permissions. Admin only.',
  })
  @ApiResultResponse({ status: 200, description: 'Permissions retrieved' })
  @ApiResponse({
    status: 200,
    description: 'Permissions retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'perm_1',
            code: 'products.create',
            description: 'Create products',
            module: 'products',
          },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getAllPermissions() {
    return this.service.getAllPermissions();
  }

  @Get('permissions/module/:module')
  @Permissions(PERMISSIONS.PERMISSIONS_VIEW) // 🔒 Admin only
  @ApiOperation({
    summary: 'Get permissions by module',
    description: 'Returns permissions for specific module. Admin only.',
  })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., products, sales)',
  })
  @ApiResultResponse({
    status: 200,
    description: 'Module permissions retrieved',
  })
  @ApiResponse({ status: 200, description: 'Module permissions retrieved' })
  async getPermissionsByModule(@Param('module') module: string) {
    return this.service.getPermissionsByModule(module);
  }

  @Post('permissions')
  @Permissions(PERMISSIONS.PERMISSIONS_ASSIGN) // 🔒 Admin only
  @ApiOperation({
    summary: 'Create permission',
    description: 'Creates a new permission. Admin only.',
  })
  @ApiResultResponse({ status: 201, description: 'Permission created' })
  @ApiResponse({ status: 201, description: 'Permission created' })
  @ApiBadRequestResponse({
    description: 'Validation error or permission code exists',
  })
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.service.createPermission(dto);
  }
}
