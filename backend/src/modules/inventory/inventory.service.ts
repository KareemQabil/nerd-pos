// Inventory Service
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
// Critical: FIFO stock deduction strategy, Movement tracking

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InventoryRepository } from './inventory.repository';
import { FIFOStrategy } from './strategies/fifo.strategy';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import {
    CreateWarehouseDto,
    ReceiveStockDto,
    AdjustStockDto,
    TransferStockDto,
    CreateRecipeDto,
    AddRecipeIngredientDto,
} from './dto';
import {
    StockReceivedEvent,
    StockDeductedEvent,
    StockAdjustedEvent,
    StockTransferredEvent,
    LowStockAlertEvent,
} from './events/inventory.events';
import { Warehouse, InventoryItem, Recipe, DeductionResult } from './entities/inventory.entity';
import Decimal from 'decimal.js';

@Injectable()
export class InventoryService {
    constructor(
        private readonly repo: InventoryRepository,
        private readonly fifoStrategy: FIFOStrategy,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) { }

    // ==================== WAREHOUSE ====================

    async createWarehouse(dto: CreateWarehouseDto): Promise<Warehouse> {
        return this.repo.createWarehouse(dto);
    }

    async getAllWarehouses(): Promise<Warehouse[]> {
        return this.repo.findAllWarehouses();
    }

    async getDefaultWarehouse(): Promise<Warehouse> {
        const warehouse = await this.repo.findDefaultWarehouse();
        if (!warehouse) {
            throw new NotFoundException('No default warehouse configured');
        }
        return warehouse;
    }

    // ==================== STOCK OPERATIONS ====================

    async receiveStock(dto: ReceiveStockDto, userId: string): Promise<InventoryItem> {
        const { productId, warehouseId, quantity, costPerUnit, batchNumber, expiryDate } = dto;

        // Get or create inventory item
        const item = await this.repo.getOrCreateInventoryItem(productId, warehouseId);

        // Create batch for FIFO tracking
        const batch = await this.repo.createBatch({
            inventoryItemId: item.id,
            batchNumber,
            receivedDate: new Date(),
            expiryDate,
            quantityReceived: quantity,
            quantityRemaining: quantity,
            costPerUnit: new Decimal(costPerUnit).toNumber(),
        });

        // Create movement record
        await this.repo.createMovement({
            type: 'IN',
            productId,
            warehouseId,
            batchId: batch.id,
            quantity,
            unitCost: costPerUnit,
            totalValue: new Decimal(costPerUnit).times(quantity).toNumber(),
            referenceType: 'PURCHASE',
            createdBy: userId,
        });

        // Update inventory item quantity and average cost
        const newQuantity = new Decimal(item.quantityOnHand).plus(quantity);
        const oldTotal = new Decimal(item.quantityOnHand).times(item.averageCost || 0);
        const newTotal = oldTotal.plus(new Decimal(costPerUnit).times(quantity));
        const newAvgCost = newQuantity.gt(0) ? newTotal.dividedBy(newQuantity) : new Decimal(0);

        const updatedItem = await this.repo.update(item.id, {
            quantityOnHand: newQuantity.toNumber(),
            averageCost: newAvgCost.toNumber(),
        });

        // Publish event
        await this.eventBus.publish(
            'StockReceived',
            new StockReceivedEvent(productId, warehouseId, quantity, batch.id),
        );

        return updatedItem;
    }

    // CRITICAL: FIFO Stock Deduction with Movement Tracking
    async deductStock(
        productId: string,
        warehouseId: string,
        quantity: number,
        referenceType: string,
        referenceId: string,
        userId: string,
    ): Promise<DeductionResult[]> {
        // Use FIFO strategy to deduct from oldest batches
        const deductions = await this.fifoStrategy.deduct(productId, warehouseId, quantity);

        // Create movement records for each batch deduction
        for (const deduction of deductions) {
            await this.repo.createMovement({
                type: 'OUT',
                productId,
                warehouseId,
                batchId: deduction.batchId,
                quantity: -deduction.quantity, // Negative for OUT
                unitCost: deduction.unitCost,
                totalValue: deduction.totalCost,
                referenceType,
                referenceId,
                createdBy: userId,
            });
        }

        // Check for low stock alert
        const item = await this.repo.findByProductAndWarehouse(productId, warehouseId);
        if (item && new Decimal(item.quantityOnHand).lte(item.reorderPoint)) {
            await this.eventBus.publish(
                'LowStockAlert',
                new LowStockAlertEvent(productId, warehouseId, item.quantityOnHand, item.reorderPoint),
            );
        }

        // Publish deduction event
        await this.eventBus.publish(
            'StockDeducted',
            new StockDeductedEvent(productId, warehouseId, quantity, referenceId),
        );

        return deductions;
    }

