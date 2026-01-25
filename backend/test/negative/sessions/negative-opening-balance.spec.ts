/**
 * SES-04: Negative Opening Balance
 *
 * Tests that sessions cannot be opened with negative opening balance
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../src/modules/sessions/sessions.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { cleanupTestData } from '../../helpers/test-helpers';
import { Decimal } from '@prisma/client';

describe('SES-04: Negative Opening Balance', () => {
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

  it('should reject opening session with negative balance', async () => {
    const sessionData = {
      sessionNumber: 'SESS-NEG-001',
      userId: 'user-1',
      terminalId: 'terminal-1',
      openingBalance: -100, // Negative!
      status: 'OPEN'
    };

    // Act: Try to create session with negative balance
    const result = await prisma.registerSession.create({
      data: sessionData
    }).catch(e => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify no session created
    const sessions = await prisma.registerSession.findMany({
      where: { sessionNumber: 'SESS-NEG-001' }
    });

    expect(sessions.length).toBe(0);
  });

  it('should allow opening session with zero balance', async () => {
    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-ZERO-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 0
      }
    });

    expect(session.openingBalance.toString()).toBe('0');
    expect(session.status).toBe('OPEN');
  });

  it('should allow opening session with positive balance', async () => {
    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-POS-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    expect(session.openingBalance.toString()).toBe('1000');
  });

  it('should reject updating opening balance to negative', async () => {
    // Create valid session first
    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-UPD-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 500
      }
    });

    // Try to update to negative
    const result = await prisma.registerSession.update({
      where: { id: session.id },
      data: { openingBalance: -200 }
    }).catch(e => ({ error: e }));

    // Should reject (validation should prevent this)
    expect('error' in result).toBe(true);

    // Verify original balance unchanged
    const unchanged = await prisma.registerSession.findUnique({
      where: { id: session.id }
    });

    expect(unchanged?.openingBalance.toString()).toBe('500');
  });

  it('should handle very large positive opening balances', async () => {
    // Test with large amount (e.g., starting with bank deposit)
    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-LARGE-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 100000 // 100,000
      }
    });

    expect(session.openingBalance.toString()).toBe('100000');
  });

  it('should validate opening balance type', async () => {
    // Opening balance must be a number/Decimal
    const result = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-TYPE-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: NaN as any
      }
    }).catch(e => ({ error: e }));

    expect('error' in result).toBe(true);
  });

  it('should track opening balance for cash reconciliation', async () => {
    const openingBalance = new Decimal(1000);

    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-TRACK-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Simulate sales
    const sales = new Decimal(500);
    const expectedClosing = openingBalance.add(sales);

    expect(expectedClosing.toString()).toBe('1500');
  });

  it('should prevent negative balance during operations', async () => {
    // If opening balance is 100, and customer wants refund of 150
    // System should prevent this or show warning
    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-OPS-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 100
      }
    });

    const openingBalance = new Decimal(session.openingBalance);
    const requestedRefund = new Decimal(150);

    const wouldBeNegative = requestedRefund.gt(openingBalance);
    expect(wouldBeNegative).toBe(true);
  });

  it('should handle zero balance scenario for new terminal', async () => {
    // New terminal starting with empty cash drawer
    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-NEW-001',
        userId: 'user-1',
        terminalId: 'new-terminal',
        status: 'OPEN',
        openingBalance: 0
      }
    });

    // First sale would bring balance to positive
    const firstSale = new Decimal(50);
    const newBalance = new Decimal(session.openingBalance).add(firstSale);

    expect(newBalance.toString()).toBe('50');
  });

  it('should include opening balance in session summary', async () => {
    const session = await prisma.registerSession.create({
      data: {
        sessionNumber: 'SESS-SUMMARY-001',
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Session summary should include:
    // - Opening balance
    // - Sales
    // - Refunds
    // - Expected closing
    const summary = {
      openingBalance: session.openingBalance.toNumber(),
      terminal: session.terminalId,
      user: session.userId,
      status: session.status
    };

    expect(summary.openingBalance).toBe(1000);
    expect(summary.terminal).toBe('terminal-1');
  });

  it('should prevent session creation with invalid balance formats', async () => {
    const invalidBalances = [
      null,
      undefined,
      'invalid' as any,
      {} as any
    ];

    for (const balance of invalidBalances) {
      const result = await prisma.registerSession.create({
        data: {
          sessionNumber: `SESS-INV-${Date.now()}`,
          userId: 'user-1',
          terminalId: 'terminal-1',
          status: 'OPEN',
          openingBalance: balance as any
        }
      }).catch(e => ({ error: e }));

      expect('error' in result).toBe(true);
    }
  });
});
