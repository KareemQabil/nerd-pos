// Users Controller
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md

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
import { OwnershipGuard, SkipOwnershipCheck } from '../auth/guards/ownership.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
export class UsersController {
    constructor(private readonly service: UsersService) { }

    // ==================== AUTH ====================

    @Public()
    @Post('login')
    async login(@Body() dto: LoginDto) {
        return this.service.login(dto.username, dto.password);
    }

    @Post('verify-pin')
    async verifyPin(@Body() dto: VerifyPinDto & { userId: string }) {
        return this.service.verifyPin(dto.userId, dto.pin);
    }

    @Post('manager-auth')
    async verifyManagerPin(@Body() dto: VerifyPinDto) {
        return this.service.verifyManagerPin(dto.pin);
    }

    // ==================== USERS ====================

    @Post()
    async create(@Body() dto: CreateUserDto) {
        return this.service.createUser(dto);
    }

    @Get()
    async getAll() {
        return this.service.findAll();
    }

    /**
     * GET /users/:id - User can only view their own profile (unless ADMIN/MANAGER)
     */
    @UseGuards(OwnershipGuard)
    @Get(':id')
    async findById(@Param('id') id: string, @Request() req: any) {
        // Self-ownership check: user can only view their own profile
        const userId = req.user?.sub;
        const userRole = req.user?.role;

        // Allow if viewing own profile or if ADMIN/MANAGER
        if (userId !== id && !['ADMIN', 'MANAGER'].includes(userRole)) {
            throw new ForbiddenException('You can only view your own profile');
        }

        return this.service.findById(id);
    }

    /**
     * PUT /users/:id - User can only edit their own profile (unless ADMIN/MANAGER)
     */
    @UseGuards(OwnershipGuard)
    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: any) {
        const userId = req.user?.sub;
        const userRole = req.user?.role;

        // Self-ownership check
        if (userId !== id && !['ADMIN', 'MANAGER'].includes(userRole)) {
            throw new ForbiddenException('You can only edit your own profile');
        }

        return this.service.updateUser(id, dto);
    }

    @Put(':id/pin')
    async updatePin(@Param('id') id: string, @Body() dto: UpdatePinDto) {
        return this.service.updatePin(id, dto.newPin);
    }

    @Post(':id/change-password')
    async changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
        return this.service.changePassword(id, dto.currentPassword, dto.newPassword);
    }

    @Get(':id/permissions/:code')
    async hasPermission(
        @Param('id') id: string,
        @Param('code') code: string,
    ) {
        return { hasPermission: await this.service.hasPermission(id, code) };
    }

    // ==================== ROLES ====================

    @Get('roles')
    async getAllRoles() {
        return this.service.getAllRoles();
    }

    @Post('roles')
    async createRole(@Body() dto: CreateRoleDto) {
        return this.service.createRole(dto);
    }

    @Put('roles/:id')
    async updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
        return this.service.updateRole(id, dto);
    }

    // ==================== PERMISSIONS ====================

    @Get('permissions')
    async getAllPermissions() {
        return this.service.getAllPermissions();
    }

    @Get('permissions/module/:module')
    async getPermissionsByModule(@Param('module') module: string) {
        return this.service.getPermissionsByModule(module);
    }

    @Post('permissions')
    async createPermission(@Body() dto: CreatePermissionDto) {
        return this.service.createPermission(dto);
    }
}