    async adjustStock(dto: AdjustStockDto, userId: string): Promise<InventoryItem> {
        const { productId, warehouseId, quantity, reason, notes } = dto;
        const item = await this.repo.getOrCreateInventoryItem(productId, warehouseId);

        const newQuantity = new Decimal(item.quantityOnHand).plus(quantity);
        if (newQuantity.lessThan(0)) {
            throw new BadRequestException('Adjustment would result in negative stock');
        }

        // Create adjustment movement
        await this.repo.createMovement({
            type: 'ADJUSTMENT',
            productId,
            warehouseId,
            quantity,
            reason,
            notes,
            createdBy: userId,
        });

        const updatedItem = await this.repo.update(item.id, {
            quantityOnHand: newQuantity.toNumber(),
        });

        await this.eventBus.publish(
            'StockAdjusted',
            new StockAdjustedEvent(productId, warehouseId, quantity, reason),
        );

        return updatedItem;
    }

    async transferStock(dto: TransferStockDto, userId: string): Promise<void> {
        const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = dto;

        // Deduct from source warehouse using FIFO
        const deductions = await this.deductStock(
            productId,
            fromWarehouseId,
            quantity,
            'TRANSFER',
            `transfer-${Date.now()}`,
            userId,
        );

        // Calculate weighted average cost from deductions
        const totalCost = deductions.reduce(
            (sum, d) => sum.plus(new Decimal(d.totalCost)),
            new Decimal(0),
        );
        const avgCost = totalCost.dividedBy(quantity);

        // Add to destination warehouse
        await this.receiveStock(
            {
                productId,
                warehouseId: toWarehouseId,
                quantity,
                costPerUnit: avgCost.toNumber(),
            },
            userId,
        );

        await this.eventBus.publish(
            'StockTransferred',
            new StockTransferredEvent(productId, fromWarehouseId, toWarehouseId, quantity),
        );
    }

    // ==================== QUERY OPERATIONS ====================

    async getStockLevel(productId: string, warehouseId: string): Promise<InventoryItem | null> {
        return this.repo.findByProductAndWarehouse(productId, warehouseId);
    }

    async getAvailableStock(productId: string, warehouseId: string): Promise<number> {
        return this.fifoStrategy.getAvailableStock(productId, warehouseId);
    }

    async getLowStockItems(warehouseId?: string): Promise<InventoryItem[]> {
        return this.repo.findLowStockItems(warehouseId);
    }

    async getExpiringBatches(daysUntilExpiry: number = 30) {
        return this.repo.findExpiringBatches(daysUntilExpiry);
    }

    async getMovementHistory(productId: string, warehouseId?: string) {
        return this.repo.findMovementsByProduct(productId, warehouseId);
    }

    // ==================== RECIPE ====================

    async createRecipe(dto: CreateRecipeDto): Promise<Recipe> {
        return this.repo.createRecipe(dto);
    }

    async getRecipeByProduct(productId: string): Promise<Recipe | null> {
        return this.repo.findRecipeByProduct(productId);
    }

    async addRecipeIngredient(dto: AddRecipeIngredientDto) {
        return this.repo.addRecipeIngredient(dto);
    }

    // Calculate recipe cost based on FIFO ingredient costs
    async calculateRecipeCost(productId: string): Promise<Decimal> {
        const recipe = await this.repo.findRecipeByProduct(productId);
        if (!recipe) {
            throw new NotFoundException(`No recipe found for product ${productId}`);
        }

        const defaultWarehouse = await this.getDefaultWarehouse();
        let totalCost = new Decimal(0);

        // Calculate cost for each ingredient
        for (const ingredient of (recipe as any).ingredients || []) {
            const cogs = await this.fifoStrategy.getCOGS(
                ingredient.productId,
                defaultWarehouse.id,
                ingredient.quantity,
            );
            totalCost = totalCost.plus(cogs);
        }

        // Divide by yield to get cost per unit
        const costPerUnit = totalCost.dividedBy(recipe.yield || 1);
        return costPerUnit;
    }
}
