/**
 * SES-02: Order Without Session
 *
 * Tests that orders cannot be created without a valid session
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { createTestProduct, cleanupTestData } from '../../helpers/test-helpers';

describe('SES-02: Order Without Session', () => {
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

    // Mock sessions service to return null (no active session)
    (salesService as any).sessionsService = {
      getCurrentSession: jest.fn().mockResolvedValue(null),
    };
  });

  beforeEach(async () => {
    await createTestProduct(prisma);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should reject order when no active session exists', async () => {
    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: undefined, // No session
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

    // Act & Assert
    await expect(salesService.createOrder(order as any, 'user'))
      .rejects.toThrow();
  });

  it('should reject order when sessionId is null', async () => {
    const order = {
      type: 'DINE_IN' as const,
      sessionId: null,
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

    // Act & Assert
    await expect(salesService.createOrder(order as any, 'user'))
      .rejects.toThrow();
  });

  it('should reject order when sessionId is empty string', async () => {
    const order = {
      type: 'DINE_IN' as const,
      sessionId: '',
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

    // Act & Assert
    await expect(salesService.createOrder(order as any, 'user'))
      .rejects.toThrow();
  });

  it('should accept order when valid session is provided', async () => {
    // Setup: Create a session
    await prisma.registerSession.create({
      data: {
        userId: 'test-user',
        terminalId: 'test-terminal',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    const order = {
      type: 'TAKEAWAY' as const,
      sessionId: 'SESS-TEST',
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

    // Act & Assert
    const result = await salesService.createOrder(order, 'user');
    expect(result).toBeDefined();
  });
});
