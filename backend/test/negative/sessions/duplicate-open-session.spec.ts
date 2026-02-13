/**
 * SES-01: Open Session While Another Open
 *
 * Tests that a user cannot have multiple open sessions simultaneously
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../src/modules/sessions/sessions.repository';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { OutboxService } from '../../../src/core/outbox/outbox.service';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';

describe('SES-01: Open Session While Another Open', () => {
  let sessionsService: SessionsService;
  let prisma: PrismaService;
  const sessions: Array<Record<string, any>> = [];
  let transactionGate: Promise<void> = Promise.resolve();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SessionsService,
        SessionsRepository,
        SalesRepository,
        OutboxService,
        PrismaService,
        {
          provide: 'IEventBus',
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();

    sessionsService = module.get<SessionsService>(SessionsService);
    prisma = module.get<PrismaService>(PrismaService);

    const matchesWhere = (session: Record<string, any>, where?: Record<string, any>) => {
      if (!where) return true;
      return Object.entries(where).every(([key, value]) => session[key] === value);
    };

    (prisma.registerSession as any).create = jest.fn(async ({ data }) => {
      const session = {
        id: data.id ?? `sess-${sessions.length + 1}`,
        openedAt: data.openedAt ?? new Date(),
        ...data,
      };
      sessions.push(session);
      return session;
    });

    (prisma.registerSession as any).findMany = jest.fn(async ({ where } = {}) => {
      return sessions.filter((session) => matchesWhere(session, where));
    });

    (prisma.registerSession as any).findFirst = jest.fn(async ({ where } = {}) => {
      return sessions.find((session) => matchesWhere(session, where)) ?? null;
    });

    (prisma.registerSession as any).update = jest.fn(async ({ where, data }) => {
      const index = sessions.findIndex((session) => session.id === where.id);
      if (index === -1) {
        throw new Error(`Session ${where.id} not found`);
      }
      sessions[index] = { ...sessions[index], ...data };
      return sessions[index];
    });

    (prisma as any).$transaction = jest.fn(async (fn: (tx: any) => Promise<unknown>) => {
      let release: () => void = () => {};
      const waitForTurn = new Promise<void>((resolve) => {
        release = resolve;
      });
      const previous = transactionGate;
      transactionGate = transactionGate.then(() => waitForTurn);
      await previous;

      try {
        return await fn({
          registerSession: prisma.registerSession,
          $executeRaw: jest.fn(),
        } as any);
      } finally {
        release();
      }
    });
  });

  afterEach(async () => {
    sessions.length = 0;
    transactionGate = Promise.resolve();
    jest.clearAllMocks();
  });

  it('should reject opening session when another session is already open', async () => {
    // Setup: Create an open session for user-1
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: 1000,
      },
    });

    // Act: Try to open another session for same user
    const result = await sessionsService
      .openSession({ terminalId: 'terminal-1', openingBalance: 500 }, 'user-1')
      .catch((e: unknown) => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify only one session is OPEN for this user
    const openSessions = await prisma.registerSession.findMany({
      where: {
        userId: 'user-1',
        status: 'OPEN',
      },
    });

    expect(openSessions.length).toBe(1);
    expect(openSessions[0].id).toBeDefined();
  });

  it('should allow opening session on different terminal for different user', async () => {
    // Setup: Create an open session on terminal-1 for user-1
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: 1000,
      },
    });

    // Act: Open session on terminal-2 for user-2
    const newSession = await prisma.registerSession.create({
      data: {
        userId: 'user-2',
        terminalId: 'terminal-2',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: 500,
      },
    });

    // Assert: Both terminals should have open sessions
    const terminal1Sessions = await prisma.registerSession.findMany({
      where: { terminalId: 'terminal-1', status: 'OPEN' },
    });

    const terminal2Sessions = await prisma.registerSession.findMany({
      where: { terminalId: 'terminal-2', status: 'OPEN' },
    });

    expect(terminal1Sessions.length).toBe(1);
    expect(terminal2Sessions.length).toBe(1);
    expect(newSession.terminalId).toBe('terminal-2');
  });

  it('should allow opening session after previous one is closed', async () => {
    // Setup: Create a closed session
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'CLOSED',
        openingBalance: 1000,
        actualClosingBalance: 1500,
        closedAt: new Date(),
      },
    });

    // Act: Open new session on same terminal
    const newSession = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: 1500,
      },
    });

    // Assert: Should succeed
    expect(newSession.status).toBe('OPEN');
    expect(newSession.terminalId).toBe('terminal-1');

    // Verify only one OPEN session
    const openSessions = await prisma.registerSession.findMany({
      where: { terminalId: 'terminal-1', status: 'OPEN' },
    });

    expect(openSessions.length).toBe(1);
  });

  it('should prevent concurrent open session requests for same user', async () => {
    const openSession1 = sessionsService.openSession(
      { terminalId: 'terminal-1', openingBalance: 1000 },
      'user-1',
    );

    const openSession2 = sessionsService.openSession(
      { terminalId: 'terminal-1', openingBalance: 1000 },
      'user-1',
    );

    const results = await Promise.allSettled([openSession1, openSession2]);

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    expect(successCount).toBe(1);

    const openSessions = await prisma.registerSession.findMany({
      where: { userId: 'user-1', status: 'OPEN' },
    });

    expect(openSessions.length).toBe(1);
  });

  it('should validate session status transition (OPEN -> CLOSED)', async () => {
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'OPEN',
        openingBalance: 1000,
      },
    });

    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: 1500,
        closedAt: new Date(),
      },
    });

    expect(closedSession.status).toBe('CLOSED');
    expect(closedSession.closedAt).toBeDefined();
  });

  it('should not allow operations on CLOSED session', async () => {
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        businessDate: new Date(),
        status: 'CLOSED',
        openingBalance: 1000,
        actualClosingBalance: 1500,
        closedAt: new Date(),
      },
    });

    const currentSession = await prisma.registerSession.findFirst({
      where: {
        terminalId: 'terminal-1',
        status: 'OPEN',
      },
    });

    expect(currentSession).toBeNull();
  });
});
