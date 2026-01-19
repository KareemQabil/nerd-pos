// Users DTOs
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md
// Security: Block 2 - Added UserResponseDto to prevent sensitive data leaks

import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  IsArray,
  IsEmail,
  IsBoolean,
  MinLength,
  Min,
  Max,
  Length,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

// ==================== RESPONSE DTOs ====================

/**
 * User Response DTO
 *
 * Prevents sensitive data leakage by excluding:
 * - passwordHash (critical security)
 * - pin (security credential)
 * - salt (internal)
 *
 * @example
 * const safeUser = plainToClass(UserResponseDto, user, { excludeExtraneousValues: true });
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ description: 'User ID (UUID)' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Username (unique login identifier)' })
  username: string;

  @Expose()
  @ApiProperty({ description: 'Full name in English' })
  nameEn: string;

  @Expose()
  @ApiProperty({ description: 'Full name in Arabic' })
  nameAr: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Phone number' })
  phone?: string;

  @Expose()
  @ApiProperty({ description: 'User role name' })
  role: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Role ID reference' })
  roleId?: string;

  @Expose()
  @ApiProperty({ description: 'Whether the user is active' })
  isActive: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Created timestamp' })
  createdAt?: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Last updated timestamp' })
  updatedAt?: Date;

  // ✅ EXCLUDED: passwordHash, pin - NEVER expose these fields
}

/**
 * User List Response DTO - simplified for list views
 */
@Exclude()
export class UserListItemDto {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  nameEn: string;

  @Expose()
  @ApiProperty()
  nameAr: string;

  @Expose()
  @ApiProperty()
  role: string;

  @Expose()
  @ApiProperty()
  isActive: boolean;
}
