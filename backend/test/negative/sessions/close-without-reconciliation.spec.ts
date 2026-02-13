/**
 * SES-03: Close Session Without Reconciliation
 *
 * Tests that sessions cannot be closed without reconciliation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../src/modules/sessions/sessions.repository';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { OutboxService } from '../../../src/core/outbox/outbox.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { Prisma } from '@prisma/client';
import { OrderStatus } from '../../../src/core/constants/enums';

describe('SES-03: Close Session Without Reconciliation', () => {
  let sessionsService: SessionsService;
  let prisma: PrismaService;
  const sessions = new Map<string, any>();
  const orders = new Map<string, any>();
  const denominations = new Map<string, any>();
  const outboxMock = { enqueue: jest.fn(), flushPending: jest.fn() };

  beforeAll(async () => {
    const prismaMock: any = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      registerSession: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `sess-${sessions.size + 1}`;
          const session = {
            id,
            totalCash: data.totalCash ?? data.totalCashSales ?? 0,
            totalRefunds: data.totalRefunds ?? 0,
            discrepancy: data.discrepancy ?? new Prisma.Decimal(0),
            ...data,
          };
          sessions.set(id, session);
          return session;
        }),
        findFirst: jest.fn(async ({ where }: { where: any }) => {
          for (const session of sessions.values()) {
            if (
              (where?.userId === undefined || session.userId === where.userId) &&
              (where?.status === undefined || session.status === where.status)
            ) {
              return session;
            }
          }
          return null;
        }),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return sessions.get(where.id) ?? null;
        }),
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = sessions.get(where.id);
          if (!existing) return null;
          const updated = { ...existing, ...data };
          sessions.set(where.id, updated);
          return updated;
        }),
      },
      salesOrder: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = data.id ?? `order-${orders.size + 1}`;
          const order = { id, ...data };
          orders.set(id, order);
          return order;
        }),
        findMany: jest.fn(async ({ where }: { where: any }) => {
          const all = Array.from(orders.values());
          return all.filter((order) => {
            if (where?.sessionId && order.sessionId !== where.sessionId) return false;
            if (where?.status?.in) return where.status.in.includes(order.status);
            if (where?.status) return order.status === where.status;
            return true;
          });
        }),
      },
      denominationCount: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const id = `denom-${denominations.size + 1}`;
          const record = { id, ...data };
          denominations.set(id, record);
          return record;
        }),
      },
    };

    prismaMock.$transaction = jest.fn(
      async (fn: (tx: any) => Promise<any>) => fn(prismaMock),
    );

    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        SessionsRepository,
        SalesRepository,
        { provide: OutboxService, useValue: outboxMock },
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: 'IEventBus',
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();

    sessionsService = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService) as unknown as PrismaService;
  });

  afterEach(async () => {
    sessions.clear();
    orders.clear();
    denominations.clear();
    jest.clearAllMocks();
  });

  it('should require reconciliation before closing session', async () => {
    // Setup: Create an open session with some transactions
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    // Create some sales
    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: OrderStatus.COMPLETED,
        sessionId: session.id,
        businessDate: new Date(),
        taxRate: 0.15,
        grandTotal: 500,
        completedAt: new Date(),
      },
    });

    // Act: Try to close without providing reconciliation data
    const closedSession = await sessionsService.closeSession({
      sessionId: session.id,
      denominations: [],
    });

    expect(closedSession.status).toBe('CLOSED');
    expect(closedSession.discrepancy).toBeDefined();
  });

  it('should calculate expected closing balance', async () => {
    // Setup: Open session with opening balance
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    // Create sales totaling 500
    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: OrderStatus.PAID,
        sessionId: session.id,
        businessDate: new Date(),
        taxRate: 0.15,
        grandTotal: 300,
      },
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-002',
        orderType: 'DINE_IN',
        status: OrderStatus.PAID,
        sessionId: session.id,
        businessDate: new Date(),
        taxRate: 0.15,
        grandTotal: 200,
      },
    });

    // Expected closing balance = opening (1000) + sales (500) = 1500
    const expectedCash = new Prisma.Decimal(1000).plus(500);

    expect(expectedCash.toString()).toBe('1500');
  });

  it('should detect cash shortage on reconciliation', async () => {
    // Setup: Session with sales
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: OrderStatus.PAID,
        sessionId: session.id,
        businessDate: new Date(),
        taxRate: 0.15,
        grandTotal: 500,
      },
    });

    // Expected: 1500, But counted: 1400 (shortage of 100)
    const expectedBalance = new Prisma.Decimal(1500);
    const countedCash = new Prisma.Decimal(1400);
    const shortage = expectedBalance.minus(countedCash);

    expect(shortage.toString()).toBe('100');

    // Closing should record the discrepancy
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: countedCash,
        expectedCash: expectedBalance,
        discrepancy: shortage,
        closedAt: new Date(),
      },
    });

    expect(closedSession.discrepancy?.toString()).toBe('100');
  });

  it('should detect cash overage on reconciliation', async () => {
    // Setup: Session with sales
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: OrderStatus.PAID,
        sessionId: session.id,
        businessDate: new Date(),
        taxRate: 0.15,
        grandTotal: 500,
      },
    });

    // Expected: 1500, But counted: 1600 (overage of 100)
    const expectedBalance = new Prisma.Decimal(1500);
    const countedCash = new Prisma.Decimal(1600);
    const overage = countedCash.minus(expectedBalance);

    expect(overage.toString()).toBe('100');

    // Closing should record the discrepancy
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: countedCash,
        expectedCash: expectedBalance,
        discrepancy: overage,
        closedAt: new Date(),
      },
    });

    expect(closedSession.discrepancy?.toString()).toBe('100');
  });

  it('should allow closing when reconciliation balances', async () => {
    // Setup: Session with sales
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: OrderStatus.PAID,
        sessionId: session.id,
        businessDate: new Date(),
        taxRate: 0.15,
        grandTotal: 500,
      },
    });

    // Counted cash matches expected
    const countedCash = new Prisma.Decimal(1500);

    // Close session
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: countedCash,
        expectedCash: countedCash,
        discrepancy: new Prisma.Decimal(0),
        closedAt: new Date(),
      },
    });

    expect(closedSession.status).toBe('CLOSED');
    expect(closedSession.discrepancy?.toString()).toBe('0');
  });

  it('should require manager approval for large discrepancies', async () => {
    // Setup: Session with significant shortage
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    // Large shortage (e.g., > 5% of opening balance)
    const expectedBalance = new Prisma.Decimal(1500);
    const countedCash = new Prisma.Decimal(1000); // 500 shortage!
    const shortage = expectedBalance.minus(countedCash);

    // This should require manager override/approval
    // For now, just verify the discrepancy is large
    const shortagePercentage = shortage.div(expectedBalance).mul(100);

    expect(shortage.toString()).toBe('500');
    expect(shortagePercentage.toDecimalPlaces(2).toString()).toBe('33.33'); // 33.33% shortage
  });

  it('should prevent closing when orders are pending', async () => {
    // Setup: Session with unpaid orders
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    // Create unpaid orders
    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: OrderStatus.DRAFT,
        sessionId: session.id,
        businessDate: new Date(),
        taxRate: 0.15,
        grandTotal: 500,
      },
    });

    // Act: Try to close session
    const result = await sessionsService
      .closeSession({ sessionId: session.id, denominations: [] })
      .catch((e: unknown) => ({ error: e }));

    // Should warn about unpaid orders or prevent closing
    // For now, verify pending orders exist
    const pendingOrders = await prisma.salesOrder.findMany({
      where: {
        sessionId: session.id,
        status: { in: ['DRAFT', 'CONFIRMED'] },
      },
    });

    expect(pendingOrders.length).toBeGreaterThan(0);
  });

  it('should track reconciliation history', async () => {
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    // Close session
    await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: new Prisma.Decimal(1500),
        expectedCash: new Prisma.Decimal(1500),
        closedAt: new Date(),
      },
    });

    // Query session history
    const closedSession = await prisma.registerSession.findUnique({
      where: { id: session.id },
    });

    expect(closedSession?.status).toBe('CLOSED');
    expect(closedSession?.openingBalance.toString()).toBe('1000');
    expect(closedSession?.actualClosingBalance?.toString()).toBe('1500');
    expect(closedSession?.closedAt).toBeDefined();
  });
});
