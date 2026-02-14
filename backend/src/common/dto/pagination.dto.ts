// Pagination DTO
// Source: Final Cleanup - Pagination Implementation
// Follows: FINAL/BACKEND/02-CORE-PATTERNS.md

import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

export class PaginationDto {
    @ApiPropertyOptional({
        description: 'Page number (1-indexed)',
        minimum: 1,
        default: 1,
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Number of items per page',
        minimum: 1,
        maximum: 100,
        default: 20,
        example: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Sort field',
        example: 'createdAt',
    })
    @IsOptional()
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({
        description: 'Sort order',
        enum: SortOrder,
        default: SortOrder.DESC,
        example: 'desc',
    })
    @IsOptional()
    @IsEnum(SortOrder)
    sortOrder?: SortOrder = SortOrder.DESC;

    // Helper to get Prisma skip value
    getSkip(): number {
        return ((this.page ?? 1) - 1) * (this.limit ?? 20);
    }

    // Helper to get Prisma take value
    getTake(): number {
        return this.limit ?? 20;
    }

    // Helper to get Prisma orderBy object
    getOrderBy(): Record<string, 'asc' | 'desc'> {
        return { [this.sortBy ?? 'createdAt']: this.sortOrder ?? 'desc' };
    }
}
