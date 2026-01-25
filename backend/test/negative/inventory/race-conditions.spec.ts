/**
 * INV-01: Overselling Last Item (Race Condition)
 *
 * Tests that two terminals cannot oversell the same stock
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { InventoryService } from '../../../src/modules/inventory/inventory.service';
import { InventoryRepository } from '../../../src/modules/inventory/inventory.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { RaceConditionTester } from '../../helpers/race-condition';
import { EventSpy } from '../../helpers/event-spy';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';

describe('INV-01: Overselling Last Item (Race Condition)', () => {
  let salesService: SalesService;
  let inventoryService: InventoryService;
  let prisma: PrismaService;
  let eventSpy: EventSpy;
  let productId: string;
  let warehouseId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        InventoryService,
        SalesRepository,
        InventoryRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    inventoryService = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock sessions service
    (salesService as any).sessionsService = {
      getCurrentSession: jest.fn().mockResolvedValue({ id: 'test-session' }),
    };
  });

  beforeEach(async () => {
    eventSpy = new EventSpy({ publish: jest.fn(), subscribe: jest.fn() } as IEventBus);

    // Setup: Create warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        name: 'Test Warehouse',
        code: 'WH-TEST',
        isActive: true,
        isDefault: true
      }
    });
    warehouseId = warehouse.id;

    // Setup: Create product with stock = 3
    const product = await createTestProduct(prisma, {
      name: 'Test Product for Overselling',
      price: 50
    });
    productId = product.id;

    // Setup: Create inventory item with stock = 3
    await prisma.inventoryItem.create({
      data: {
        productId,
        warehouseId,
        quantityOnHand: 3,
        reorderPoint: 10,
        averageCost: 25
      }
    });

    // Setup: Create session
    await createTestSession(prisma, {
      userId: 'test-user',
      terminalId: 'test-terminal'
    });
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should prevent overselling when two terminals order simultaneously', async () => {
    // Arrange: Two terminals order same product (stock=3, each wants 5)
    const terminalAOrder = {
      type: 'DINE_IN' as const,
      sessionId: 'test-session',
        businessDate: new Date(),
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 5
        }
      ]
    };

    const terminalBOrder = {
      type: 'DINE_IN' as const,
      sessionId: 'test-session',
        businessDate: new Date(),
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 5
        }
      ]
    };

    // Act: Simulate concurrent requests
    const { terminalAResult, terminalBResult, bothSucceeded } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () => salesService.createOrder(terminalAOrder, 'terminal-a').catch(e => ({ error: e })),
        () => salesService.createOrder(terminalBOrder, 'terminal-b').catch(e => ({ error: e }))
      );

    // Assert: Only ONE should succeed
    const results = [terminalAResult, terminalBResult];
    const successCount = results.filter(r => !('error' in r)).length;
    const errorCount = results.filter(r => 'error' in r).length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(1);
    expect(bothSucceeded).toBe(false);

    // CRITICAL: Verify stock = 0 (not -2)
    const finalStock = await prisma.inventoryItem.findFirst({
      where: { productId, warehouseId }
    });
    expect(finalStock?.quantityOnHand?.toString()).toBe('0');
  });

  it('should handle rapid concurrent stock deductions correctly', async () => {
    // Setup: Update stock to 10
    await prisma.inventoryItem.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantityOnHand: 10 }
    });

    // Act: Flood with 20 concurrent orders (each requesting 1 unit)
    const { successful, failed } = await RaceConditionTester.floodEndpoint(
      async () => {
        try {
          return await salesService.createOrder({
            type: 'TAKEAWAY',
            sessionId: 'test-session',
        businessDate: new Date(),
            items: [
              {
                productId,
                name: 'Test Product',
                nameAr: 'منتج تجريبي',
                price: 50,
                quantity: 1
              }
            ]
          }, 'user-1');
        } catch (e) {
          return { error: e };
        }
      },
      20
    );

    // Assert: Exactly 10 should succeed (stock=10), 10 should fail
    expect(successful).toBe(10);
    expect(failed).toBe(10);

    // Verify stock = 0
    const stock = await prisma.inventoryItem.findFirst({
      where: { productId, warehouseId }
    });
    expect(stock?.quantityOnHand?.toString()).toBe('0');
  });

  it('should reject order when product has zero stock', async () => {
    // Setup: Set stock to 0
    await prisma.inventoryItem.update({
      where: { productId_warehouseId: { productId, warehouseId } },
      data: { quantityOnHand: 0 }
    });

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'test-session',
        businessDate: new Date(),
      items: [
        {
          productId,
          name: 'Test Product',
          nameAr: 'منتج تجريبي',
          price: 50,
          quantity: 1
        }
      ]
    };

    // Act & Assert
    await expect(salesService.createOrder(order, 'user'))
      .rejects.toThrow();
  });
});
