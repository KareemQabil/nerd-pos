/**
 * MT-05: Transfer Same Stock Twice
 *
 * Tests that concurrent warehouse transfers don't oversell
 */

import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../../src/modules/inventory/inventory.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { RaceConditionTester } from '../../helpers/race-condition';
import { cleanupTestData } from '../../helpers/test-helpers';

describe('MT-05: Transfer Same Stock Twice', () => {
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let warehouseAId: string;
  let warehouseBId: string;
  let productId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        InventoryRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    inventoryService = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock FIFO strategy
    (inventoryService as any).fifoStrategy = {
      getAvailableStock: jest.fn().mockResolvedValue(10),
      deduct: jest.fn().mockResolvedValue([
        { batchId: 'batch-1', quantity: 10 }
      ])
    };
  });

  beforeEach(async () => {
    // Setup: Two warehouses
    const warehouseA = await prisma.warehouse.create({
      data: { name: 'Warehouse A', code: 'WH-A', isActive: true }
    });
    warehouseAId = warehouseA.id;

    const warehouseB = await prisma.warehouse.create({
      data: { name: 'Warehouse B', code: 'WH-B', isActive: true }
    });
    warehouseBId = warehouseB.id;

    // Setup: Product with stock in Warehouse A
    const product = await prisma.product.create({
      data: { name: 'Test Product', nameAr: 'منتج', sku: 'TEST-1', price: 50, isActive: true }
    });
    productId = product.id;

    // Setup: Stock in Warehouse A = 10
    await prisma.inventoryItem.create({
      data: {
        productId,
        warehouseId: warehouseAId,
        quantityOnHand: 10,
        reorderPoint: 5,
        averageCost: 25
      }
    });
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should prevent overselling during concurrent transfers', async () => {
    // Act: Two terminals try to transfer same stock
    const transferA = inventoryService.transferStock(
      { productId, fromWarehouseId: warehouseAId, toWarehouseId: warehouseBId, quantity: 10 },
      'user-1'
    );

    const transferB = inventoryService.transferStock(
      { productId, fromWarehouseId: warehouseAId, toWarehouseId: warehouseBId, quantity: 10 },
      'user-2'
    );

    // Simulate concurrent requests
    const { terminalAResult, terminalBResult, bothSucceeded } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () => transferA.catch(e => ({ error: e })),
        () => transferB.catch(e => ({ error: e }))
      );

    // Assert: Only one should succeed
    const successCount = [terminalAResult, terminalBResult].filter(r => !('error' in r)).length;
    expect(successCount).toBe(1);
    expect(bothSucceeded).toBe(false);

    // Verify: Warehouse A stock = 0, Warehouse B stock = 10
    const stockA = await prisma.inventoryItem.findFirst({
      where: { productId, warehouseId: warehouseAId }
    });
    expect(stockA?.quantityOnHand?.toString()).toBe('0');
  });

  it('should reject transfer from empty warehouse', async () => {
    // Setup: Warehouse C with 0 stock
    const warehouseC = await prisma.warehouse.create({
      data: { name: 'Warehouse C', code: 'WH-C', isActive: true }
    });

    // Try to transfer 10 units from empty warehouse
    const result = await inventoryService.transferStock(
      { productId, fromWarehouseId: warehouseC.id, toWarehouseId: warehouseBId, quantity: 10 },
      'user-1'
    ).catch(e => ({ error: e }));

    // Should fail
    expect('error' in result).toBe(true);
  });
});
