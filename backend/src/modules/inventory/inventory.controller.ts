// Inventory Controller
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateWarehouseDto,
  ReceiveStockDto,
  AdjustStockDto,
  TransferStockDto,
  CreateRecipeDto,
  AddRecipeIngredientDto,
} from './dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Inventory')
@ApiBearerAuth('JWT')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) { }

  // ==================== WAREHOUSE ====================

  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @Post('warehouses')
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.service.createWarehouse(dto);
  }

  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @Get('warehouses')
  async getAllWarehouses() {
    return this.service.getAllWarehouses();
  }

  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @Get('warehouses/default')
  async getDefaultWarehouse() {
    return this.service.getDefaultWarehouse();
  }

  // ==================== STOCK ====================

  @Permissions(PERMISSIONS.INVENTORY_RECEIVE) // Cashier+
  @Post('receive')
  async receiveStock(
    @Body() dto: ReceiveStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.receiveStock(dto, userId);
  }

  @Permissions(PERMISSIONS.INVENTORY_ADJUST) // 🔒 Manager only
  @Post('adjust')
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.adjustStock(dto, userId);
  }

  @Permissions(PERMISSIONS.INVENTORY_TRANSFER) // Cashier+
  @Post('transfer')
  async transferStock(
    @Body() dto: TransferStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.transferStock(dto, userId);
  }

  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @Get('stock/:productId/:warehouseId')
  async getStockLevel(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.service.getStockLevel(productId, warehouseId);
  }

  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @Get('available/:productId/:warehouseId')
  async getAvailableStock(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    const available = await this.service.getAvailableStock(
      productId,
      warehouseId,
    );
    return { productId, warehouseId, availableQuantity: available };
  }

  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @Get('low-stock')
  async getLowStockItems(@Query('warehouseId') warehouseId?: string) {
    return this.service.getLowStockItems(warehouseId);
  }

  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @Get('expiring')
  async getExpiringBatches(@Query('days') days?: string) {
    return this.service.getExpiringBatches(days ? parseInt(days, 10) : 30);
  }

  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @Get('movements/:productId')
  async getMovementHistory(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getMovementHistory(productId, warehouseId);
  }

  // ==================== RECIPE ====================

  @Permissions(PERMISSIONS.INVENTORY_RECIPE_MANAGE) // 🔒 Manager+
  @Post('recipes')
  async createRecipe(@Body() dto: CreateRecipeDto) {
    return this.service.createRecipe(dto);
  }

  @Permissions(PERMISSIONS.INVENTORY_RECIPE_VIEW) // All roles
  @Get('recipes/:productId')
  async getRecipe(@Param('productId') productId: string) {
    return this.service.getRecipeByProduct(productId);
  }

  @Permissions(PERMISSIONS.INVENTORY_RECIPE_MANAGE) // 🔒 Manager+
  @Post('recipes/ingredients')
  async addRecipeIngredient(@Body() dto: AddRecipeIngredientDto) {
    return this.service.addRecipeIngredient(dto);
  }

  @Permissions(PERMISSIONS.INVENTORY_RECIPE_VIEW) // All roles
  @Get('recipes/:productId/cost')
  async calculateRecipeCost(@Param('productId') productId: string) {
    const cost = await this.service.calculateRecipeCost(productId);
    return { productId, costPerUnit: cost.toString() };
  }
}
