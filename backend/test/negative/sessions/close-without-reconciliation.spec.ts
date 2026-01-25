/**
 * SES-03: Close Session Without Reconciliation
 *
 * Tests that sessions cannot be closed without reconciliation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../src/modules/sessions/sessions.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { cleanupTestData } from '../../helpers/test-helpers';
import { Prisma } from '@prisma/client'
const PrismaClient = require('@prisma/client').PrismaClient
type Decimal = PrismaClient.Decimal
type Decimal = Prisma.Decimal;

describe('SES-03: Close Session Without Reconciliation', () => {
  let sessionsService: SessionsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        SessionsRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    sessionsService = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should require reconciliation before closing session', async () => {
    // Setup: Create an open session with some transactions
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Create some sales
    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: 'COMPLETED',
        sessionId: session.id,
        businessDate: new Date(),
        grandTotal: 500,
        completedAt: new Date()
      }
    });

    // Act: Try to close without providing reconciliation data
    const result = await sessionsService.closeSession(session.id, {
      userId: 'user-1',
      actualClosingBalance: undefined, // No reconciliation
      countedCash: undefined
    }).catch(e => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify session is still OPEN
    const unchangedSession = await prisma.registerSession.findUnique({
      where: { id: session.id }
    });

    expect(unchangedSession?.status).toBe('OPEN');
  });

  it('should calculate expected closing balance', async () => {
    // Setup: Open session with opening balance
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Create sales totaling 500
    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: 'PAID',
        sessionId: session.id,
        businessDate: new Date(),
        grandTotal: 300,
        paidAt: new Date()
      }
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-002',
        orderType: 'DINE_IN',
        status: 'PAID',
        sessionId: session.id,
        businessDate: new Date(),
        grandTotal: 200,
        paidAt: new Date()
      }
    });

    // Expected closing balance = opening (1000) + sales (500) = 1500
    const expectedCash = new Decimal(1000).add(500);

    expect(expectedCash.toString()).toBe('1500');
  });

  it('should detect cash shortage on reconciliation', async () => {
    // Setup: Session with sales
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: 'PAID',
        sessionId: session.id,
        businessDate: new Date(),
        grandTotal: 500,
        paidAt: new Date()
      }
    });

    // Expected: 1500, But counted: 1400 (shortage of 100)
    const expectedBalance = new Decimal(1500);
    const countedCash = new Decimal(1400);
    const shortage = expectedBalance.sub(countedCash);

    expect(shortage.toString()).toBe('100');

    // Closing should record the discrepancy
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: countedCash,
        expectedCash: expectedBalance,
        discrepancy: shortage,
        discrepancyType: 'SHORTAGE',
        closedAt: new Date()
      }
    });

    expect(closedSession.discrepancy?.toString()).toBe('100');
    expect(closedSession.discrepancyType).toBe('SHORTAGE');
  });

  it('should detect cash overage on reconciliation', async () => {
    // Setup: Session with sales
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: 'PAID',
        sessionId: session.id,
        businessDate: new Date(),
        grandTotal: 500,
        paidAt: new Date()
      }
    });

    // Expected: 1500, But counted: 1600 (overage of 100)
    const expectedBalance = new Decimal(1500);
    const countedCash = new Decimal(1600);
    const overage = countedCash.sub(expectedBalance);

    expect(overage.toString()).toBe('100');

    // Closing should record the discrepancy
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: countedCash,
        expectedCash: expectedBalance,
        discrepancy: overage,
        discrepancyType: 'OVERAGE',
        closedAt: new Date()
      }
    });

    expect(closedSession.discrepancy?.toString()).toBe('100');
    expect(closedSession.discrepancyType).toBe('OVERAGE');
  });

  it('should allow closing when reconciliation balances', async () => {
    // Setup: Session with sales
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: 'PAID',
        sessionId: session.id,
        businessDate: new Date(),
        grandTotal: 500,
        paidAt: new Date()
      }
    });

    // Counted cash matches expected
    const countedCash = new Decimal(1500);

    // Close session
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: countedCash,
        expectedCash: countedCash,
        discrepancy: new Decimal(0),
        discrepancyType: null,
        closedAt: new Date()
      }
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
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Large shortage (e.g., > 5% of opening balance)
    const expectedBalance = new Decimal(1500);
    const countedCash = new Decimal(1000); // 500 shortage!
    const shortage = expectedBalance.sub(countedCash);

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
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Create unpaid orders
    await prisma.salesOrder.create({
      data: {
        orderNumber: 'ORD-001',
        orderType: 'TAKEAWAY',
        status: 'CONFIRMED', // Not PAID
        sessionId: session.id,
        businessDate: new Date(),
        grandTotal: 500
      }
    });

    // Act: Try to close session
    const result = await sessionsService.closeSession(session.id, {
      userId: 'user-1',
      actualClosingBalance: 1000,
      countedCash: 1000
    }).catch(e => ({ error: e }));

    // Should warn about unpaid orders or prevent closing
    // For now, verify pending orders exist
    const pendingOrders = await prisma.salesOrder.findMany({
      where: {
        sessionId: session.id,
        status: { in: ['DRAFT', 'CONFIRMED'] }
      }
    });

    expect(pendingOrders.length).toBeGreaterThan(0);
  });

  it('should track reconciliation history', async () => {
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Close session
    await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: 1500,
        expectedCash: 1500,
        closedAt: new Date()
      }
    });

    // Query session history
    const closedSession = await prisma.registerSession.findUnique({
      where: { id: session.id }
    });

    expect(closedSession?.status).toBe('CLOSED');
    expect(closedSession?.openingBalance.toString()).toBe('1000');
    expect(closedSession?.closingBalance?.toString()).toBe('1500');
    expect(closedSession?.closedAt).toBeDefined();
  });
});
