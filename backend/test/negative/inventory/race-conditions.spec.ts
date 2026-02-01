/**
 * INV-01: Overselling Last Item (Race Condition)
 *
 * Tests that two terminals cannot oversell the same stock
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../../src/modules/inventory/inventory.repository';
import { InventoryEventHandlers } from '../../../src/modules/inventory/inventory.handlers';
import { FIFOStrategy } from '../../../src/modules/inventory/strategies/fifo.strategy';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import {
  ItemSubtotalStep,
  ServiceChargeStep,
  DeliveryChargeStep,
  SubtotalBeforeTaxStep,
  TaxStep,
  DiscountStep,
  GrandTotalStep,
} from '../../../src/modules/sales/calculation-steps';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { RaceConditionTester } from '../../helpers/race-condition';
import {
  createTestProduct,
  createTestSession,
  cleanupTestData,
} from '../../helpers/test-helpers';

describe('INV-01: Overselling Last Item (Race Condition)', () => {
  let salesService: SalesService;
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let productId: string;
  let warehouseId: string;
  let sessionId: string;
  let inventoryItemId: string;
  let defaultWarehouseSpy: jest.SpyInstance;
  let orderNumberSpy: jest.SpyInstance;
  let orderNumberCounter = 0;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SalesService,
        SalesRepository,
        InventoryService,
        InventoryRepository,
        InventoryEventHandlers,
        PrismaService,
        FIFOStrategy,
        EventBusService,
        ItemSubtotalStep,
        ServiceChargeStep,
        DeliveryChargeStep,
        SubtotalBeforeTaxStep,
        TaxStep,
        DiscountStep,
        GrandTotalStep,
        {
          provide: SessionsService,
          useValue: { getCurrentSession: jest.fn() },
        },
        { provide: 'IEventBus', useExisting: EventBusService },
      ],
    }).compile();

    await module.init();

    salesService = module.get<SalesService>(SalesService);
    inventoryService = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    const session = await createTestSession(prisma);
    sessionId = session.id;

    let defaultWarehouse = await prisma.warehouse.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (!defaultWarehouse) {
      defaultWarehouse = await prisma.warehouse.create({
        data: {
          code: `WH-DEFAULT-${Date.now()}`,
          nameEn: 'Default Warehouse',
          nameAr: 'Default Warehouse AR',
          isActive: true,
          isDefault: true,
        },
      });
    }
    warehouseId = defaultWarehouse.id;
    defaultWarehouseSpy = jest
      .spyOn(inventoryService, 'getDefaultWarehouse')
      .mockResolvedValue({ id: warehouseId } as any);

    orderNumberCounter = 0;
    orderNumberSpy = jest
      .spyOn(salesService as any, 'generateOrderNumber')
      .mockImplementation(
        async () => `TEST-${Date.now()}-${orderNumberCounter++}`,
      );

    const product = await createTestProduct(prisma, {
      nameEn: 'Test Product for Overselling',
      price: 50,
    });
    productId = product.id;

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        productId,
        warehouseId,
        quantityOnHand: 5,
        reorderPoint: 10,
        averageCost: 25,
      },
    });
    inventoryItemId = inventoryItem.id;

    await prisma.inventoryBatch.create({
      data: {
        inventoryItemId: inventoryItem.id,
        receivedDate: new Date(),
        quantityReceived: 5,
        quantityRemaining: 5,
        costPerUnit: 25,
      },
    });
  });

  afterEach(async () => {
    if (defaultWarehouseSpy) {
      defaultWarehouseSpy.mockRestore();
    }
    if (orderNumberSpy) {
      orderNumberSpy.mockRestore();
    }
    await cleanupTestData(prisma);
  });

  it('should prevent overselling when two terminals order simultaneously', async () => {
    const terminalAOrder = {
      type: 'DINE_IN' as const,
      sessionId,
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'Test Product AR',
          price: 50,
          quantity: 5,
        },
      ],
    };

    const terminalBOrder = {
      type: 'DINE_IN' as const,
      sessionId,
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'Test Product AR',
          price: 50,
          quantity: 5,
        },
      ],
    };

    const { terminalAResult, terminalBResult, bothSucceeded } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () => salesService.createOrder(terminalAOrder as any, 'terminal-a'),
        () => salesService.createOrder(terminalBOrder as any, 'terminal-b'),
      );

    const results = [terminalAResult, terminalBResult];
    const successCount = results.filter((r) => !('error' in (r as any))).length;
    const errorCount = results.filter((r) => 'error' in (r as any)).length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(1);
    expect(bothSucceeded).toBe(false);

    const finalStock = await prisma.inventoryItem.findFirst({
      where: { productId, warehouseId },
    });
    expect(finalStock?.quantityOnHand?.toString()).toBe('0');
  });

  it('should handle rapid concurrent stock deductions correctly', async () => {
    await prisma.inventoryItem.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantityOnHand: 10 },
    });

    await prisma.inventoryBatch.updateMany({
      where: { inventoryItemId },
      data: { quantityRemaining: 10, quantityReceived: 10 },
    });

    const concurrency = Number(process.env.TEST_CONCURRENCY || 20);
    const expectedSuccess = Math.min(10, concurrency);
    const expectedFailed = Math.max(0, concurrency - 10);

    const { successful, failed } = await RaceConditionTester.floodEndpoint(
      async () => {
        return salesService.createOrder(
          {
            type: 'TAKEAWAY',
            sessionId,
            items: [
              {
                productId,
                name: 'Test Product',
                nameAr: 'Test Product AR',
                price: 50,
                quantity: 1,
              },
            ],
          } as any,
          'user-1',
        );
      },
      concurrency,
    );

    expect(successful).toBe(expectedSuccess);
    expect(failed).toBe(expectedFailed);

    const stock = await prisma.inventoryItem.findFirst({
      where: { productId, warehouseId },
    });
    expect(stock?.quantityOnHand?.toString()).toBe('0');
  });

  it('should reject order when product has zero stock', async () => {
    await prisma.inventoryItem.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantityOnHand: 0 },
    });

    await prisma.inventoryBatch.updateMany({
      where: { inventoryItemId },
      data: { quantityRemaining: 0, quantityReceived: 0 },
    });

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId,
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'Test Product AR',
          price: 50,
          quantity: 1,
        },
      ],
    };

    await expect(
      salesService.createOrder(order as any, 'user'),
    ).rejects.toThrow();
  });
});
