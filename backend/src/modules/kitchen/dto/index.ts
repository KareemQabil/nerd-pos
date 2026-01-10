// Kitchen DTOs
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md

import {
    IsString,
    IsNumber,
    IsOptional,
    IsUUID,
    IsArray,
    IsIn,
    IsBoolean,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

// ==================== KITCHEN STATION ====================

export class CreateKitchenStationDto {
    @IsString()
    name: string;

    @IsString()
    nameAr: string;

    @IsString()
    color: string;

    @IsNumber()
    displayOrder: number;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    categoryIds?: string[];
}

export class UpdateKitchenStationDto extends PartialType(CreateKitchenStationDto) { }

// ==================== TICKET OPERATIONS ====================

export class RouteOrderDto {
    @IsUUID()
    orderId: string;
}

export class BumpItemDto {
    @IsUUID()
    ticketId: string;

    @IsUUID()
    itemId: string;
}

export class UpdateTicketStatusDto {
    @IsIn(['NEW', 'PREPARING', 'READY', 'COMPLETED'])
    status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
}

// ==================== TICKET ITEM ====================

export class UpdateTicketItemStatusDto {
    @IsIn(['NEW', 'PREPARING', 'READY'])
    status: 'NEW' | 'PREPARING' | 'READY';
}
