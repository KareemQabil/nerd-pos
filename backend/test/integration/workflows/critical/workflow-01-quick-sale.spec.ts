/**
 * Workflow 1: Quick Sale (Cash, No Table)
 *
 * Source: WORKFLOWS.md - Core Sales Workflows
 * Pattern: Copied from existing sales.service.spec.ts (Phase 2)
 *
 * Applied Error Fixing Workflow:
 * - Verified SalesService constructor (7 calculation steps)
 * - Verified SalesRepository methods from sales.repository.ts
 * - Verified DTOs from dto/index.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundAppException } from '../../../../src/common/exceptions';
import { SalesService } from '../../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../../src/core/prisma/prisma.service';
import { InventoryService } from '../../../../src/modules/inventory/inventory.service';
import { OutboxService } from '../../../../src/core/outbox/outbox.service';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';

// Import calculation step classes (must mock all 7)
import {
  ItemSubtotalStep,
  ServiceChargeStep,
  DeliveryChargeStep,
  SubtotalBeforeTaxStep,
  TaxStep,
  DiscountStep,
  GrandTotalStep,
} from '../../../../src/modules/sales/calculation-steps';

// Mock Repository - methods from sales.repository.ts
function createMockRepository() {
  return {
    // BaseRepository methods
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    // Order methods
    findWithItems: jest.fn(),
    findByOrderNumber: jest.fn(),
    findBySession: jest.fn(),
    findByCustomer: jest.fn(),
    findByStatus: jest.fn(),
    findByDateRange: jest.fn(),
    countByPrefix: jest.fn(),
    createWithItems: jest.fn(),
    // Order item methods
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    getOrderItems: jest.fn(),
    // Statistics
    getDailySalesTotal: jest.fn(),
    getDailyOrderCount: jest.fn(),
  };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
}

// Mock Calculation Step
function createMockStep() {
  return {
    execute: jest.fn((ctx) => Promise.resolve(ctx)),
  };
}

describe('Workflow 1: Quick Sale', () => {
  let service: SalesService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let prisma: {
    $transaction: jest.Mock;
    $executeRaw: jest.Mock;
    $queryRaw: jest.Mock;
    inventoryItem: { updateMany: jest.Mock };
  };
  let inventoryService: { getDefaultWarehouse: jest.Mock; deductStockWithTx: jest.Mock };
  let sessionsService: { getCurrentSession: jest.Mock };
  let outboxService: { enqueue: jest.Mock; flushPending: jest.Mock };

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();
    prisma = {
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
      inventoryItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
    inventoryService = {
      getDefaultWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
      deductStockWithTx: jest.fn().mockResolvedValue(undefined),
    };
    sessionsService = {
      getCurrentSession: jest.fn().mockResolvedValue({ id: 'session-1' }),
    };
    outboxService = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      flushPending: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: SalesRepository, useValue: repo },
        { provide: PrismaService, useValue: prisma },
        { provide: 'IEventBus', useValue: eventBus },
        { provide: ItemSubtotalStep, useValue: createMockStep() },
        { provide: ServiceChargeStep, useValue: createMockStep() },
        { provide: DeliveryChargeStep, useValue: createMockStep() },
        { provide: SubtotalBeforeTaxStep, useValue: createMockStep() },
        { provide: TaxStep, useValue: createMockStep() },
        { provide: DiscountStep, useValue: createMockStep() },
        { provide: GrandTotalStep, useValue: createMockStep() },
        { provide: InventoryService, useValue: inventoryService },
        { provide: OutboxService, useValue: outboxService },
        { provide: SessionsService, useValue: sessionsService },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 1.1: CREATE ORDER ====================
  describe('1.1: Create Order with Items', () => {
    const validDto = {
      type: 'TAKEAWAY' as const,
      items: [
        {
          productId: 'prod-1',
          name: 'Shawarma',
          nameAr: 'شاورما',
          price: 50.0,
          quantity: 2,
        },
        {
          productId: 'prod-2',
          name: 'Fries',
          nameAr: 'بطاطس',
          price: 15.0,
          quantity: 1,
        },
      ],
    };

    it('should create order with correct items', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD2026010001',
        type: 'TAKEAWAY',
        status: 'DRAFT',
        grandTotal: 115.0,
        items: validDto.items,
      };

      repo.countByPrefix.mockResolvedValue(0);
      repo.createWithItems.mockResolvedValue(mockOrder);

      const result = await service.createOrder(validDto, 'cashier-1');

      expect(result).toBeDefined();
      expect(result.type).toBe('TAKEAWAY');
      expect(repo.createWithItems).toHaveBeenCalled();
    });

    it('should publish OrderCreated event', async () => {
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD2026010001',
        type: 'TAKEAWAY',
        status: 'DRAFT',
      };

      repo.countByPrefix.mockResolvedValue(0);
      repo.createWithItems.mockResolvedValue(mockOrder);

      await service.createOrder(validDto, 'cashier-1');

      expect(outboxService.enqueue).toHaveBeenCalledWith(
        expect.anything(),
        'OrderCreated',
        expect.anything(),
      );
    });
  });

  // ==================== 1.2: ORDER CONFIRMATION ====================
  describe('1.2: Order Confirmation', () => {
    it('should change status to CONFIRMED', async () => {
      const draftOrder = { id: 'order-1', status: 'DRAFT', items: [] };
      const confirmedOrder = { ...draftOrder, status: 'CONFIRMED' };

      repo.findWithItems.mockResolvedValue(draftOrder);
      repo.update.mockResolvedValue(confirmedOrder);

      const result = await service.confirmOrder('order-1');

      expect(result.status).toBe('CONFIRMED');
    });

    it('should publish OrderConfirmed event', async () => {
      const draftOrder = { id: 'order-1', status: 'DRAFT', items: [] };
      repo.findWithItems.mockResolvedValue(draftOrder);
      repo.update.mockResolvedValue({ ...draftOrder, status: 'CONFIRMED' });

      await service.confirmOrder('order-1');

      expect(eventBus.publish).toHaveBeenCalledWith(
        'OrderConfirmed',
        expect.anything(),
      );
    });
  });

  // ==================== 1.3: ORDER CANCELLATION ====================
  describe('1.3: Order Cancellation', () => {
    it('should cancel order with reason', async () => {
      const order = { id: 'order-1', status: 'DRAFT' };
      repo.findWithItems.mockResolvedValue(order);
      repo.update.mockResolvedValue({ ...order, status: 'CANCELLED' });

      const result = await service.cancelOrder(
        'order-1',
        'Customer changed mind',
      );

      expect(result.status).toBe('CANCELLED');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'OrderCancelled',
        expect.anything(),
      );
    });
  });

  // ==================== 1.4: ORDER QUERIES ====================
  describe('1.4: Order Queries', () => {
    it('should find order by ID', async () => {
      const order = { id: 'order-1', orderNumber: 'ORD-001' };
      repo.findById.mockResolvedValue(order);

      const result = await service.findOrderById('order-1');

      expect(result.id).toBe('order-1');
    });

    it('should throw NotFoundAppException for missing order', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findOrderById('nonexistent')).rejects.toThrow(
        NotFoundAppException,
      );
    });

    it('should find orders by session', async () => {
      const orders = [{ id: 'order-1' }, { id: 'order-2' }];
      repo.findBySession.mockResolvedValue(orders);

      const result = await service.findOrdersBySession('session-123');

      expect(result).toHaveLength(2);
    });
  });

  // ==================== 1.5: ADD/REMOVE ITEMS ====================
  describe('1.5: Modify Order Items', () => {
    it('should add item to order', async () => {
      const order = { id: 'order-1', status: 'DRAFT', items: [] };
      const newItem = {
        productId: 'prod-3',
        name: 'Hummus',
        nameAr: 'حمص',
        price: 20.0,
        quantity: 1,
      };

      repo.findById.mockResolvedValue(order);
      repo.addItem.mockResolvedValue({ id: 'item-1', ...newItem });
      repo.getOrderItems.mockResolvedValue([{ id: 'item-1', ...newItem }]);
      repo.update.mockResolvedValue({ ...order, items: [newItem] });
      repo.findWithItems.mockResolvedValue({ ...order, items: [newItem] });

      const result = await service.addItem('order-1', newItem);

      expect(repo.addItem).toHaveBeenCalled();
    });

    it('should remove item from order', async () => {
      const order = {
        id: 'order-1',
        status: 'DRAFT',
        items: [{ id: 'item-1' }],
      };

      repo.findById.mockResolvedValue(order);
      repo.removeItem.mockResolvedValue(undefined);
      repo.getOrderItems.mockResolvedValue([]);
      repo.update.mockResolvedValue({ ...order, items: [] });
      repo.findWithItems.mockResolvedValue({ ...order, items: [] });

      await service.removeItem('order-1', 'item-1');

      expect(repo.removeItem).toHaveBeenCalledWith('item-1');
    });
  });
});
