// Inventory Controller
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
    CreateWarehouseDto,
    ReceiveStockDto,
    AdjustStockDto,
    TransferStockDto,
    CreateRecipeDto,
    AddRecipeIngredientDto,
} from './dto';

@Controller('inventory')
export class InventoryController {
    constructor(private readonly service: InventoryService) { }

    // ==================== WAREHOUSE ====================

    @Post('warehouses')
    async createWarehouse(@Body() dto: CreateWarehouseDto) {
        return this.service.createWarehouse(dto);
    }

    @Get('warehouses')
    async getAllWarehouses() {
        return this.service.getAllWarehouses();
    }

    @Get('warehouses/default')
    async getDefaultWarehouse() {
        return this.service.getDefaultWarehouse();
    }

    // ==================== STOCK ====================

    @Post('receive')
    async receiveStock(@Body() dto: ReceiveStockDto) {
        // TODO: Get userId from JWT token
        return this.service.receiveStock(dto, 'system');
    }

    @Post('adjust')
    async adjustStock(@Body() dto: AdjustStockDto) {
        return this.service.adjustStock(dto, 'system');
    }

    @Post('transfer')
    async transferStock(@Body() dto: TransferStockDto) {
        return this.service.transferStock(dto, 'system');
    }

    @Get('stock/:productId/:warehouseId')
    async getStockLevel(
        @Param('productId') productId: string,
        @Param('warehouseId') warehouseId: string,
    ) {
        return this.service.getStockLevel(productId, warehouseId);
    }

    @Get('available/:productId/:warehouseId')
    async getAvailableStock(
        @Param('productId') productId: string,
        @Param('warehouseId') warehouseId: string,
    ) {
        const available = await this.service.getAvailableStock(productId, warehouseId);
        return { productId, warehouseId, availableQuantity: available };
    }

    @Get('low-stock')
    async getLowStockItems(@Query('warehouseId') warehouseId?: string) {
        return this.service.getLowStockItems(warehouseId);
    }

    @Get('expiring')
    async getExpiringBatches(@Query('days') days?: string) {
        return this.service.getExpiringBatches(days ? parseInt(days, 10) : 30);
    }

    @Get('movements/:productId')
    async getMovementHistory(
        @Param('productId') productId: string,
        @Query('warehouseId') warehouseId?: string,
    ) {
        return this.service.getMovementHistory(productId, warehouseId);
    }

    // ==================== RECIPE ====================

    @Post('recipes')
    async createRecipe(@Body() dto: CreateRecipeDto) {
        return this.service.createRecipe(dto);
    }

    @Get('recipes/:productId')
    async getRecipe(@Param('productId') productId: string) {
        return this.service.getRecipeByProduct(productId);
    }

    @Post('recipes/ingredients')
    async addRecipeIngredient(@Body() dto: AddRecipeIngredientDto) {
        return this.service.addRecipeIngredient(dto);
    }

    @Get('recipes/:productId/cost')
    async calculateRecipeCost(@Param('productId') productId: string) {
        const cost = await this.service.calculateRecipeCost(productId);
        return { productId, costPerUnit: cost.toString() };
    }
}
