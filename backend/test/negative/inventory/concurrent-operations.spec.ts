/**
 * MT-05: Transfer Same Stock Twice
 *
 * Tests that concurrent warehouse transfers don't oversell
 */

import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../../src/modules/inventory/inventory.repository';
import { FIFOStrategy } from '../../../src/modules/inventory/strategies/fifo.strategy';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { RaceConditionTester } from '../../helpers/race-condition';
import { cleanupTestData, createTestProduct } from '../../helpers/test-helpers';

describe('MT-05: Transfer Same Stock Twice', () => {
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let warehouseAId: string;
  let warehouseBId: string;
  let productId: string;
  let inventoryItemId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        InventoryRepository,
        {
          provide: FIFOStrategy,
          useValue: {
            getAvailableStock: jest.fn(),
            deduct: jest.fn(),
            getCOGS: jest.fn(),
          },
        },
        PrismaService,
        {
          provide: 'IEventBus',
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();

    inventoryService = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    (inventoryService as any).fifoStrategy = {
      getAvailableStock: jest.fn().mockResolvedValue(10),
      deduct: jest
        .fn()
        .mockResolvedValue([{ batchId: 'batch-1', quantity: 10 }]),
    };
  });

  beforeEach(async () => {
    const codeSuffix = Date.now();
    const warehouseA = await prisma.warehouse.create({
      data: {
        nameEn: 'Warehouse A',
        nameAr: 'Warehouse A AR',
        code: `WH-A-${codeSuffix}`,
        isActive: true,
      },
    });
    warehouseAId = warehouseA.id;

    const warehouseB = await prisma.warehouse.create({
      data: {
        nameEn: 'Warehouse B',
        nameAr: 'Warehouse B AR',
        code: `WH-B-${codeSuffix}`,
        isActive: true,
      },
    });
    warehouseBId = warehouseB.id;

    const product = await createTestProduct(prisma, {
      nameEn: 'Test Product',
      nameAr: 'Test Product AR',
      sku: `TEST-${Date.now()}`,
      price: 50,
      isActive: true,
    });
    productId = product.id;

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        productId,
        warehouseId: warehouseAId,
        quantityOnHand: 10,
        reorderPoint: 5,
        averageCost: 25,
      },
    });
    inventoryItemId = inventoryItem.id;

    await prisma.inventoryBatch.create({
      data: {
        inventoryItemId,
        receivedDate: new Date(),
        quantityReceived: 10,
        quantityRemaining: 10,
        costPerUnit: 25,
      },
    });
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should prevent overselling during concurrent transfers', async () => {
    const transferA = () =>
      inventoryService
        .transferStock(
          {
            productId,
            fromWarehouseId: warehouseAId,
            toWarehouseId: warehouseBId,
            quantity: 10,
          },
          'user-1',
        )
        .then(() => ({ ok: true }));

    const transferB = () =>
      inventoryService
        .transferStock(
          {
            productId,
            fromWarehouseId: warehouseAId,
            toWarehouseId: warehouseBId,
            quantity: 10,
          },
          'user-2',
        )
        .then(() => ({ ok: true }));

    const { terminalAResult, terminalBResult, bothSucceeded } =
      await RaceConditionTester.simulateDualTerminalRequest(
        transferA,
        transferB,
      );

    const successCount = [terminalAResult, terminalBResult].filter(
      (r) => !('error' in (r as any)),
    ).length;
    expect(successCount).toBe(1);
    expect(bothSucceeded).toBe(false);

    const stockA = await prisma.inventoryItem.findFirst({
      where: { productId, warehouseId: warehouseAId },
    });
    expect(stockA?.quantityOnHand?.toString()).toBe('0');
  });

  it('should reject transfer from empty warehouse', async () => {
    const warehouseC = await prisma.warehouse.create({
      data: {
        nameEn: 'Warehouse C',
        nameAr: 'Warehouse C AR',
        code: `WH-C-${Date.now()}`,
        isActive: true,
      },
    });

    const result = await inventoryService
      .transferStock(
        {
          productId,
          fromWarehouseId: warehouseC.id,
          toWarehouseId: warehouseBId,
          quantity: 10,
        },
        'user-1',
      )
      .then(() => ({ ok: true }))
      .catch((e) => ({ error: e }));

    expect('error' in result).toBe(true);
  });
});
