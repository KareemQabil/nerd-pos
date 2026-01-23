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
  @ApiProperty({
    description: 'Username for authentication',
    example: 'cashier01',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
  })
  @IsString()
  password: string;
}

export class VerifyPinDto {
  @ApiProperty({
    description: 'User PIN (4-6 digits)',
    example: '1234',
  })
  @IsString()
  @Length(4, 6)
  pin: string;
}

// ==================== CREATE USER ====================

export class CreateUserDto {
  @ApiProperty({
    description: 'Unique username',
    example: 'cashier01',
  })
  @IsString()
  username: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'cashier@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Password (minimum 8 characters)',
    example: 'SecurePass123!',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Quick access PIN (4-6 digits)',
    example: '1234',
  })
  @IsOptional()
  @IsString()
  @Length(4, 6)
  pin?: string;

  @ApiProperty({
    description: 'Full name (Arabic)',
    example: 'علي محمد',
  })
  @IsString()
  nameAr: string;

  @ApiProperty({
    description: 'Full name (English)',
    example: 'Ali Mohammed',
  })
  @IsString()
  nameEn: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+966501234567',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Role UUID',
    example: 'r23e4567-e89b-12d3-a456-426614174030',
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({
    description: 'Role name',
    example: 'Cashier',
  })
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
  @ApiProperty({
    description: 'Role name (English)',
    example: 'Cashier',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Role name (Arabic)',
    example: 'كاشير',
  })
  @IsString()
  nameAr: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Can process sales and manage orders',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Role level (1=lowest, 5=highest)',
    example: 2,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  level: number;

  @ApiProperty({
    description: 'Permission UUIDs assigned to this role',
    example: ['p1-uuid', 'p2-uuid'],
    type: [String],
  })
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
  @ApiProperty({ description: 'User ID (UUID)', example: 'u23e4567-e89b-12d3-a456-426614174020' })
  id: string;

  @Expose()
  @ApiProperty({ description: 'Username (unique login identifier)', example: 'cashier01' })
  username: string;

  @Expose()
  @ApiProperty({ description: 'Full name in English', example: 'Ali Mohammed' })
  nameEn: string;

  @Expose()
  @ApiProperty({ description: 'Full name in Arabic', example: 'علي محمد' })
  nameAr: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Email address', example: 'cashier@example.com' })
  email?: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Phone number', example: '+966501234567' })
  phone?: string;

  @Expose()
  @ApiProperty({ description: 'User role name', example: 'Cashier' })
  role: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Role ID reference', example: 'r23e4567-e89b-12d3-a456-426614174030' })
  roleId?: string;

  @Expose()
  @ApiProperty({ description: 'Whether the user is active', example: true })
  isActive: boolean;

  @Expose()
  @ApiPropertyOptional({ description: 'Created timestamp', example: '2024-01-10T08:00:00Z' })
  createdAt?: Date;

  @Expose()
  @ApiPropertyOptional({ description: 'Last updated timestamp', example: '2024-01-20T14:30:00Z' })
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
