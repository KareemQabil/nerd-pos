/**
 * Lookup Controller
 * Production Cleanup 2026-01-23
 *
 * Generic lookup endpoints for dropdown data.
 * All endpoints marked @Public() for frontend dropdown access.
 * Follows: FINAL/BACKEND/01-MODULE-STRUCTURE.md
 */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LookupService } from './lookup.service';
import {
    LookupQueryDto,
    LookupItem,
    LookupItemResponseDto,
} from '../../common/dto/lookup.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiResultResponse } from '../../common/decorators';

@ApiTags('Lookup - Reference Data')
@Controller('lookup')
export class LookupController {
    constructor(private readonly lookupService: LookupService) { }

    @Get('categories')
    @Public()
    @ApiOperation({
        summary: 'Get all categories for dropdown',
        description: 'Returns id, nameEn, nameAr for all active categories',
    })
    @ApiResultResponse({
        status: 200,
        description: 'Categories retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getCategories(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getCategories(dto);
    }

    @Get('products')
    @Public()
    @ApiOperation({
        summary: 'Get products for dropdown',
        description: 'Supports filtering by categoryId (parentId) and search term',
    })
    @ApiResultResponse({
        status: 200,
        description: 'Products retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getProducts(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getProducts(dto);
    }

    @Get('tables')
    @Public()
    @ApiOperation({
        summary: 'Get tables for dropdown',
        description: 'Supports filtering by floorId (parentId)',
    })
    @ApiResultResponse({
        status: 200,
        description: 'Tables retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getTables(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getTables(dto);
    }

    @Get('floors')
    @Public()
    @ApiOperation({ summary: 'Get floors for dropdown' })
    @ApiResultResponse({
        status: 200,
        description: 'Floors retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getFloors(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getFloors(dto);
    }

    @Get('users')
    @Public()
    @ApiOperation({
        summary: 'Get users for dropdown',
        description: 'Supports filtering by role (e.g., CASHIER, KITCHEN)',
    })
    @ApiResultResponse({
        status: 200,
        description: 'Users retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getUsers(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getUsers(dto);
    }

    @Get('customers')
    @Public()
    @ApiOperation({
        summary: 'Search customers by phone or name',
        description: 'For customer search in orders',
    })
    @ApiResultResponse({
        status: 200,
        description: 'Customers retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getCustomers(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getCustomers(dto);
    }

    @Get('kitchen-stations')
    @Public()
    @ApiOperation({ summary: 'Get kitchen stations for dropdown' })
    @ApiResultResponse({
        status: 200,
        description: 'Kitchen stations retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getKitchenStations(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getKitchenStations(dto);
    }

    @Get('modifier-groups')
    @Public()
    @ApiOperation({
        summary: 'Get modifier groups for dropdown',
        description: 'For product modifiers',
    })
    @ApiResultResponse({
        status: 200,
        description: 'Modifier groups retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getModifierGroups(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getModifierGroups(dto);
    }

    @Get('warehouses')
    @Public()
    @ApiOperation({ summary: 'Get warehouses for dropdown' })
    @ApiResultResponse({
        status: 200,
        description: 'Warehouses retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getWarehouses(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getWarehouses(dto);
    }

    @Get('delivery-zones')
    @Public()
    @ApiOperation({ summary: 'Get delivery zones for dropdown' })
    @ApiResultResponse({
        status: 200,
        description: 'Delivery zones retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getDeliveryZones(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
        return this.lookupService.getDeliveryZones(dto);
    }

    // ==================== STATIC ENUM LOOKUPS ====================

    @Get('payment-methods')
    @Public()
    @ApiOperation({ summary: 'Get available payment methods' })
    @ApiResultResponse({
        status: 200,
        description: 'Payment methods retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getPaymentMethods(): Promise<LookupItem[]> {
        return this.lookupService.getPaymentMethods();
    }

    @Get('order-types')
    @Public()
    @ApiOperation({ summary: 'Get available order types' })
    @ApiResultResponse({
        status: 200,
        description: 'Order types retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getOrderTypes(): Promise<LookupItem[]> {
        return this.lookupService.getOrderTypes();
    }

    @Get('order-statuses')
    @Public()
    @ApiOperation({ summary: 'Get all order statuses' })
    @ApiResultResponse({
        status: 200,
        description: 'Order statuses retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getOrderStatuses(): Promise<LookupItem[]> {
        return this.lookupService.getOrderStatuses();
    }

    @Get('table-statuses')
    @Public()
    @ApiOperation({ summary: 'Get all table statuses' })
    @ApiResultResponse({
        status: 200,
        description: 'Table statuses retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getTableStatuses(): Promise<LookupItem[]> {
        return this.lookupService.getTableStatuses();
    }

    @Get('discount-types')
    @Public()
    @ApiOperation({ summary: 'Get discount types' })
    @ApiResultResponse({
        status: 200,
        description: 'Discount types retrieved',
        type: LookupItemResponseDto,
        isArray: true,
    })
    async getDiscountTypes(): Promise<LookupItem[]> {
        return this.lookupService.getDiscountTypes();
    }
}
