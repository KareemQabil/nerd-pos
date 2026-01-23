// Paginated Response DTO
// Source: Final Cleanup - Pagination Implementation
// Follows: FINAL/BACKEND/02-CORE-PATTERNS.md, core/interfaces/pagination.interface.ts

import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
    @ApiProperty({ description: 'Current page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Items per page', example: 20 })
    limit: number;

    @ApiProperty({ description: 'Total number of items', example: 156 })
    total: number;

    @ApiProperty({ description: 'Total number of pages', example: 8 })
    totalPages: number;

    @ApiProperty({ description: 'Whether there is a next page', example: true })
    hasNext: boolean;

    @ApiProperty({ description: 'Whether there is a previous page', example: false })
    hasPrev: boolean;
}

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Array of items for current page', isArray: true })
    data: T[];

    @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
    meta: PaginationMeta;

    constructor(data: T[], total: number, page: number, limit: number) {
        this.data = data;

        const totalPages = Math.ceil(total / limit);

        this.meta = {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        };
    }

    // Static factory method for convenience
    static create<T>(data: T[], total: number, page: number, limit: number): PaginatedResponseDto<T> {
        return new PaginatedResponseDto(data, total, page, limit);
    }
}
