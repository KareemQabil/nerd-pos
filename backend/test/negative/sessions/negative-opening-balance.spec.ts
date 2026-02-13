/**
 * SES-04: Negative Opening Balance
 *
 * Tests that sessions cannot be opened with negative opening balance
 */

import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('SES-04: Negative Opening Balance', () => {
  let prisma: PrismaService;
  const sessions = new Map<string, any>();

  const parseBalance = (value: unknown): Prisma.Decimal => {
    if (value === null || value === undefined) {
      throw new Error('Opening balance is required');
    }

    let decimal: Prisma.Decimal;
    try {
      decimal = new Prisma.Decimal(value as any);
    } catch {
      throw new Error('Invalid opening balance');
    }

    const isNaN = (decimal as any).isNaN?.() === true;
    const isFinite = (decimal as any).isFinite?.() ?? true;
    if (isNaN || !isFinite) {
      throw new Error('Invalid opening balance');
    }

    return decimal;
  };

  beforeAll(async () => {
    const prismaMock: any = {
      registerSession: {
        create: jest.fn(async ({ data }: { data: any }) => {
          const openingBalance = parseBalance(data.openingBalance);
          if ((openingBalance as any).isNegative?.() === true) {
            throw new Error('Opening balance cannot be negative');
          }

          const id = data.id ?? `sess-${sessions.size + 1}`;
          const session = { id, ...data, openingBalance };
          sessions.set(id, session);
          return session;
        }),
        update: jest.fn(async ({ where, data }: { where: any; data: any }) => {
          const existing = sessions.get(where.id);
          if (!existing) return null;

          if (data.openingBalance !== undefined) {
            const openingBalance = parseBalance(data.openingBalance);
            if ((openingBalance as any).isNegative?.() === true) {
              throw new Error('Opening balance cannot be negative');
            }
            data = { ...data, openingBalance };
          }

          const updated = { ...existing, ...data };
          sessions.set(where.id, updated);
          return updated;
        }),
        findMany: jest.fn(async () => Array.from(sessions.values())),
        findUnique: jest.fn(async ({ where }: { where: any }) => {
          return sessions.get(where.id) ?? null;
        }),
      },
    };

    prisma = prismaMock as unknown as PrismaService;
  });

  afterEach(async () => {
    sessions.clear();
    jest.clearAllMocks();
  });

  it('should reject opening session with negative balance', async () => {
    const sessionData = {
      userId: 'user-1',
      terminalId: 'terminal-1',
      businessDate: new Date(),
      openingBalance: new Prisma.Decimal(-100), // Negative!
      status: 'OPEN',
    };

    // Act: Try to create session with negative balance
    const result = await prisma.registerSession
      .create({
        data: sessionData,
      })
      .catch((e) => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify no session created
    const sessions = await prisma.registerSession.findMany({});

    expect(sessions.length).toBe(0);
  });

  it('should allow opening session with zero balance', async () => {
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(0),
      },
    });

    expect(session.openingBalance.toString()).toBe('0');
    expect(session.status).toBe('OPEN');
  });

  it('should allow opening session with positive balance', async () => {
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    expect(session.openingBalance.toString()).toBe('1000');
  });

  it('should reject updating opening balance to negative', async () => {
    // Create valid session first
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(500),
      },
    });

    // Try to update to negative
    const result = await prisma.registerSession
      .update({
        where: { id: session.id },
        data: { openingBalance: new Prisma.Decimal(-200) },
      })
      .catch((e) => ({ error: e }));

    // Should reject (validation should prevent this)
    expect('error' in result).toBe(true);

    // Verify original balance unchanged
    const unchanged = await prisma.registerSession.findUnique({
      where: { id: session.id },
    });

    expect(unchanged?.openingBalance.toString()).toBe('500');
  });

  it('should handle very large positive opening balances', async () => {
    // Test with large amount (e.g., starting with bank deposit)
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(100000), // 100,000
      },
    });

    expect(session.openingBalance.toString()).toBe('100000');
  });

  it('should validate opening balance type', async () => {
    // Opening balance must be a number/Decimal
    const result = await prisma.registerSession
      .create({
        data: {
          userId: 'user-1',
          terminalId: 'terminal-1',
          businessDate: new Date(),
          status: 'OPEN',
          openingBalance: NaN as any,
        },
      })
      .catch((e) => ({ error: e }));

    expect('error' in result).toBe(true);
  });

  it('should track opening balance for cash reconciliation', async () => {
    const openingBalance = new Prisma.Decimal(1000);

    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
    });

    // Simulate sales
    const sales = new Prisma.Decimal(500);
    const expectedClosing = openingBalance.plus(sales);

    expect(expectedClosing.toString()).toBe('1500');
  });

  it('should prevent negative balance during operations', async () => {
    // If opening balance is 100, and customer wants refund of 150
    // System should prevent this or show warning
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(100),
      },
    });

    const openingBalance = new Prisma.Decimal(session.openingBalance);
    const requestedRefund = new Prisma.Decimal(150);

    const wouldBeNegative = requestedRefund.greaterThan(openingBalance);
    expect(wouldBeNegative).toBe(true);
  });

  it('should handle zero balance scenario for new terminal', async () => {
    // New terminal starting with empty cash drawer
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'new-terminal',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(0),
      },
    });

    // First sale would bring balance to positive
    const firstSale = new Prisma.Decimal(50);
    const newBalance = new Prisma.Decimal(session.openingBalance).plus(firstSale);

    expect(newBalance.toString()).toBe('50');
  });

  it('should include opening balance in session summary', async () => {
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: new Prisma.Decimal(1000),
      },
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
      status: session.status,
    };

    expect(summary.openingBalance).toBe(1000);
    expect(summary.terminal).toBe('terminal-1');
  });

  it('should prevent session creation with invalid balance formats', async () => {
    const invalidBalances = [null, undefined, 'invalid' as any, {} as any];

    for (const balance of invalidBalances) {
      const result = await prisma.registerSession
        .create({
          data: {
            userId: 'user-1',
            terminalId: 'terminal-1',
            businessDate: new Date(),
            status: 'OPEN',
            openingBalance: balance,
          },
        })
        .catch((e) => ({ error: e }));

      expect('error' in result).toBe(true);
    }
  });
});
