/**
 * INV-02: Selling Zero-Stock Item
 *
 * Tests that items with zero stock cannot be sold
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
import {
  createTestProduct,
  createTestSession,
  cleanupTestData,
} from '../../helpers/test-helpers';

describe('INV-02: Selling Zero-Stock Item', () => {
  let salesService: SalesService;
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let sessionId: string;
  let warehouseId: string;
  let productId: string;
  let defaultWarehouseSpy: jest.SpyInstance;

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

    const product = await createTestProduct(prisma);
    productId = product.id;
  });

  afterEach(async () => {
    if (defaultWarehouseSpy) {
      defaultWarehouseSpy.mockRestore();
    }
    await cleanupTestData(prisma);
  });

  it('should reject sale of item with zero stock', async () => {
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

  it('should reject sale when quantity exceeds available stock', async () => {
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        productId,
        warehouseId,
        quantityOnHand: 5,
        reorderPoint: 5,
        averageCost: 25,
      },
    });

    await prisma.inventoryBatch.create({
      data: {
        inventoryItemId: inventoryItem.id,
        receivedDate: new Date(),
        quantityReceived: 5,
        quantityRemaining: 5,
        costPerUnit: 25,
      },
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
          quantity: 10,
        },
      ],
    };

    await expect(
      salesService.createOrder(order as any, 'user'),
    ).rejects.toThrow();
  });

  it('should allow sale when stock equals requested quantity', async () => {
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        productId,
        warehouseId,
        quantityOnHand: 5,
        reorderPoint: 5,
        averageCost: 25,
      },
    });

    await prisma.inventoryBatch.create({
      data: {
        inventoryItemId: inventoryItem.id,
        receivedDate: new Date(),
        quantityReceived: 5,
        quantityRemaining: 5,
        costPerUnit: 25,
      },
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
          quantity: 5,
        },
      ],
    };

    const result = await salesService.createOrder(order as any, 'user');
    expect(result).toBeDefined();
  });

  it('should check stock before deducting', async () => {
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

    const movements = await prisma.inventoryMovement.findMany({
      where: { productId, warehouseId },
    });

    expect(movements.length).toBe(0);
  });
});
