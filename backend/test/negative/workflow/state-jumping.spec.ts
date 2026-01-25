/**
 * WF-01: Add Item to Paid Order
 *
 * Tests that items cannot be added to paid orders
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import { createTestProduct, createTestSession, cleanupTestData } from '../../helpers/test-helpers';

describe('WF-01: Add Item to Paid Order', () => {
  let salesService: SalesService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        SalesRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock sessions service
    (salesService as any).sessionsService = {
      getCurrentSession: jest.fn().mockResolvedValue({ id: 'test-session' }),
    };
  });

  beforeEach(async () => {
    await createTestSession(prisma);
    await createTestProduct(prisma);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should reject item addition to PAID order', async () => {
    // Setup: Create a paid order
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.PAID,
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 100
      }
    });

    const itemDto = {
      productId: 'prod-1',
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50
    };

    // Act & Assert
    await expect(salesService.addItem(order.id, itemDto as any))
      .rejects.toThrow('Cannot modify paid order');
  });

  it('should reject item addition to COMPLETED order', async () => {
    // Setup: Create a completed order
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.COMPLETED,
        sessionId: 'test-session',
        businessDate: new Date(),
        completedAt: new Date(),
        grandTotal: 100
      }
    });

    const itemDto = {
      productId: 'prod-1',
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50
    };

    // Act & Assert
    await expect(salesService.addItem(order.id, itemDto as any))
      .rejects.toThrow('Cannot modify completed order');
  });

  it('should reject item addition to CANCELLED order', async () => {
    // Setup: Create a cancelled order
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.CANCELLED,
        sessionId: 'test-session',
        businessDate: new Date(),
        cancelledAt: new Date(),
        grandTotal: 100
      }
    });

    const itemDto = {
      productId: 'prod-1',
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50
    };

    // Act & Assert
    await expect(salesService.addItem(order.id, itemDto as any))
      .rejects.toThrow('Cannot modify cancelled order');
  });

  it('should allow item addition to DRAFT order', async () => {
    // Setup: Create a draft order
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `ORD-${Date.now()}`,
        orderType: 'DINE_IN',
        status: OrderStatus.DRAFT,
        sessionId: 'test-session',
        businessDate: new Date(),
        grandTotal: 0
      }
    });

    const itemDto = {
      productId: 'prod-1',
      quantity: 1,
      name: 'New Item',
      nameAr: 'صنف جديد',
      price: 50
    };

    // Act & Assert
    const result = await salesService.addItem(order.id, itemDto as any);
    expect(result).toBeDefined();
  });
});
