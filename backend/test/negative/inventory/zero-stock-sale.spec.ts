/**
 * INV-02: Selling Zero-Stock Item
 *
 * Tests that items with zero stock cannot be sold
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../../src/modules/inventory/inventory.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';

describe('INV-02: Selling Zero-Stock Item', () => {
  let salesService: SalesService;
  let inventoryService: InventoryService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        SalesRepository,
        InventoryService,
        InventoryRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    inventoryService = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    (salesService as any).sessionsService = {
      getCurrentSession: jest.fn().mockResolvedValue({ id: 'test-session' }),
    };
  });

  beforeEach(async () => {
    await createTestSession(prisma);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should reject sale of item with zero stock', async () => {
    // Setup: Product with 0 stock
    const product = await createTestProduct(prisma);

    // Set stock to 0
    await prisma.inventoryItem.create({
      data: {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantityOnHand: 0,
        reorderPoint: 5,
        averageCost: 25
      }
    });

    // Mock FIFO strategy to return 0 available
    (inventoryService as any).fifoStrategy = {
      getAvailableStock: jest.fn().mockResolvedValue(0),
      deduct: jest.fn().mockResolvedValue([])
    };

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'test-session',
        businessDate: new Date(),
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1
        }
      ]
    };

    // Act & Assert - should reject due to insufficient stock
    await expect(salesService.createOrder(order as any, 'user'))
      .rejects.toThrow();
  });

  it('should reject sale when quantity exceeds available stock', async () => {
    // Setup: Product with 5 stock
    const product = await createTestProduct(prisma);

    // Set stock to 5
    await prisma.inventoryItem.create({
      data: {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantityOnHand: 5,
        reorderPoint: 5,
        averageCost: 25
      }
    });

    // Mock FIFO strategy to return 5 available
    (inventoryService as any).fifoStrategy = {
      getAvailableStock: jest.fn().mockResolvedValue(5),
      deduct: jest.fn().mockResolvedValue([
        { batchId: 'batch-1', quantity: 5 }
      ])
    };

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'test-session',
        businessDate: new Date(),
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 10 // Want 10, but only 5 available
        }
      ]
    };

    // Act & Assert - should reject due to insufficient stock
    await expect(salesService.createOrder(order as any, 'user'))
      .rejects.toThrow();
  });

  it('should allow sale when stock equals requested quantity', async () => {
    // Setup: Product with 5 stock
    const product = await createTestProduct(prisma);

    // Set stock to 5
    await prisma.inventoryItem.create({
      data: {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        quantityOnHand: 5,
        reorderPoint: 5,
        averageCost: 25
      }
    });

    // Mock FIFO strategy to return 5 available
    (inventoryService as any).fifoStrategy = {
      getAvailableStock: jest.fn().mockResolvedValue(5),
      deduct: jest.fn().mockResolvedValue([
        { batchId: 'batch-1', quantity: 5 }
      ])
    };

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'test-session',
        businessDate: new Date(),
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 5 // Exactly 5 available
        }
      ]
    };

    // Act & Assert - should succeed
    const result = await salesService.createOrder(order as any, 'user');
    expect(result).toBeDefined();
  });

  it('should check stock before deducting', async () => {
    // Setup: Product with 0 stock
    await createTestProduct(prisma);

    (inventoryService as any).fifoStrategy = {
      getAvailableStock: jest.fn().mockResolvedValue(0),
      deduct: jest.fn().mockResolvedValue([])
    };

    // Verify stock check is called before deduction
    const fifoStrategy = (inventoryService as any).fifoStrategy;

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'test-session',
        businessDate: new Date(),
      items: [
        {
          productId: 'prod-1',
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1
        }
      ]
    };

    try {
      await salesService.createOrder(order as any, 'user');
    } catch (e) {
      // Expected to fail
    }

    // Verify getAvailableStock was called
    expect(fifoStrategy.getAvailableStock).toHaveBeenCalled();
    // Verify deduct was NOT called (no stock to deduct)
    expect(fifoStrategy.deduct).not.toHaveBeenCalled();
  });
});
