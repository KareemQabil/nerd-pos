// Users DTOs
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md

import {
    IsString,
    IsNumber,
    IsOptional,
    IsUUID,
    IsArray,
    IsEmail,
    MinLength,
    Min,
    Max,
    Length,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// ==================== LOGIN ====================

export class LoginDto {
    @IsString()
    username: string;

    @IsString()
    password: string;
}

export class VerifyPinDto {
    @IsString()
    @Length(4, 6)
    pin: string;
}

// ==================== CREATE USER ====================

export class CreateUserDto {
    @IsString()
    username: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    @Length(4, 6)
    pin?: string;

    @IsString()
    nameAr: string;

    @IsString()
    nameEn: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsUUID()
    roleId?: string;

    @IsString()
    role: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) { }

export class UpdatePinDto {
    @IsString()
    @Length(4, 6)
    newPin: string;
}

export class ChangePasswordDto {
    @IsString()
    currentPassword: string;

    @IsString()
    @MinLength(8)
    newPassword: string;
}

// ==================== ROLE ====================

export class CreateRoleDto {
    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    @Min(1)
    @Max(5)
    level: number;

    @IsArray()
    @IsUUID('4', { each: true })
    permissionIds: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) { }

// ==================== PERMISSION ====================

export class CreatePermissionDto {
    @IsString()
    code: string;

    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    module: string;

    @IsOptional()
    @IsString()
    section?: string;
}
