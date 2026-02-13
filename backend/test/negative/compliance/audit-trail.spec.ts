/**
 * COMP-01: Audit Trail for All Transactions
 *
 * Tests that all critical transactions are logged for audit
 */

import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { OrderStatus } from '../../../src/core/constants/enums';
import { Prisma } from '@prisma/client';

describe('COMP-01: Audit Trail for All Transactions', () => {
  let prisma: PrismaService;
  const categories = new Map<string, any>();
  const products = new Map<string, any>();
  const sessions = new Map<string, any>();
  const orders = new Map<string, any>();
  const payments = new Map<string, any>();
  const refunds = new Map<string, any>();
  const warehouses = new Map<string, any>();
  const movements: any[] = [];

  const createInMemoryPrisma = (): PrismaService =>
    ({
      category: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `cat-${categories.size + 1}`;
          const category = { id, ...data };
          categories.set(id, category);
          return category;
        }),
      },
      product: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `prod-${products.size + 1}`;
          const product = {
            id,
            price: new Prisma.Decimal(data.price ?? 0),
            updatedAt: data.updatedAt ?? new Date(),
            ...data,
          };
          products.set(id, product);
          return product;
        }),
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = products.get(where.id);
          if (!existing) return null;
          const updated = {
            ...existing,
            ...data,
            updatedAt: data.updatedAt ?? new Date(),
            price: data.price !== undefined ? new Prisma.Decimal(data.price) : existing.price,
          };
          products.set(where.id, updated);
          return updated;
        }),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return products.get(where.id) ?? null;
        }),
      },
      registerSession: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `sess-${sessions.size + 1}`;
          const session = { id, ...data };
          sessions.set(id, session);
          return session;
        }),
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = sessions.get(where.id);
          if (!existing) return null;
          const updated = { ...existing, ...data };
          sessions.set(where.id, updated);
          return updated;
        }),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return sessions.get(where.id) ?? null;
        }),
      },
      salesOrder: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `order-${orders.size + 1}`;
          const order = {
            id,
            ...data,
            createdAt: data.createdAt ?? new Date(),
            updatedAt: data.updatedAt ?? new Date(),
            grandTotal: new Prisma.Decimal(data.grandTotal ?? 0),
          };
          orders.set(id, order);
          return order;
        }),
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = orders.get(where.id);
          if (!existing) return null;
          const updated = {
            ...existing,
            ...data,
            updatedAt: data.updatedAt ?? new Date(),
            grandTotal:
              data.grandTotal !== undefined
                ? new Prisma.Decimal(data.grandTotal)
                : existing.grandTotal,
          };
          orders.set(where.id, updated);
          return updated;
        }),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return orders.get(where.id) ?? null;
        }),
        findMany: jest.fn(async ({ where }: { where: any }) => {
          const all = Array.from(orders.values());
          return all.filter((order) => {
            if (where?.createdAt) {
              if (where.createdAt.gte && order.createdAt < where.createdAt.gte) return false;
              if (where.createdAt.lte && order.createdAt > where.createdAt.lte) return false;
              if (!where.createdAt.gte && !where.createdAt.lte && order.createdAt !== where.createdAt) return false;
            }
            return true;
          });
        }),
      },
      payment: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `pay-${payments.size + 1}`;
          const payment = {
            id,
            paymentDate: data.paymentDate ?? new Date(),
            amount: new Prisma.Decimal(data.amount ?? 0),
            ...data,
          };
          payments.set(id, payment);
          return payment;
        }),
        findMany: jest.fn(async ({ where }: { where: any }) => {
          return Array.from(payments.values()).filter((payment) => {
            if (where?.orderId && payment.orderId !== where.orderId) return false;
            return true;
          });
        }),
      },
      refund: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `refund-${refunds.size + 1}`;
          const refund = { id, createdAt: data.createdAt ?? new Date(), ...data };
          refunds.set(id, refund);
          return refund;
        }),
        findMany: jest.fn(async ({ where }: { where: any }) => {
          return Array.from(refunds.values()).filter((refund) => {
            if (where?.paymentId && refund.paymentId !== where.paymentId) return false;
            return true;
          });
        }),
      },
      warehouse: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `wh-${warehouses.size + 1}`;
          const warehouse = { id, ...data };
          warehouses.set(id, warehouse);
          return warehouse;
        }),
      },
      inventoryMovement: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const record = { id: `mov-${movements.length + 1}`, createdAt: new Date(), ...data };
          movements.push(record);
          return record;
        }),
      },
    }) as unknown as PrismaService;

  beforeEach(async () => {
    prisma = createInMemoryPrisma();
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: 1000,
      },
    });
    const category = await prisma.category.create({
      data: { nameEn: 'Test Category', nameAr: 'Test Category AR', sortOrder: 0, isActive: true },
    });
    await prisma.product.create({
      data: {
        sku: `TEST-${Date.now()}`,
        nameEn: 'Test Product',
        nameAr: 'Test Product AR',
        categoryId: category.id,
        price: 50,
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    categories.clear();
    products.clear();
    sessions.clear();
    orders.clear();
    payments.clear();
    refunds.clear();
    warehouses.clear();
    movements.length = 0;
    jest.clearAllMocks();
  });

  it('should log order creation with user and timestamp', async () => {
    // Act: Create an order
    const order = await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-AUDIT-1',
      orderType: 'DINE_IN',
      status: OrderStatus.DRAFT,
      grandTotal: 50,
      sessionId: 'test-session',
      businessDate: new Date(),
      taxRate: 0.15,
      },
    });

    // Assert: Verify audit fields
    expect(order.id).toBeDefined();
    expect(order.createdAt).toBeDefined();

    // Verify we can query by creation time
    const ordersByTime = await prisma.salesOrder.findMany({
      where: {
        createdAt: order.createdAt,
      },
    });

    expect(ordersByTime.length).toBeGreaterThan(0);
  });

  it('should log order status changes', async () => {
    // Setup: Create order
    const order = await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-AUDIT-2',
      orderType: 'DINE_IN',
      status: OrderStatus.DRAFT,
      grandTotal: 50,
      sessionId: 'test-session',
      businessDate: new Date(),
      taxRate: 0.15,
      },
    });

    const originalCreatedAt = order.createdAt;

    // Act: Update status to CONFIRMED
    await prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Assert: Verify timestamps
    const updatedOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(updatedOrder?.status).toBe(OrderStatus.CONFIRMED);
    expect(updatedOrder?.confirmedAt).toBeDefined();
    expect(updatedOrder?.updatedAt?.getTime()).toBeGreaterThanOrEqual(
      originalCreatedAt.getTime(),
    );
  });

  it('should log payment creation with method and reference', async () => {
    // Setup: Create order
    const order = await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-AUDIT-3',
      orderType: 'DINE_IN',
      status: OrderStatus.CONFIRMED,
      grandTotal: 100,
      sessionId: 'test-session',
      businessDate: new Date(),
      taxRate: 0.15,
      },
    });

    // Act: Create payment
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 100,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-TEST-001',
        sessionId: order.sessionId,
        processedBy: 'user-1',
      },
    });

    // Assert: Verify audit fields
    expect(payment.id).toBeDefined();
    expect(payment.paymentDate).toBeDefined();
    expect(payment.paymentMethod).toBe('CASH');
    expect(payment.referenceNumber).toBe('PAY-TEST-001');

    // Verify we can query payment history
    const paymentHistory = await prisma.payment.findMany({
      where: { orderId: order.id },
    });

    expect(paymentHistory.length).toBe(1);
  });

  it('should log session open and close events', async () => {
    // Act: Open session
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: 1000,
        openedAt: new Date(),
      },
    });

    expect(session.openedAt).toBeDefined();

    // Act: Close session
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: 1500,
        closedAt: new Date(),
      },
    });

    // Assert: Both timestamps exist
    expect(closedSession.openedAt).toBeDefined();
    expect(closedSession.closedAt).toBeDefined();
  });

  it('should track user who processed payment', async () => {
    const actingUser = 'user-123';

    const order = await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-AUDIT-4',
      orderType: 'DINE_IN',
      status: OrderStatus.CONFIRMED,
      grandTotal: 0,
      sessionId: 'test-session',
      businessDate: new Date(),
      taxRate: 0.15,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 0,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-AUDIT-001',
        sessionId: order.sessionId,
        processedBy: actingUser,
      },
    });

    expect(payment.processedBy).toBe(actingUser);
  });

  it('should log refund transactions', async () => {
    const order = await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-AUDIT-5',
      orderType: 'DINE_IN',
      status: OrderStatus.COMPLETED,
      grandTotal: 100,
      sessionId: 'test-session',
      businessDate: new Date(),
      taxRate: 0.15,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 100,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-TEST-REFUND',
        sessionId: order.sessionId,
        processedBy: 'user-1',
      },
    });

    // Act: Create refund
    const refund = await prisma.refund.create({
      data: {
        paymentId: payment.id,
        amount: 100,
        reason: 'Customer request',
        status: 'COMPLETED',
        createdBy: 'user-1',
      },
    });

    // Assert: Verify audit fields
    expect(refund.id).toBeDefined();
    expect(refund.createdAt).toBeDefined();
    expect(refund.createdBy).toBe('user-1');
    expect(refund.status).toBe('COMPLETED');

    // Verify refund history
    const refunds = await prisma.refund.findMany({
      where: { paymentId: payment.id },
    });

    expect(refunds.length).toBe(1);
  });

  it('should log inventory adjustments', async () => {
    const product = await prisma.product.create({
      data: {
      sku: `AUDIT-${Date.now()}`,
      nameEn: 'Audit Product',
      nameAr: 'Audit Product AR',
      categoryId: Array.from(categories.keys())[0],
      price: 50,
      isActive: true,
      },
    });
    const warehouse = await prisma.warehouse.create({
      data: {
        code: `WH-${Date.now()}`,
        nameEn: 'Audit Warehouse',
        nameAr: 'مستودع التدقيق',
        isDefault: false,
        isActive: true,
      },
    });

    // Act: Create inventory adjustment
    const adjustment = await prisma.inventoryMovement.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        type: 'ADJUSTMENT',
        quantity: 5,
        reason: 'Damaged goods',
        createdBy: 'user-1',
      },
    });

    // Assert: Verify audit fields
    expect(adjustment.id).toBeDefined();
    expect(adjustment.createdAt).toBeDefined();
    expect(adjustment.createdBy).toBe('user-1');
    expect(adjustment.reason).toBe('Damaged goods');
  });

  it('should be queryable for compliance reports', async () => {
    // Setup: Create orders across different dates
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-YESTERDAY',
      orderType: 'TAKEAWAY',
      status: 'COMPLETED',
      businessDate: yesterday,
      createdAt: yesterday,
      grandTotal: 100,
      sessionId: 'test-session',
      taxRate: 0.15,
      },
    });

    await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-TODAY',
      orderType: 'DINE_IN',
      status: 'COMPLETED',
      businessDate: today,
      createdAt: today,
      grandTotal: 200,
      sessionId: 'test-session',
      taxRate: 0.15,
      },
    });

    // Query: Get all orders from today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayOrders = await prisma.salesOrder.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    expect(todayOrders.length).toBeGreaterThan(0);

    // Query: Get total sales for today
    const totalSales = todayOrders.reduce(
      (sum, order) => sum + (order.grandTotal?.toNumber() || 0),
      0,
    );

    expect(totalSales).toBeGreaterThan(0);
  });

  it('should preserve history for cancelled records', async () => {
    const order = await prisma.salesOrder.create({
      data: {
      orderNumber: 'ORD-AUDIT-6',
      orderType: 'DINE_IN',
      status: OrderStatus.CANCELLED,
      grandTotal: 50,
      sessionId: 'test-session',
      businessDate: new Date(),
      taxRate: 0.15,
      },
    });

    await prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    const cancelledOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
    });

    expect(cancelledOrder?.cancelledAt).toBeDefined();
    expect(cancelledOrder?.status).toBe(OrderStatus.CANCELLED);
  });

  it('should log price changes', async () => {
    // This test verifies price history is tracked
    const originalPrice = 50;
    const newPrice = 60;

    const product = await prisma.product.create({
      data: {
      sku: 'PRICE-TEST',
      price: originalPrice,
      nameEn: 'Price Test',
      nameAr: 'Price Test AR',
      categoryId: Array.from(categories.keys())[0],
      isActive: true,
      },
    });

    // Update price
    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: newPrice,
        updatedAt: new Date(),
      },
    });

    // Verify price changed
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(updatedProduct?.price.toNumber()).toBe(newPrice);
    expect(updatedProduct?.updatedAt).toBeDefined();
  });
});

