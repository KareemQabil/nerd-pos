/**
 * Lookup Controller
 * Production Cleanup 2026-01-23
 *
 * Generic lookup endpoints for dropdown data.
 * All endpoints marked @Public() for frontend dropdown access.
 * Follows: FINAL/BACKEND/01-MODULE-STRUCTURE.md
 */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LookupService } from './lookup.service';
import { LookupQueryDto, LookupItem } from '../../common/dto/lookup.dto';

@ApiTags('Lookup - Reference Data')
@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Get all categories for dropdown',
    description: 'Returns id, nameEn, nameAr for all active categories',
  })
  @ApiResponse({
    status: 200,
    description: 'List of categories',
  })
  async getCategories(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getCategories(dto);
  }

  @Get('products')
  @ApiOperation({
    summary: 'Get products for dropdown',
    description: 'Supports filtering by categoryId (parentId) and search term',
  })
  async getProducts(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getProducts(dto);
  }

  @Get('tables')
  @ApiOperation({
    summary: 'Get tables for dropdown',
    description: 'Supports filtering by floorId (parentId)',
  })
  async getTables(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getTables(dto);
  }

  @Get('floors')
  @ApiOperation({ summary: 'Get floors for dropdown' })
  async getFloors(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getFloors(dto);
  }

  @Get('users')
  @ApiOperation({
    summary: 'Get users for dropdown',
    description: 'Supports filtering by role (e.g., CASHIER, KITCHEN)',
  })
  async getUsers(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getUsers(dto);
  }

  @Get('customers')
  @ApiOperation({
    summary: 'Search customers by phone or name',
    description: 'For customer search in orders',
  })
  async getCustomers(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getCustomers(dto);
  }

  @Get('kitchen-stations')
  @ApiOperation({ summary: 'Get kitchen stations for dropdown' })
  async getKitchenStations(
    @Query() dto: LookupQueryDto,
  ): Promise<LookupItem[]> {
    return this.lookupService.getKitchenStations(dto);
  }

  @Get('modifier-groups')
  @ApiOperation({
    summary: 'Get modifier groups for dropdown',
    description: 'For product modifiers',
  })
  async getModifierGroups(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getModifierGroups(dto);
  }

  @Get('warehouses')
  @ApiOperation({ summary: 'Get warehouses for dropdown' })
  async getWarehouses(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getWarehouses(dto);
  }

  @Get('delivery-zones')
  @ApiOperation({ summary: 'Get delivery zones for dropdown' })
  async getDeliveryZones(@Query() dto: LookupQueryDto): Promise<LookupItem[]> {
    return this.lookupService.getDeliveryZones(dto);
  }

  // ==================== STATIC ENUM LOOKUPS ====================

  @Get('payment-methods')
  @ApiOperation({ summary: 'Get available payment methods' })
  async getPaymentMethods(): Promise<LookupItem[]> {
    return this.lookupService.getPaymentMethods();
  }

  @Get('order-types')
  @ApiOperation({ summary: 'Get available order types' })
  async getOrderTypes(): Promise<LookupItem[]> {
    return this.lookupService.getOrderTypes();
  }

  @Get('order-statuses')
  @ApiOperation({ summary: 'Get all order statuses' })
  async getOrderStatuses(): Promise<LookupItem[]> {
    return this.lookupService.getOrderStatuses();
  }

  @Get('table-statuses')
  @ApiOperation({ summary: 'Get all table statuses' })
  async getTableStatuses(): Promise<LookupItem[]> {
    return this.lookupService.getTableStatuses();
  }

  @Get('discount-types')
  @ApiOperation({ summary: 'Get discount types' })
  async getDiscountTypes(): Promise<LookupItem[]> {
    return this.lookupService.getDiscountTypes();
  }
}
