/**
 * Lookup DTO
 * Production Cleanup 2026-01-23
 *
 * Standard lookup request/response DTOs for dropdown data.
 * Follows: FINAL/BACKEND/02-CORE-PATTERNS.md
 */

import { IsOptional, IsString, IsUUID, IsInt, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LookupQueryDto {
    @ApiPropertyOptional({
        description: 'Search term to filter results by name',
        example: 'cof',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Parent/filter ID (e.g., categoryId, floorId)',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsOptional()
    @IsUUID()
    parentId?: string;

    @ApiPropertyOptional({
        description: 'Role filter for users lookup',
        example: 'CASHIER',
    })
    @IsOptional()
    @IsString()
    role?: string;

    @ApiPropertyOptional({
        description: 'Maximum number of results',
        default: 50,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Max(100)
    limit?: number = 50;
}

export interface LookupItem {
    id: string;
    nameEn: string;
    nameAr: string;
    active?: boolean;
    metadata?: Record<string, any>;
}

export class LookupItemResponseDto {
    @ApiProperty({ description: 'Lookup item UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @ApiProperty({ description: 'English display name', example: 'Beverages' })
    nameEn: string;

    @ApiProperty({ description: 'Arabic display name', example: '??????' })
    nameAr: string;

    @ApiPropertyOptional({ description: 'Active flag', example: true })
    active?: boolean;

    @ApiPropertyOptional({
        description: 'Additional metadata for the lookup item',
        example: { code: 'BEV' },
    })
    metadata?: Record<string, any>;
}
