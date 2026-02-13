/**
 * Workflow 2: Dine-In Order with Table
 *
 * Source: WORKFLOWS.md - Core Sales Workflows
 * Pattern: Same as workflow-01 (from sales.service.spec.ts)
 *
 * Key Differences from Quick Sale:
 * - Table assignment
 * - Service charge (12% for DINE_IN)
 * - Kitchen ticket creation
 * - Order status: DRAFT → CONFIRMED → PREPARING → READY → COMPLETED
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../../src/modules/sales/sales.repository';
import { OrderStatus } from '../../../../src/core/constants/enums';
import { PrismaService } from '../../../../src/core/prisma/prisma.service';
import { InventoryService } from '../../../../src/modules/inventory/inventory.service';
import { OutboxService } from '../../../../src/core/outbox/outbox.service';
import { SessionsService } from '../../../../src/modules/sessions/sessions.service';

import {
  ItemSubtotalStep,
  ServiceChargeStep,
  DeliveryChargeStep,
  SubtotalBeforeTaxStep,
  TaxStep,
  DiscountStep,
  GrandTotalStep,
} from '../../../../src/modules/sales/calculation-steps';

// Reuse mock factories from workflow-01 pattern
function createMockRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findWithItems: jest.fn(),
    findByOrderNumber: jest.fn(),
    findBySession: jest.fn(),
    findByCustomer: jest.fn(),
    findByStatus: jest.fn(),
    findByDateRange: jest.fn(),
    countByPrefix: jest.fn(),
    createWithItems: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    removeItem: jest.fn(),
    getOrderItems: jest.fn(),
    getDailySalesTotal: jest.fn(),
    getDailyOrderCount: jest.fn(),
  };
}

function createMockEventBus() {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
}

function createMockPrisma() {
  return {
    $transaction: jest.fn(async (fn: (tx: Record<string, unknown>) => unknown) => fn({})),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ value: 1 }]),
  };
}

function createMockStep() {
  return {
    execute: jest.fn((ctx) => Promise.resolve(ctx)),
  };
}

describe('Workflow 2: Dine-In Order with Table', () => {
  let service: SalesService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();
    prisma = createMockPrisma();

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
        {
          provide: InventoryService,
          useValue: {
            getDefaultWarehouse: jest.fn().mockResolvedValue({ id: 'wh-1' }),
            deductStockWithTx: jest.fn(),
          },
        },
        {
          provide: OutboxService,
          useValue: {
            enqueue: jest.fn(),
            flushPending: jest.fn(),
          },
        },
        {
          provide: SessionsService,
          useValue: {
            getCurrentSession: jest.fn().mockResolvedValue({ id: 'sess-1' }),
          },
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 2.1: TABLE ASSIGNMENT ====================
  describe('2.1: Table Assignment', () => {
    it('should create DINE_IN order with tableId', async () => {
      const dineInDto = {
        type: 'DINE_IN' as const,
        tableId: 'table-5',
        guestCount: 4,
        items: [
          {
            productId: 'p1',
            name: 'Kabsa',
            nameAr: 'كبسة',
            price: 45.0,
            quantity: 2,
          },
        ],
      };

      const mockOrder = {
        id: 'order-1',
        orderNumber: 'ORD2026010001',
        type: 'DINE_IN',
        tableId: 'table-5',
        guestCount: 4,
        status: 'DRAFT',
      };

      repo.countByPrefix.mockResolvedValue(0);
      repo.createWithItems.mockResolvedValue(mockOrder);

      const result = await service.createOrder(dineInDto, 'waiter-1');

      expect(result.type).toBe('DINE_IN');
      expect(result.tableId).toBe('table-5');
      expect(result.guestCount).toBe(4);
    });
  });

  // ==================== 2.2: ORDER STATUS FLOW ====================
  describe('2.2: Order Status Flow', () => {
    it('should confirm order (DRAFT → CONFIRMED)', async () => {
      const draftOrder = {
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: 'DRAFT',
        grandTotal: 100,
        items: [
          {
            productId: 'p1',
            productNameEn: 'Kabsa',
            productNameAr: 'كبسة',
            quantity: 1,
          },
        ],
      };
      repo.findWithItems.mockResolvedValue(draftOrder);
      repo.update.mockResolvedValue({ ...draftOrder, status: 'CONFIRMED' });

      const result = await service.confirmOrder('order-1');

      expect(result.status).toBe('CONFIRMED');
    });

    it('should update status to PREPARING', async () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: OrderStatus.CONFIRMED,
        grandTotal: 120,
        items: [{ productId: 'p1', quantity: 1 }],
      };
      repo.findById.mockResolvedValue(order);
      repo.findWithItems.mockResolvedValue(order);
      repo.update.mockResolvedValue({ ...order, status: OrderStatus.PREPARING });

      const result = await service.updateStatus('order-1', {
        status: OrderStatus.PREPARING,
      });

      expect(result.status).toBe('PREPARING');
    });

    it('should update status to READY', async () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: OrderStatus.PREPARING,
        grandTotal: 120,
        items: [{ productId: 'p1', quantity: 1 }],
      };
      repo.findById.mockResolvedValue(order);
      repo.findWithItems.mockResolvedValue(order);
      repo.update.mockResolvedValue({ ...order, status: OrderStatus.READY });

      const result = await service.updateStatus('order-1', { status: OrderStatus.READY });

      expect(result.status).toBe('READY');
    });

    it('should complete order (READY → COMPLETED)', async () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-1',
        status: OrderStatus.READY,
        grandTotal: 120,
        items: [{ productId: 'p1', quantity: 1 }],
      };
      repo.findById.mockResolvedValue(order);
      repo.findWithItems.mockResolvedValue(order);
      repo.update.mockResolvedValue({ ...order, status: OrderStatus.COMPLETED });

      const result = await service.updateStatus('order-1', {
        status: OrderStatus.COMPLETED,
      });

      expect(result.status).toBe('COMPLETED');
    });
  });

  // ==================== 2.3: KITCHEN EVENT ====================
  describe('2.3: Kitchen Ticket Event', () => {
    it('should publish OrderConfirmed for kitchen', async () => {
      const order = {
        id: 'order-1',
        orderNumber: 'ORD-1',
        grandTotal: 95,
        status: 'DRAFT',
        type: 'DINE_IN',
        items: [
          {
            productId: 'p1',
            productNameEn: 'Kabsa',
            productNameAr: 'كبسة',
            quantity: 1,
          },
        ],
      };
      repo.findWithItems.mockResolvedValue(order);
      repo.update.mockResolvedValue({ ...order, status: 'CONFIRMED' });

      await service.confirmOrder('order-1');

      // OrderConfirmed event triggers KitchenTicketCreated in event handler
      expect(eventBus.publish).toHaveBeenCalledWith(
        'OrderConfirmed',
        expect.anything(),
      );
    });
  });

  // ==================== 2.4: ADD ITEMS LATER ====================
  describe('2.4: Add Items After Order Created', () => {
    it('should add item to existing order', async () => {
      const order = {
        id: 'order-1',
        status: 'DRAFT', // Can only add to DRAFT orders
        type: 'DINE_IN',
        items: [{ id: 'item-1', name: 'Kabsa' }],
      };

      const newItem = {
        productId: 'p2',
        name: 'Sambousa',
        nameAr: 'سمبوسة',
        price: 15.0,
        quantity: 4,
      };

      repo.findById.mockResolvedValue(order);
      repo.addItem.mockResolvedValue({ id: 'item-2', ...newItem });
      repo.getOrderItems.mockResolvedValue([
        { id: 'item-1' },
        { id: 'item-2', ...newItem },
      ]);
      repo.update.mockResolvedValue(order);
      repo.findWithItems.mockResolvedValue({
        ...order,
        items: [
          { id: 'item-1', productId: 'p1', price: 45, quantity: 1 },
          { id: 'item-2', ...newItem },
        ],
      });

      const result = await service.addItem('order-1', newItem);

      expect(repo.addItem).toHaveBeenCalled();
    });
  });

  // ==================== 2.5: DINE_IN vs TAKEAWAY ====================
  describe('2.5: Order Type Distinction', () => {
    it('should create DINE_IN order (with table)', async () => {
      const dto = {
        type: 'DINE_IN' as const,
        tableId: 'table-10',
        items: [
          {
            productId: 'p1',
            name: 'Item',
            nameAr: 'عنصر',
            price: 30.0,
            quantity: 1,
          },
        ],
      };

      repo.countByPrefix.mockResolvedValue(0);
      repo.createWithItems.mockResolvedValue({
        ...dto,
        id: 'order-1',
        orderNumber: 'ORD001',
        status: 'DRAFT',
      });

      const result = await service.createOrder(dto, 'waiter-1');

      expect(result.type).toBe('DINE_IN');
    });

    it('should handle order without table (TAKEAWAY)', async () => {
      const dto = {
        type: 'TAKEAWAY' as const,
        items: [
          {
            productId: 'p1',
            name: 'Item',
            nameAr: 'عنصر',
            price: 30.0,
            quantity: 1,
          },
        ],
      };

      repo.countByPrefix.mockResolvedValue(0);
      repo.createWithItems.mockResolvedValue({
        ...dto,
        id: 'order-1',
        orderNumber: 'ORD001',
        status: 'DRAFT',
        tableId: null,
      });

      const result = await service.createOrder(dto, 'cashier-1');

      expect(result.type).toBe('TAKEAWAY');
      expect(result.tableId).toBeNull();
    });
  });
});
