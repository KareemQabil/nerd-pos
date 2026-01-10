// Inventory Repository
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md

import { Injectable } from '@nestjs/common';
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

@Injectable()
export class InventoryRepository extends BaseRepository<InventoryItem> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'inventoryItem';
    }

    // ==================== WAREHOUSE ====================

    async findAllWarehouses(): Promise<Warehouse[]> {
        return (this.prisma as any).warehouse.findMany({
            where: { isActive: true },
            orderBy: { code: 'asc' },
        });
    }

    async findWarehouseByCode(code: string): Promise<Warehouse | null> {
        return (this.prisma as any).warehouse.findUnique({
            where: { code },
        });
    }

    async findDefaultWarehouse(): Promise<Warehouse | null> {
        return (this.prisma as any).warehouse.findFirst({
            where: { isDefault: true, isActive: true },
        });
    }

    async createWarehouse(data: Partial<Warehouse>): Promise<Warehouse> {
        return (this.prisma as any).warehouse.create({ data });
    }

    async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
        return (this.prisma as any).warehouse.update({
            where: { id },
            data,
        });
    }

    // ==================== INVENTORY ITEM ====================

    async findByProductAndWarehouse(productId: string, warehouseId: string): Promise<InventoryItem | null> {
        return (this.prisma as any).inventoryItem.findUnique({
            where: { productId_warehouseId: { productId, warehouseId } },
        });
    }

    async getOrCreateInventoryItem(productId: string, warehouseId: string): Promise<InventoryItem> {
        const item = await this.findByProductAndWarehouse(productId, warehouseId);
        if (item) {
            return item;
        }
        return (this.prisma as any).inventoryItem.create({
            data: { productId, warehouseId },
        });
    }

    async findLowStockItems(warehouseId?: string): Promise<InventoryItem[]> {
        return (this.prisma as any).inventoryItem.findMany({
            where: {
                ...(warehouseId && { warehouseId }),
                quantityOnHand: { lte: (this.prisma as any).raw('reorder_point') },
            },
        });
    }

    // ==================== BATCH (FIFO) ====================

    async createBatch(data: Partial<InventoryBatch>): Promise<InventoryBatch> {
        return (this.prisma as any).inventoryBatch.create({ data });
    }

    async findBatchesFIFO(inventoryItemId: string): Promise<InventoryBatch[]> {
        return (this.prisma as any).inventoryBatch.findMany({
            where: { inventoryItemId, quantityRemaining: { gt: 0 } },
            orderBy: { receivedDate: 'asc' }, // FIFO: oldest first
        });
    }

    async findExpiringBatches(daysUntilExpiry: number): Promise<InventoryBatch[]> {
        const expiryThreshold = new Date();
        expiryThreshold.setDate(expiryThreshold.getDate() + daysUntilExpiry);

        return (this.prisma as any).inventoryBatch.findMany({
            where: {
                quantityRemaining: { gt: 0 },
                expiryDate: { lte: expiryThreshold },
            },
            orderBy: { expiryDate: 'asc' },
        });
    }

    async updateBatch(id: string, data: Partial<InventoryBatch>): Promise<InventoryBatch> {
        return (this.prisma as any).inventoryBatch.update({
            where: { id },
            data,
        });
    }

    // ==================== MOVEMENT ====================

    async createMovement(data: CreateMovementDto): Promise<InventoryMovement> {
        return (this.prisma as any).inventoryMovement.create({ data });
    }

    async findMovementsByProduct(productId: string, warehouseId?: string): Promise<InventoryMovement[]> {
        return (this.prisma as any).inventoryMovement.findMany({
            where: {
                productId,
                ...(warehouseId && { warehouseId }),
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
    }

    async findMovementsByReference(referenceType: string, referenceId: string): Promise<InventoryMovement[]> {
        return (this.prisma as any).inventoryMovement.findMany({
            where: { referenceType, referenceId },
            orderBy: { createdAt: 'desc' },
        });
    }

    // ==================== RECIPE ====================

    async createRecipe(data: Partial<Recipe>): Promise<Recipe> {
        return (this.prisma as any).recipe.create({ data });
    }

    async findRecipeByProduct(productId: string): Promise<Recipe | null> {
        return (this.prisma as any).recipe.findUnique({
            where: { productId },
            include: { ingredients: true },
        });
    }

    async addRecipeIngredient(data: Partial<RecipeIngredient>): Promise<RecipeIngredient> {
        return (this.prisma as any).recipeIngredient.create({ data });
    }

    async updateRecipeIngredient(id: string, data: Partial<RecipeIngredient>): Promise<RecipeIngredient> {
        return (this.prisma as any).recipeIngredient.update({
            where: { id },
            data,
        });
    }

    async deleteRecipeIngredient(id: string): Promise<void> {
        await (this.prisma as any).recipeIngredient.delete({ where: { id } });
    }
}
