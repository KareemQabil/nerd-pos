// Inventory Service
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
// Critical: FIFO stock deduction strategy, Movement tracking
// Sprint 4: Added $transaction wrapper for ACID compliance

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryRepository } from './inventory.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
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
import {
  Warehouse,
  InventoryItem,
  Recipe,
  DeductionResult,
} from './entities/inventory.entity';
import Decimal from 'decimal.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repo: InventoryRepository,
    private readonly prisma: PrismaService, // 🆕 For $transaction
    private readonly fifoStrategy: FIFOStrategy,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}

  // ==================== WAREHOUSE ====================

  async createWarehouse(dto: CreateWarehouseDto): Promise<Warehouse> {
    return this.repo.createWarehouse(dto);
  }

  async getAllWarehouses(): Promise<Warehouse[]> {
    return this.repo.findAllWarehouses();
  }

  async getDefaultWarehouse(): Promise<Warehouse> {
    const warehouse = await this.repo.findDefaultWarehouse();
    const isUuid = (value?: string) =>
      typeof value === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      );

    if (warehouse && isUuid(warehouse.id)) {
      return warehouse;
    }

    const warehouses = await this.repo.findAllWarehouses();
    const validDefault = warehouses.find(
      (item) => item.isDefault && isUuid(item.id),
    );

    if (validDefault) {
      return validDefault;
    }

    const fallback = warehouses.find((item) => isUuid(item.id));
    if (!fallback) {
      throw new NotFoundException('No valid warehouse configured');
    }

    if (warehouse?.isDefault) {
      await this.repo.updateWarehouse(warehouse.id, { isDefault: false });
    }

    return this.repo.updateWarehouse(fallback.id, {
      isDefault: true,
      isActive: true,
    });
  }

  // ==================== STOCK OPERATIONS ====================

  async receiveStock(
    dto: ReceiveStockDto,
    userId: string,
  ): Promise<InventoryItem> {
    const { item: updatedItem, batchId } = await this.prisma.$transaction(
      async (tx) => {
        return this.receiveStockWithTx(dto, userId, tx, 'PURCHASE');
      },
      { maxWait: 10000, timeout: 20000 },
    );

    // Publish event after transaction commits
    await this.eventBus.publish(
      'StockReceived',
      new StockReceivedEvent(
        dto.productId,
        dto.warehouseId,
        dto.quantity,
        batchId,
      ),
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
    // ATOMIC + CONCURRENCY SAFE: lock inventory item/batches within transaction
    const deductions = await this.prisma.$transaction(
      async (tx) => {
        return this.deductStockWithTx(
          productId,
          warehouseId,
          quantity,
          referenceType,
          referenceId,
          userId,
          tx,
        );
      },
      {
        maxWait: 10000,
        timeout: 20000,
      },
    );

    // Check for low stock alert (after transaction commits)
    const item = await this.repo.findByProductAndWarehouse(
      productId,
      warehouseId,
    );
    if (item && new Decimal(item.quantityOnHand).lte(item.reorderPoint)) {
      await this.eventBus.publish(
        'LowStockAlert',
        new LowStockAlertEvent(
          productId,
          warehouseId,
          new Decimal(item.quantityOnHand).toNumber(),
          new Decimal(item.reorderPoint).toNumber(),
        ),
      );
    }

    // Publish deduction event (after transaction commits)
    await this.eventBus.publish(
      'StockDeducted',
      new StockDeductedEvent(productId, warehouseId, quantity, referenceId),
    );

    return deductions;
  }

  async adjustStock(
    dto: AdjustStockDto,
    userId: string,
  ): Promise<InventoryItem> {
    const { productId, warehouseId, quantity, reason, notes } = dto;

    const updatedItem = await this.prisma.$transaction(
      async (tx) => {
        let item = await this.repo.findByProductAndWarehouse(
          productId,
          warehouseId,
          tx,
        );
        if (!item) {
          item = await tx.inventoryItem.create({
            data: { productId, warehouseId },
          });
        }

        // Lock inventory item row to prevent concurrent updates
        await (tx as any)
          .$queryRaw`SELECT id FROM inventory_items WHERE id = ${item.id} FOR UPDATE`;

        const newQuantity = new Decimal(item.quantityOnHand).plus(quantity);
        if (newQuantity.lessThan(0)) {
          throw new BadRequestException(
            'Adjustment would result in negative stock',
          );
        }

        // Create adjustment movement
        await this.repo.createMovement(
          {
            type: 'ADJUSTMENT',
            productId,
            warehouseId,
            quantity,
            reason,
            notes,
            createdBy: userId,
          },
          tx,
        );

        return tx.inventoryItem.update({
          where: { id: item.id },
          data: { quantityOnHand: newQuantity.toNumber() },
        });
      },
      { maxWait: 10000, timeout: 20000 },
    );

    await this.eventBus.publish(
      'StockAdjusted',
      new StockAdjustedEvent(productId, warehouseId, quantity, reason),
    );

    return updatedItem;
  }

  async transferStock(dto: TransferStockDto, userId: string): Promise<void> {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = dto;

    // ATOMIC TRANSACTION: Deduct from source + Add to destination
    // If destination update fails, source deduction will rollback
    await this.prisma.$transaction(
      async (tx) => {
        // 1. Deduct from source warehouse using FIFO
        const deductions = await this.deductStockWithTx(
          productId,
          fromWarehouseId,
          quantity,
          'TRANSFER',
          `transfer-${Date.now()}`,
          userId,
          tx,
        );

        // 2. Calculate weighted average cost from deductions
        const totalCost = deductions.reduce(
          (sum, d) => sum.plus(new Decimal(d.totalCost)),
          new Decimal(0),
        );
        const avgCost = totalCost.dividedBy(quantity);

        // 3. Add to destination warehouse
          await this.receiveStockWithTx(
            {
              productId,
              warehouseId: toWarehouseId,
              quantity,
              costPerUnit: avgCost.toNumber(),
            },
            userId,
            tx,
            'TRANSFER',
          );
      },
      { maxWait: 10000, timeout: 20000 },
    );

    // Event Emission - AFTER TRANSACTION COMMITS
    await this.eventBus.publish(
      'StockTransferred',
      new StockTransferredEvent(
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
      ),
    );
  }

  // Private helper for transactional deduction
  // BLOCK 1 FIX: Actually pass tx through to all repository calls
  /**
   * Transaction-aware stock deduction using FIFO strategy.
   * @param tx - Prisma transaction client for atomic operations
   */
  async deductStockWithTx(
    productId: string,
    warehouseId: string,
    quantity: number,
    referenceType: string,
    referenceId: string,
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<DeductionResult[]> {
    // Get batches using tx client for FIFO
    const item = await this.repo.findByProductAndWarehouse(
      productId,
      warehouseId,
      tx,
    );
    if (!item) {
      throw new BadRequestException(
        `No inventory found for product ${productId} in warehouse ${warehouseId}`,
      );
    }

    // Lock inventory item row to prevent concurrent deductions
    await (tx as any)
      .$queryRaw`SELECT id FROM inventory_items WHERE product_id = ${productId} AND warehouse_id = ${warehouseId} FOR UPDATE`;
    // Lock related batches for FIFO consistency
    await (tx as any)
      .$queryRaw`SELECT id FROM inventory_batches WHERE inventory_item_id = ${item.id} AND quantity_remaining > 0 FOR UPDATE`;

    const batches = await this.repo.findBatchesFIFO(item.id, tx);
    let remainingQty = new Decimal(quantity);
    const deductions: DeductionResult[] = [];

    for (const batch of batches) {
      if (remainingQty.lte(0)) break;

      const available = new Decimal(batch.quantityRemaining);
      const toDeduct = Decimal.min(available, remainingQty);

      // Update batch with tx
      await this.repo.updateBatch(
        batch.id,
        {
          quantityRemaining: available.minus(toDeduct).toNumber(),
        },
        tx,
      );

      // Create movement with tx
      await this.repo.createMovement(
        {
          type: 'OUT',
          productId,
          warehouseId,
          batchId: batch.id,
          quantity: toDeduct.negated().toNumber(),
          unitCost: batch.costPerUnit,
          totalValue: toDeduct.times(batch.costPerUnit).toNumber(),
          referenceType,
          referenceId,
          createdBy: userId,
        },
        tx,
      );

      deductions.push({
        batchId: batch.id,
        quantity: toDeduct,
        unitCost: batch.costPerUnit,
        totalCost: toDeduct.times(batch.costPerUnit),
      });

      remainingQty = remainingQty.minus(toDeduct);
    }

    if (remainingQty.gt(0)) {
      throw new BadRequestException(
        `Insufficient stock. Short by ${remainingQty.toNumber()}`,
      );
    }

    // Update inventory item quantity using tx client
    const client = tx || this.prisma;
    await (client as any).inventoryItem.update({
      where: { id: item.id },
      data: {
        quantityOnHand: { decrement: quantity },
      },
    });

    return deductions;
  }

  // Private helper for transactional receive
  // BLOCK 1 FIX: Actually pass tx through to all repository calls
  /**
   * Transaction-aware stock receiving for transfers.
   * @param tx - Prisma transaction client for atomic operations
   */
  private async receiveStockWithTx(
    dto: ReceiveStockDto,
    userId: string,
    tx: Prisma.TransactionClient,
    referenceType: 'PURCHASE' | 'TRANSFER',
  ): Promise<{ item: InventoryItem; batchId: string }> {
    const {
      productId,
      warehouseId,
      quantity,
      costPerUnit,
      batchNumber,
      expiryDate,
    } = dto;
    // Get or create inventory item using tx
    let item = await this.repo.findByProductAndWarehouse(
      productId,
      warehouseId,
      tx,
    );
    if (!item) {
      item = await tx.inventoryItem.create({
        data: { productId, warehouseId },
      });
    }

    // Lock inventory item row to prevent concurrent updates
    await (tx as any)
      .$queryRaw`SELECT id FROM inventory_items WHERE id = ${item.id} FOR UPDATE`;

    // Create batch with tx
    const batch = await this.repo.createBatch(
      {
        inventoryItem: { connect: { id: item!.id } },
        batchNumber,
        receivedDate: new Date(),
        expiryDate,
        quantityReceived: quantity,
        quantityRemaining: quantity,
        costPerUnit: new Decimal(costPerUnit).toNumber(),
      },
      tx,
    );

    // Create movement with tx
    await this.repo.createMovement(
      {
        type: 'IN',
        productId,
        warehouseId,
        batchId: batch.id,
        quantity,
        unitCost: costPerUnit,
        totalValue: new Decimal(costPerUnit).times(quantity).toNumber(),
          referenceType,
          createdBy: userId,
        },
        tx,
      );

    // Update inventory item using tx
    const newQuantity = new Decimal(item!.quantityOnHand).plus(quantity);
    const oldTotal = new Decimal(item!.quantityOnHand).times(
      item!.averageCost || 0,
    );
    const newTotal = oldTotal.plus(new Decimal(costPerUnit).times(quantity));
    const newAvgCost = newQuantity.gt(0)
      ? newTotal.dividedBy(newQuantity)
      : new Decimal(0);

      const updatedItem = await tx.inventoryItem.update({
        where: { id: item!.id },
        data: {
          quantityOnHand: newQuantity.toNumber(),
          averageCost: newAvgCost.toNumber(),
        },
      });

      return { item: updatedItem, batchId: batch.id };
  }

  // ==================== QUERY OPERATIONS ====================

  async getStockLevel(
    productId: string,
    warehouseId: string,
  ): Promise<InventoryItem | null> {
    return this.repo.findByProductAndWarehouse(productId, warehouseId);
  }

  async getAvailableStock(
    productId: string,
    warehouseId: string,
  ): Promise<number> {
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
    // Map DTO to Prisma RecipeCreateInput
    const recipeData: Prisma.RecipeCreateInput = {
      product: { connect: { id: dto.productId } },
      yieldQuantity: dto.yield,
    };
    return this.repo.createRecipe(recipeData);
  }

  async getRecipeByProduct(productId: string): Promise<Recipe | null> {
    return this.repo.findRecipeByProduct(productId);
  }

  async addRecipeIngredient(dto: AddRecipeIngredientDto) {
    // Map DTO to Prisma RecipeIngredientCreateInput
    const ingredientData: Prisma.RecipeIngredientCreateInput = {
      recipe: { connect: { id: dto.recipeId } },
      ingredient: { connect: { id: dto.productId } },
      quantityRequired: dto.quantity,
      unit: dto.unit,
    };
    return this.repo.addRecipeIngredient(ingredientData);
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
    const costPerUnit = totalCost.dividedBy(recipe.yieldQuantity || 1);
    return costPerUnit;
  }
}
