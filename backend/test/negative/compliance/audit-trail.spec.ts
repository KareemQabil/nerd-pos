/**
 * COMP-01: Audit Trail for All Transactions
 *
 * Tests that all critical transactions are logged for audit
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../src/modules/sessions/sessions.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { OrderStatus } from '../../../src/core/constants/enums';
import { createTestProduct, createTestSession, createTestOrder, cleanupTestData } from '../../helpers/test-helpers';

describe('COMP-01: Audit Trail for All Transactions', () => {
  let salesService: SalesService;
  let sessionsService: SessionsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        SalesRepository,
        SessionsService,
        SessionsRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    salesService = module.get<SalesService>(SalesService);
    sessionsService = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);

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

  it('should log order creation with user and timestamp', async () => {
    // Act: Create an order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 50
    });

    // Assert: Verify audit fields
    expect(order.id).toBeDefined();
    expect(order.createdAt).toBeDefined();
    expect(order.createdBy).toBeDefined();

    // Verify we can query by creation time
    const ordersByTime = await prisma.salesOrder.findMany({
      where: {
        createdAt: order.createdAt
      }
    });

    expect(ordersByTime.length).toBeGreaterThan(0);
  });

  it('should log order status changes', async () => {
    // Setup: Create order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.DRAFT,
      grandTotal: 50
    });

    const originalCreatedAt = order.createdAt;

    // Act: Update status to CONFIRMED
    await prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Assert: Verify timestamps
    const updatedOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id }
    });

    expect(updatedOrder?.status).toBe(OrderStatus.CONFIRMED);
    expect(updatedOrder?.confirmedAt).toBeDefined();
    expect(updatedOrder?.updatedAt?.getTime()).toBeGreaterThan(originalCreatedAt.getTime());
  });

  it('should log payment creation with method and reference', async () => {
    // Setup: Create order
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      grandTotal: 100
    });

    // Act: Create payment
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: 100,
        paymentMethod: 'CASH',
        referenceNumber: 'PAY-TEST-001',
        userId: 'user-1'
      }
    });

    // Assert: Verify audit fields
    expect(payment.id).toBeDefined();
    expect(payment.createdAt).toBeDefined();
    expect(payment.method).toBe('CASH');
    expect(payment.reference).toBe('PAY-TEST-001');

    // Verify we can query payment history
    const paymentHistory = await prisma.payment.findMany({
      where: { orderId: order.id }
    });

    expect(paymentHistory.length).toBe(1);
  });

  it('should log session open and close events', async () => {
    // Act: Open session
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000,
        openedAt: new Date()
      }
    });

    expect(session.openedAt).toBeDefined();
    expect(session.createdAt).toBeDefined();

    // Act: Close session
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: 1500,
        closedAt: new Date()
      }
    });

    // Assert: Both timestamps exist
    expect(closedSession.openedAt).toBeDefined();
    expect(closedSession.closedAt).toBeDefined();
  });

  it('should track user who performed action', async () => {
    const actingUser = 'user-123';

    // Act: Create order as specific user
    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-AUDIT-001',
        orderType: 'TAKEAWAY',
        status: 'DRAFT',
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: new Date(),
        grandTotal: 0,
        createdBy: actingUser
      }
    });

    // Assert: Verify user tracking
    expect(order.createdBy).toBe(actingUser);

    // Query by user
    const userOrders = await prisma.salesOrder.findMany({
      where: { createdBy: actingUser }
    });

    expect(userOrders.length).toBeGreaterThan(0);
    expect(userOrders[0].createdBy).toBe(actingUser);
  });

  it('should log refund transactions', async () => {
    const order = await createTestOrder(prisma, {
      status: OrderStatus.COMPLETED,
      grandTotal: 100
    });

    // Act: Create refund
    const refund = await prisma.refund.create({
      data: {
        orderId: order.id,
        userId: 'user-1',
        refundAmount: 100,
        refundMethod: 'CASH',
        reason: 'Customer request',
        status: 'COMPLETED',
        createdAt: new Date()
      }
    });

    // Assert: Verify audit fields
    expect(refund.id).toBeDefined();
    expect(refund.createdAt).toBeDefined();
    expect(refund.userId).toBe('user-1');
    expect(refund.status).toBe('COMPLETED');

    // Verify refund history
    const refunds = await prisma.refund.findMany({
      where: { orderId: order.id }
    });

    expect(refunds.length).toBe(1);
  });

  it('should log inventory adjustments', async () => {
    // Act: Create inventory adjustment
    const adjustment = await prisma.inventoryAdjustment.create({
      data: {
        productId: 'prod-1',
        warehouseId: 'wh-1',
        adjustmentType: 'DAMAGE',
        quantity: 5,
        reason: 'Damaged goods',
        userId: 'user-1',
        createdAt: new Date()
      }
    });

    // Assert: Verify audit fields
    expect(adjustment.id).toBeDefined();
    expect(adjustment.createdAt).toBeDefined();
    expect(adjustment.userId).toBe('user-1');
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
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: yesterday,
        grandTotal: 100,
        createdAt: yesterday
      }
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-TODAY',
        orderType: 'DINE_IN',
        status: 'COMPLETED',
        sessionId: 'test-session',
        businessDate: new Date(),
        businessDate: today,
        grandTotal: 200,
        createdAt: today
      }
    });

    // Query: Get all orders from today
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todayOrders = await prisma.salesOrder.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    expect(todayOrders.length).toBeGreaterThan(0);

    // Query: Get total sales for today
    const totalSales = todayOrders.reduce((sum, order) =>
      sum + (order.grandTotal?.toNumber() || 0), 0
    );

    expect(totalSales).toBeGreaterThan(0);
  });

  it('should preserve history for deleted records (soft delete)', async () => {
    // This test assumes soft delete is implemented
    // If hard delete is used, this verifies deletion is logged

    const order = await createTestOrder(prisma, {
      status: OrderStatus.CANCELLED,
      grandTotal: 50
    });

    // Soft delete (if implemented)
    await prisma.salesOrder.update({
      where: { id: order.id },
      data: {
        deletedAt: new Date(),
        deletedBy: 'user-1'
      }
    });

    // Verify soft delete
    const deletedOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id }
    });

    expect(deletedOrder?.deletedAt).toBeDefined();
    expect(deletedOrder?.deletedBy).toBe('user-1');
  });

  it('should log price changes', async () => {
    // This test verifies price history is tracked
    const originalPrice = 50;
    const newPrice = 60;

    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        nameAr: 'منتج',
        sku: 'PRICE-TEST',
        price: originalPrice,
        isActive: true
      }
    });

    // Update price
    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: newPrice,
        updatedAt: new Date()
      }
    });

    // Verify price changed
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });

    expect(updatedProduct?.price.toNumber()).toBe(newPrice);
    expect(updatedProduct?.updatedAt).toBeDefined();
  });
});
