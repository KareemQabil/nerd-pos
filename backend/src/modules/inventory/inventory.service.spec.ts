/**
 * InventoryService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 *
 * Applied Error Fixing Workflow:
 * - Verified actual service methods
 * - Verified repository method names from inventory.repository.ts
 * - Verified DTO fields from dto/index.ts
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryRepository } from './inventory.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { FIFOStrategy } from './strategies/fifo.strategy';
import Decimal from 'decimal.js';

// Mock Repository - methods from inventory.repository.ts
function createMockRepository() {
  return {
    // BaseRepository methods
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    // Warehouse methods
    findAllWarehouses: jest.fn(),
    findWarehouseByCode: jest.fn(),
    findDefaultWarehouse: jest.fn(),
    createWarehouse: jest.fn(),
    updateWarehouse: jest.fn(),
    // Inventory Item methods
    findByProductAndWarehouse: jest.fn(),
    getOrCreateInventoryItem: jest.fn(),
    findLowStockItems: jest.fn(),
    // Batch (FIFO) methods
    createBatch: jest.fn(),
    findBatchesFIFO: jest.fn(),
    findExpiringBatches: jest.fn(),
    updateBatch: jest.fn(),
    // Movement methods
    createMovement: jest.fn(),
    findMovementsByProduct: jest.fn(),
    findMovementsByReference: jest.fn(),
    // Recipe methods
    createRecipe: jest.fn(),
    findRecipeByProduct: jest.fn(),
    addRecipeIngredient: jest.fn(),
    updateRecipeIngredient: jest.fn(),
    deleteRecipeIngredient: jest.fn(),
  };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
}

// Mock FIFO Strategy
function createMockFIFOStrategy() {
  return {
    deduct: jest.fn(),
    calculateCost: jest.fn(),
  };
}

// Mock PrismaService with $transaction support
function createMockPrismaService() {
  const mockPrisma: any = {
    $queryRaw: jest.fn().mockResolvedValue(undefined),
    inventoryItem: {
      update: jest.fn(),
      create: jest.fn(),
    },
    inventoryBatch: {
      update: jest.fn(),
      create: jest.fn(),
    },
    inventoryMovement: {
      create: jest.fn(),
    },
  };
  mockPrisma.$transaction = jest.fn((callback: (tx: any) => Promise<any>) =>
    callback(mockPrisma),
  );
  return mockPrisma;
}

describe('InventoryService', () => {
  let service: InventoryService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let fifoStrategy: ReturnType<typeof createMockFIFOStrategy>;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();
    fifoStrategy = createMockFIFOStrategy();
    prisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
        { provide: FIFOStrategy, useValue: fifoStrategy },
        { provide: 'IEventBus', useValue: eventBus },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== WAREHOUSE TESTS ====================

  describe('createWarehouse', () => {
    it('should create warehouse', async () => {
      const dto = {
        code: 'WH-MAIN',
        nameAr: 'مخزن رئيسي',
        nameEn: 'Main Warehouse',
        isDefault: true,
      };

      const mockWarehouse = { id: 'wh-1', ...dto };
      repo.createWarehouse.mockResolvedValue(mockWarehouse);

      const result = await service.createWarehouse(dto);

      expect(result.nameEn).toBe('Main Warehouse');
      expect(repo.createWarehouse).toHaveBeenCalledWith(dto);
    });
  });

  describe('getDefaultWarehouse', () => {
    it('should return default warehouse', async () => {
      // UUID must match v1-v5 pattern (3rd octet must start with 1-5)
      const mockWarehouse = { id: 'a1b2c3d4-e5f6-4890-abcd-ef1234567890', isDefault: true };
      repo.findDefaultWarehouse.mockResolvedValue(mockWarehouse);
      repo.findAllWarehouses.mockResolvedValue([mockWarehouse]);

      const result = await service.getDefaultWarehouse();

      expect(result.isDefault).toBe(true);
    });

    it('should throw NotFoundException if no default warehouse', async () => {
      repo.findDefaultWarehouse.mockResolvedValue(null);
      repo.findAllWarehouses.mockResolvedValue([]); // Fix: Return empty array, not undefined

      await expect(service.getDefaultWarehouse()).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== RECEIVE STOCK TESTS ====================

  describe('receiveStock', () => {
    it('should receive stock and create batch + movement', async () => {
      // DTO fields from dto/index.ts
      const dto = {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantity: 100,
        costPerUnit: 10.0,
        batchNumber: 'BATCH-001',
      };

      const mockItem = {
        id: 'inv-1',
        productId: dto.productId,
        quantityOnHand: 0,
        averageCost: 0,
      };

      const mockBatch = { id: 'batch-1' };
      const updatedItem = {
        ...mockItem,
        quantityOnHand: 100,
      };

      repo.getOrCreateInventoryItem.mockResolvedValue(mockItem);
      repo.findByProductAndWarehouse.mockResolvedValue(mockItem);
      repo.createBatch.mockResolvedValue(mockBatch);
      repo.createMovement.mockResolvedValue({});
      repo.update.mockResolvedValue(updatedItem);
      prisma.inventoryItem.update.mockResolvedValue(updatedItem);

      const result = await service.receiveStock(dto, 'user-1');

      expect(repo.findByProductAndWarehouse).toHaveBeenCalledWith(
        'prod-1',
        'wh-1',
        expect.anything(),
      );
      expect(repo.createBatch).toHaveBeenCalled();
      expect(repo.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'IN' }),
        expect.anything(),
      );
      expect(eventBus.publish).toHaveBeenCalledWith(
        'StockReceived',
        expect.anything(),
      );
    });
  });

  // ==================== STOCK QUERY TESTS ====================

  describe('getLowStockItems', () => {
    it('should return items below minimum threshold', async () => {
      const lowStockItems = [
        { productId: 'prod-1', quantityOnHand: 5, reorderPoint: 10 },
        { productId: 'prod-2', quantityOnHand: 3, reorderPoint: 20 },
      ];

      repo.findLowStockItems.mockResolvedValue(lowStockItems);

      const result = await service.getLowStockItems('wh-1');

      expect(result).toHaveLength(2);
      expect(repo.findLowStockItems).toHaveBeenCalledWith('wh-1');
    });
  });

  describe('getExpiringBatches', () => {
    it('should return batches expiring within days threshold', async () => {
      const expiringBatches = [{ id: 'batch-1', expiryDate: new Date() }];

      repo.findExpiringBatches.mockResolvedValue(expiringBatches);

      const result = await service.getExpiringBatches(30);

      expect(result).toHaveLength(1);
      expect(repo.findExpiringBatches).toHaveBeenCalledWith(30);
    });
  });

  // ==================== RECIPE TESTS ====================

  describe('createRecipe', () => {
    it('should create recipe for product', async () => {
      const dto = {
        productId: 'prod-1',
        yield: 1,
      };

      const mockRecipe = { id: 'recipe-1', ...dto };
      repo.createRecipe.mockResolvedValue(mockRecipe);

      const result = await service.createRecipe(dto);

      expect(result.productId).toBe('prod-1');
      expect(repo.createRecipe).toHaveBeenCalled();
    });
  });

  describe('getRecipeByProduct', () => {
    it('should return recipe with ingredients', async () => {
      const mockRecipe = {
        id: 'recipe-1',
        productId: 'prod-1',
        ingredients: [],
      };

      repo.findRecipeByProduct.mockResolvedValue(mockRecipe);

      const result = await service.getRecipeByProduct('prod-1');

      expect(result?.productId).toBe('prod-1');
    });

    it('should return null for product without recipe', async () => {
      repo.findRecipeByProduct.mockResolvedValue(null);

      const result = await service.getRecipeByProduct('no-recipe');

      expect(result).toBeNull();
    });
  });
});
