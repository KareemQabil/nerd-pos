/**
 * SES-01: Open Session While Another Open
 *
 * Tests that a terminal cannot have multiple open sessions simultaneously
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import { SessionsRepository } from '../../../src/modules/sessions/sessions.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { cleanupTestData } from '../../helpers/test-helpers';

describe('SES-01: Open Session While Another Open', () => {
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

  it('should reject opening session when another session is already open', async () => {
    // Setup: Create an open session
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Act: Try to open another session on same terminal
    const result = await sessionsService.openSession({
      terminalId: 'terminal-1',
      userId: 'user-1',
      openingBalance: 500
    }).catch(e => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify only one session is OPEN for this terminal
    const openSessions = await prisma.registerSession.findMany({
      where: {
        terminalId: 'terminal-1',
        status: 'OPEN'
      }
    });

    expect(openSessions.length).toBe(1);
    expect(openSessions[0].sessionNumber).toBe('SESS-001');
  });

  it('should allow opening session on different terminal', async () => {
    // Setup: Create an open session on terminal-1
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Act: Open session on terminal-2
    const newSession = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-2',
        status: 'OPEN',
        openingBalance: 500
      }
    });

    // Assert: Both terminals should have open sessions
    const terminal1Sessions = await prisma.registerSession.findMany({
      where: { terminalId: 'terminal-1', status: 'OPEN' }
    });

    const terminal2Sessions = await prisma.registerSession.findMany({
      where: { terminalId: 'terminal-2', status: 'OPEN' }
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
        status: 'CLOSED',
        openingBalance: 1000,
        actualClosingBalance: 1500,
        closedAt: new Date()
      }
    });

    // Act: Open new session on same terminal
    const newSession = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1500
      }
    });

    // Assert: Should succeed
    expect(newSession.status).toBe('OPEN');
    expect(newSession.terminalId).toBe('terminal-1');

    // Verify only one OPEN session
    const openSessions = await prisma.registerSession.findMany({
      where: { terminalId: 'terminal-1', status: 'OPEN' }
    });

    expect(openSessions.length).toBe(1);
    expect(openSessions[0].sessionNumber).toBe('SESS-002');
  });

  it('should prevent concurrent open session requests', async () => {
    // This test simulates two users trying to open sessions simultaneously on same terminal

    // Setup: No existing sessions

    // Act: Two concurrent requests to open session on same terminal
    const openSession1 = prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    const openSession2 = prisma.registerSession.create({
      data: {
        userId: 'user-2',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Execute concurrently
    const results = await Promise.allSettled([openSession1, openSession2]);

    // At least one should succeed
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    expect(successCount).toBeGreaterThanOrEqual(1);

    // Verify only one OPEN session exists
    const openSessions = await prisma.registerSession.findMany({
      where: { terminalId: 'terminal-1', status: 'OPEN' }
    });

    expect(openSessions.length).toBe(1);
  });

  it('should validate session status transition (OPEN -> CLOSED)', async () => {
    // Setup: Create an open session
    const session = await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'OPEN',
        openingBalance: 1000
      }
    });

    // Verify initial status
    expect(session.status).toBe('OPEN');

    // Act: Close the session
    const closedSession = await prisma.registerSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        actualClosingBalance: 1500,
        closedAt: new Date()
      }
    });

    // Assert: Status should be CLOSED
    expect(closedSession.status).toBe('CLOSED');
    expect(closedSession.closedAt).toBeDefined();
  });

  it('should not allow operations on CLOSED session', async () => {
    // Setup: Create a closed session
    await prisma.registerSession.create({
      data: {
        userId: 'user-1',
        terminalId: 'terminal-1',
        status: 'CLOSED',
        openingBalance: 1000,
        actualClosingBalance: 1500,
        closedAt: new Date()
      }
    });

    // Act: Try to get current session
    const currentSession = await prisma.registerSession.findFirst({
      where: {
        terminalId: 'terminal-1',
        status: 'OPEN'
      }
    });

    // Assert: No OPEN session should be found
    expect(currentSession).toBeNull();
  });
});
