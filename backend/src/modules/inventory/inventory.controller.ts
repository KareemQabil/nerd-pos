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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
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
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) { }

  // ==================== WAREHOUSE ====================

  @Post('warehouses')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create warehouse', description: 'Creates a new warehouse location. Admin only.' })
  @ApiResponse({ status: 201, description: 'Warehouse created successfully' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicate warehouse code' })
  async createWarehouse(@Body() dto: CreateWarehouseDto) {
    return this.service.createWarehouse(dto);
  }

  @Get('warehouses')
  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @ApiOperation({ summary: 'Get all warehouses', description: 'Returns list of all warehouses' })
  @ApiResponse({ status: 200, description: 'Warehouses retrieved' })
  async getAllWarehouses() {
    return this.service.getAllWarehouses();
  }

  @Get('warehouses/default')
  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @ApiOperation({ summary: 'Get default warehouse', description: 'Returns the default warehouse' })
  @ApiResponse({ status: 200, description: 'Default warehouse retrieved' })
  @ApiNotFoundResponse({ description: 'No default warehouse configured' })
  async getDefaultWarehouse() {
    return this.service.getDefaultWarehouse();
  }

  // ==================== STOCK ====================

  @Post('receive')
  @Permissions(PERMISSIONS.INVENTORY_RECEIVE) // Cashier+
  @ApiOperation({ summary: 'Receive stock', description: 'Records stock received from supplier' })
  @ApiResponse({ status: 201, description: 'Stock received successfully' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async receiveStock(
    @Body() dto: ReceiveStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.receiveStock(dto, userId);
  }

  @Post('adjust')
  @Permissions(PERMISSIONS.INVENTORY_ADJUST) // 🔒 Manager only
  @ApiOperation({ summary: 'Adjust stock', description: 'Adjusts stock with reason. Manager only.' })
  @ApiResponse({ status: 201, description: 'Stock adjusted successfully' })
  @ApiBadRequestResponse({ description: 'Validation error or insufficient stock' })
  async adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.adjustStock(dto, userId);
  }

  @Post('transfer')
  @Permissions(PERMISSIONS.INVENTORY_TRANSFER) // Cashier+
  @ApiOperation({ summary: 'Transfer stock', description: 'Transfers stock between warehouses' })
  @ApiResponse({ status: 201, description: 'Stock transferred successfully' })
  @ApiBadRequestResponse({ description: 'Validation error or insufficient stock' })
  async transferStock(
    @Body() dto: TransferStockDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.service.transferStock(dto, userId);
  }

  @Get('stock/:productId/:warehouseId')
  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @ApiOperation({ summary: 'Get stock level', description: 'Returns stock level for product in warehouse' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse UUID' })
  @ApiResponse({ status: 200, description: 'Stock level retrieved' })
  async getStockLevel(
    @Param('productId') productId: string,
    @Param('warehouseId') warehouseId: string,
  ) {
    return this.service.getStockLevel(productId, warehouseId);
  }

  @Get('available/:productId/:warehouseId')
  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @ApiOperation({ summary: 'Get available stock', description: 'Returns available (unreserved) stock for product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse UUID' })
  @ApiResponse({ status: 200, description: 'Available stock retrieved' })
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

  @Get('low-stock')
  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @ApiOperation({ summary: 'Get low stock items', description: 'Returns products below reorder point' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse UUID' })
  @ApiResponse({ status: 200, description: 'Low stock items retrieved' })
  async getLowStockItems(@Query('warehouseId') warehouseId?: string) {
    return this.service.getLowStockItems(warehouseId);
  }

  @Get('expiring')
  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @ApiOperation({ summary: 'Get expiring batches', description: 'Returns batches expiring within specified days' })
  @ApiQuery({ name: 'days', required: false, description: 'Days until expiry (default: 30)' })
  @ApiResponse({ status: 200, description: 'Expiring batches retrieved' })
  async getExpiringBatches(@Query('days') days?: string) {
    return this.service.getExpiringBatches(days ? parseInt(days, 10) : 30);
  }

  @Get('movements/:productId')
  @Permissions(PERMISSIONS.INVENTORY_VIEW) // All roles
  @ApiOperation({ summary: 'Get movement history', description: 'Returns stock movement history for product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter by warehouse UUID' })
  @ApiResponse({ status: 200, description: 'Movement history retrieved' })
  async getMovementHistory(
    @Param('productId') productId: string,
    @Query('warehouseId') warehouseId?: string,
  ) {
    return this.service.getMovementHistory(productId, warehouseId);
  }

  // ==================== RECIPE ====================

  @Post('recipes')
  @Permissions(PERMISSIONS.INVENTORY_RECIPE_MANAGE) // 🔒 Manager+
  @ApiOperation({ summary: 'Create recipe', description: 'Creates a new recipe for composite product. Manager+ required.' })
  @ApiResponse({ status: 201, description: 'Recipe created successfully' })
  @ApiBadRequestResponse({ description: 'Validation error or product already has recipe' })
  async createRecipe(@Body() dto: CreateRecipeDto) {
    return this.service.createRecipe(dto);
  }

  @Get('recipes/:productId')
  @Permissions(PERMISSIONS.INVENTORY_RECIPE_VIEW) // All roles
  @ApiOperation({ summary: 'Get recipe by product', description: 'Returns recipe and ingredients for product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Recipe retrieved' })
  @ApiNotFoundResponse({ description: 'Recipe not found for product' })
  async getRecipe(@Param('productId') productId: string) {
    return this.service.getRecipeByProduct(productId);
  }

  @Post('recipes/ingredients')
  @Permissions(PERMISSIONS.INVENTORY_RECIPE_MANAGE) // 🔒 Manager+
  @ApiOperation({ summary: 'Add recipe ingredient', description: 'Adds ingredient to existing recipe. Manager+ required.' })
  @ApiResponse({ status: 201, description: 'Ingredient added to recipe' })
  @ApiBadRequestResponse({ description: 'Validation error or recipe not found' })
  async addRecipeIngredient(@Body() dto: AddRecipeIngredientDto) {
    return this.service.addRecipeIngredient(dto);
  }

  @Get('recipes/:productId/cost')
  @Permissions(PERMISSIONS.INVENTORY_RECIPE_VIEW) // All roles
  @ApiOperation({ summary: 'Calculate recipe cost', description: 'Calculates total cost per unit based on ingredients' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Recipe cost calculated' })
  @ApiNotFoundResponse({ description: 'Recipe not found for product' })
  async calculateRecipeCost(@Param('productId') productId: string) {
    const cost = await this.service.calculateRecipeCost(productId);
    return { productId, costPerUnit: cost.toString() };
  }
}

