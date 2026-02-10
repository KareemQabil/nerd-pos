// Inventory Repository
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
// Sprint 4: Added optional transaction client support for ACID compliance
//
// Type-safe repository using Prisma's generated types.
// No more `(this.prisma as any)` type casting!

import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  InventoryItem,
  Warehouse,
  InventoryBatch,
  InventoryMovement,
  Recipe,
  RecipeIngredient,
} from './entities/inventory.entity';
import { CreateMovementDto } from './dto';

/**
 * Helper to get typed Prisma client
 * Provides direct access to all Prisma models with proper types
 */
function getTypedPrisma(prisma: PrismaService): PrismaClient {
  return prisma as PrismaClient;
}

/**
 * Type alias for transaction client
 * Using Prisma's generated types for type safety
 */
type TxClient = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

@Injectable()
export class InventoryRepository extends BaseRepository<
  InventoryItem,
  'inventoryItem'
> {
  private readonly prismaClient: PrismaClient;

  constructor(prisma: PrismaService) {
    super(prisma);
    this.prismaClient = getTypedPrisma(prisma);
  }

  protected get model(): 'inventoryItem' {
    return 'inventoryItem';
  }

  // ==================== WAREHOUSE ====================

  async findAllWarehouses(): Promise<Warehouse[]> {
    return this.prismaClient.warehouse.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async findWarehouseByCode(code: string): Promise<Warehouse | null> {
    return this.prismaClient.warehouse.findUnique({
      where: { code },
    });
  }

  async findDefaultWarehouse(): Promise<Warehouse | null> {
    return this.prismaClient.warehouse.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }

  async createWarehouse(data: Prisma.WarehouseCreateInput): Promise<Warehouse> {
    return this.prismaClient.warehouse.create({ data });
  }

  async updateWarehouse(
    id: string,
    data: Prisma.WarehouseUpdateInput,
  ): Promise<Warehouse> {
    return this.prismaClient.warehouse.update({
      where: { id },
      data,
    });
  }

  // ==================== INVENTORY ITEM ====================

  async findByProductAndWarehouse(
    productId: string,
    warehouseId: string,
    tx?: TxClient,
  ): Promise<InventoryItem | null> {
    const client = tx || this.prismaClient;
    return client.inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });
  }

  async getOrCreateInventoryItem(
    productId: string,
    warehouseId: string,
  ): Promise<InventoryItem> {
    const item = await this.findByProductAndWarehouse(productId, warehouseId);
    if (item) {
      return item;
    }
    return this.prismaClient.inventoryItem.create({
      data: { productId, warehouseId },
    });
  }

  async findLowStockItems(warehouseId?: string): Promise<InventoryItem[]> {
    return this.prismaClient.inventoryItem.findMany({
      where: {
        ...(warehouseId && { warehouseId }),
      },
    });
  }

  // ==================== BATCH (FIFO) ====================

  async createBatch(
    data: Prisma.InventoryBatchCreateInput,
    tx?: TxClient,
  ): Promise<InventoryBatch> {
    const client = tx || this.prismaClient;
    return client.inventoryBatch.create({ data });
  }

  async findBatchesFIFO(
    inventoryItemId: string,
    tx?: TxClient,
  ): Promise<InventoryBatch[]> {
    const client = tx || this.prismaClient;
    return client.inventoryBatch.findMany({
      where: { inventoryItemId, quantityRemaining: { gt: 0 } },
      orderBy: { receivedDate: 'asc' }, // FIFO: oldest first
    });
  }

  async findExpiringBatches(
    daysUntilExpiry: number,
  ): Promise<InventoryBatch[]> {
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

    return this.prismaClient.inventoryBatch.findMany({
      where: {
        quantityRemaining: { gt: 0 },
        expiryDate: { lte: expiryThreshold },
      },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async updateBatch(
    id: string,
    data: Prisma.InventoryBatchUpdateInput,
    tx?: TxClient,
  ): Promise<InventoryBatch> {
    const client = tx || this.prismaClient;
    return client.inventoryBatch.update({
      where: { id },
      data,
    });
  }

  // ==================== MOVEMENT ====================

  async createMovement(
    data: Prisma.InventoryMovementCreateInput,
    tx?: TxClient,
  ): Promise<InventoryMovement> {
    const client = tx || this.prismaClient;
    return client.inventoryMovement.create({ data });
  }

  async findMovementsByProduct(
    productId: string,
    warehouseId?: string,
  ): Promise<InventoryMovement[]> {
    return this.prismaClient.inventoryMovement.findMany({
      where: {
        productId,
        ...(warehouseId && { warehouseId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findMovementsByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<InventoryMovement[]> {
    return this.prismaClient.inventoryMovement.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== RECIPE ====================

  async createRecipe(data: Prisma.RecipeCreateInput): Promise<Recipe> {
    return this.prismaClient.recipe.create({ data });
  }

  async findRecipeByProduct(productId: string): Promise<Recipe | null> {
    return this.prismaClient.recipe.findUnique({
      where: { productId },
      include: { ingredients: true },
    });
  }

  async addRecipeIngredient(
    data: Prisma.RecipeIngredientCreateInput,
  ): Promise<RecipeIngredient> {
    return this.prismaClient.recipeIngredient.create({ data });
  }

  async updateRecipeIngredient(
    id: string,
    data: Prisma.RecipeIngredientUpdateInput,
  ): Promise<RecipeIngredient> {
    return this.prismaClient.recipeIngredient.update({
      where: { id },
      data,
    });
  }

  async deleteRecipeIngredient(id: string): Promise<void> {
    await this.prismaClient.recipeIngredient.delete({ where: { id } });
  }
}
