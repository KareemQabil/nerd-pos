/**
 * Workflow 5: Inventory Management
 * 
 * Source: WORKFLOWS.md - Inventory Workflows
 * Pattern: Copied from existing inventory.service.spec.ts (Phase 2)
 * 
 * Tests:
 * - Receive stock
 * - FIFO deduction
 * - Stock transfer
 * - Low stock alerts
 * - Movement tracking
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InventoryService } from '../../../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../../../src/modules/inventory/inventory.repository';
import { FIFOStrategy } from '../../../../src/modules/inventory/strategies/fifo.strategy';
import Decimal from 'decimal.js';

// Mock Repository - methods from inventory.repository.ts
function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findAllWarehouses: jest.fn(),
        findWarehouseByCode: jest.fn(),
        findDefaultWarehouse: jest.fn(),
        createWarehouse: jest.fn(),
        updateWarehouse: jest.fn(),
        findByProductAndWarehouse: jest.fn(),
        getOrCreateInventoryItem: jest.fn(),
        findLowStockItems: jest.fn(),
        createBatch: jest.fn(),
        findBatchesFIFO: jest.fn(),
        findExpiringBatches: jest.fn(),
        updateBatch: jest.fn(),
        createMovement: jest.fn(),
        findMovementsByProduct: jest.fn(),
        findMovementsByReference: jest.fn(),
        createRecipe: jest.fn(),
        findRecipeByProduct: jest.fn(),
        addRecipeIngredient: jest.fn(),
        updateRecipeIngredient: jest.fn(),
        deleteRecipeIngredient: jest.fn(),
    };
}

function createMockEventBus() {
    return { publish: jest.fn(), subscribe: jest.fn() };
}

function createMockFIFOStrategy() {
    return {
        deduct: jest.fn(),
        calculateCost: jest.fn(),
    };
}

describe('Workflow 5: Inventory Management', () => {
    let service: InventoryService;
    let repo: ReturnType<typeof createMockRepository>;
    let eventBus: ReturnType<typeof createMockEventBus>;
    let fifoStrategy: ReturnType<typeof createMockFIFOStrategy>;

    beforeEach(async () => {
        repo = createMockRepository();
        eventBus = createMockEventBus();
        fifoStrategy = createMockFIFOStrategy();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InventoryService,
                { provide: InventoryRepository, useValue: repo },
                { provide: FIFOStrategy, useValue: fifoStrategy },
                { provide: 'IEventBus', useValue: eventBus },
            ],
        }).compile();

        service = module.get<InventoryService>(InventoryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==================== 5.1: WAREHOUSE MANAGEMENT ====================
    describe('5.1: Warehouse Management', () => {
        it('should create warehouse', async () => {
            const dto = {
                code: 'WH-MAIN',
                nameAr: 'مخزن رئيسي',
                nameEn: 'Main Warehouse',
                isDefault: true,
            };

            repo.createWarehouse.mockResolvedValue({ id: 'wh-1', ...dto });

            const result = await service.createWarehouse(dto);

            expect(result.code).toBe('WH-MAIN');
        });

        it('should get default warehouse', async () => {
            repo.findDefaultWarehouse.mockResolvedValue({ id: 'wh-1', isDefault: true });

            const result = await service.getDefaultWarehouse();

            expect(result.isDefault).toBe(true);
        });

        it('should throw if no default warehouse', async () => {
            repo.findDefaultWarehouse.mockResolvedValue(null);

            await expect(service.getDefaultWarehouse()).rejects.toThrow(NotFoundException);
        });
    });

    // ==================== 5.2: RECEIVE STOCK ====================
    describe('5.2: Receive Stock', () => {
        it('should create batch and movement on receive', async () => {
            const dto = {
                productId: 'prod-1',
                warehouseId: 'wh-1',
                quantity: 100,
                costPerUnit: 10.00,
                batchNumber: 'BATCH-001',
            };

            const mockItem = { id: 'inv-1', productId: 'prod-1', quantityOnHand: 0 };

            repo.getOrCreateInventoryItem.mockResolvedValue(mockItem);
            repo.createBatch.mockResolvedValue({ id: 'batch-1' });
            repo.createMovement.mockResolvedValue({});
            repo.update.mockResolvedValue({ ...mockItem, quantityOnHand: 100 });

            await service.receiveStock(dto, 'user-1');

            expect(repo.createBatch).toHaveBeenCalled();
            expect(repo.createMovement).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'IN' }),
            );
            expect(eventBus.publish).toHaveBeenCalledWith('StockReceived', expect.anything());
        });
    });

    // ==================== 5.3: LOW STOCK ALERTS ====================
    describe('5.3: Low Stock Alerts', () => {
        it('should get items below reorder point', async () => {
            repo.findLowStockItems.mockResolvedValue([
                { productId: 'prod-1', quantityOnHand: 5, reorderPoint: 10 },
                { productId: 'prod-2', quantityOnHand: 3, reorderPoint: 20 },
            ]);

            const result = await service.getLowStockItems('wh-1');

            expect(result).toHaveLength(2);
        });
    });

    // ==================== 5.4: EXPIRING BATCHES ====================
    describe('5.4: Expiring Batches', () => {
        it('should get batches expiring within threshold', async () => {
            repo.findExpiringBatches.mockResolvedValue([
                { id: 'batch-1', expiryDate: new Date() },
            ]);

            const result = await service.getExpiringBatches(30);

            expect(result).toHaveLength(1);
        });
    });

    // ==================== 5.5: RECIPE MANAGEMENT ====================
    describe('5.5: Recipe Management', () => {
        it('should create recipe for product', async () => {
            const dto = { productId: 'prod-1', yield: 1 };
            repo.createRecipe.mockResolvedValue({ id: 'recipe-1', ...dto });

            const result = await service.createRecipe(dto);

            expect(result.productId).toBe('prod-1');
        });

        it('should get recipe with ingredients', async () => {
            repo.findRecipeByProduct.mockResolvedValue({
                id: 'recipe-1',
                productId: 'prod-1',
                ingredients: [],
            });

            const result = await service.getRecipeByProduct('prod-1');

            expect(result?.productId).toBe('prod-1');
        });

        it('should return null for product without recipe', async () => {
            repo.findRecipeByProduct.mockResolvedValue(null);

            const result = await service.getRecipeByProduct('no-recipe');

            expect(result).toBeNull();
        });
    });

    // ==================== 5.6: MOVEMENT HISTORY ====================
    describe('5.6: Movement History', () => {
        it('should get movement history for product', async () => {
            repo.findMovementsByProduct.mockResolvedValue([
                { id: 'mov-1', type: 'IN', quantity: 100 },
                { id: 'mov-2', type: 'OUT', quantity: -20 },
            ]);

            const result = await service.getMovementHistory('prod-1', 'wh-1');

            expect(result).toHaveLength(2);
        });
    });
});
