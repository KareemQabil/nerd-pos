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

describe('MT-05: Transfer Same Stock Twice', () => {
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let warehouseAId: string;
  let warehouseBId: string;
  let productId: string;
  let inventoryItemId: string;
  const warehouses = new Map<string, any>();
  const items = new Map<string, any>();
  const batches = new Map<string, any>();
  const movements: any[] = [];
  let txQueue: Promise<unknown> = Promise.resolve();

  beforeAll(async () => {
    const prismaMock: any = {
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
      warehouse: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `wh-${warehouses.size + 1}`;
          const warehouse = { id, ...data };
          warehouses.set(id, warehouse);
          return warehouse;
        }),
      },
      inventoryItem: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `item-${items.size + 1}`;
          const item = {
            id,
            quantityOnHand: data.quantityOnHand ?? 0,
            averageCost: data.averageCost ?? 0,
            ...data,
          };
          items.set(id, item);
          return item;
        }),
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = items.get(where.id);
          if (!existing) return null;
          let quantityOnHand = existing.quantityOnHand;
          if (typeof data.quantityOnHand === 'object' && data.quantityOnHand?.decrement !== undefined) {
            quantityOnHand = Number(quantityOnHand) - Number(data.quantityOnHand.decrement);
          } else if (data.quantityOnHand !== undefined) {
            quantityOnHand = data.quantityOnHand;
          }
          const updated = { ...existing, ...data, quantityOnHand };
          items.set(where.id, updated);
          return updated;
        }),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return items.get(where.id) ?? null;
        }),
        findFirst: jest.fn(async ({ where }: { where: any }) => {
          for (const item of items.values()) {
            if (
              (where?.productId === undefined || item.productId === where.productId) &&
              (where?.warehouseId === undefined || item.warehouseId === where.warehouseId)
            ) {
              return item;
            }
          }
          return null;
        }),
      },
      inventoryBatch: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `batch-${batches.size + 1}`;
          const inventoryItemId =
            data.inventoryItemId ?? data.inventoryItem?.connect?.id;
          const batch = { id, ...data, inventoryItemId };
          batches.set(id, batch);
          return batch;
        }),
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = batches.get(where.id);
          if (!existing) return null;
          const updated = { ...existing, ...data };
          batches.set(where.id, updated);
          return updated;
        }),
        findMany: jest.fn(async ({ where }: { where: any }) => {
          return Array.from(batches.values()).filter((batch) => {
            if (where?.inventoryItemId && batch.inventoryItemId !== where.inventoryItemId) {
              return false;
            }
            if (where?.quantityRemaining?.gt !== undefined) {
              return Number(batch.quantityRemaining) > Number(where.quantityRemaining.gt);
            }
            return true;
          });
        }),
      },
      inventoryMovement: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const record = { id: `mov-${movements.length + 1}`, ...data };
          movements.push(record);
          return record;
        }),
      },
    };

    prismaMock.$transaction = jest.fn(async (fn: (tx: any) => Promise<any>) => {
      const run = txQueue.then(() => fn(prismaMock));
      txQueue = run.catch(() => undefined);
      return run;
    });

    const repoMock = {
      findByProductAndWarehouse: jest.fn(async (productId: string, warehouseId: string) => {
        for (const item of items.values()) {
          if (item.productId === productId && item.warehouseId === warehouseId) {
            return item;
          }
        }
        return null;
      }),
      findBatchesFIFO: jest.fn(async (inventoryItemId: string) => {
        return Array.from(batches.values())
          .filter((batch) => batch.inventoryItemId === inventoryItemId && Number(batch.quantityRemaining) > 0)
          .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime());
      }),
      updateBatch: jest.fn(async (id: string, data: any) => {
        const existing = batches.get(id);
        if (!existing) return null;
        const updated = { ...existing, ...data };
        batches.set(id, updated);
        return updated;
      }),
      createMovement: jest.fn(async (data: any) => {
        const record = { id: `mov-${movements.length + 1}`, ...data };
        movements.push(record);
        return record;
      }),
      createBatch: jest.fn(async (data: any) => {
        const id = `batch-${batches.size + 1}`;
        const inventoryItemId =
          data.inventoryItemId ?? data.inventoryItem?.connect?.id;
        const batch = { id, ...data, inventoryItemId };
        batches.set(id, batch);
        return batch;
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: InventoryRepository, useValue: repoMock },
        {
          provide: FIFOStrategy,
          useValue: {
            getAvailableStock: jest.fn(),
            deduct: jest.fn(),
            getCOGS: jest.fn(),
          },
        },
        { provide: PrismaService, useValue: prismaMock },
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
    txQueue = Promise.resolve();
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

    productId = 'prod-1';

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
    warehouses.clear();
    items.clear();
    batches.clear();
    movements.length = 0;
    jest.clearAllMocks();
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
