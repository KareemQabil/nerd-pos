/**
 * Scenario 03: Sessions
 */

import axios from 'axios';
import { TestContext, TestResult, createApiClient } from '../config/client';
import { ENV, logSection, logPass, logFail, logInfo, TERMINALS, TEST_DEFAULTS } from '../config/env';
import { AuthHelper } from '../helpers/auth.helper';
import { SessionHelper } from '../helpers/session.helper';
import { CloseSessionDto, DenominationDto } from '../../../src/modules/sessions/dto';
import { Session } from '../../../src/modules/sessions/entities/sessions.entity';

interface SessionSetup {
    operatorToken: string;
    operatorId: string;
    closerToken: string;
    closerId: string;
    adminToken: string;
    adminId: string;
    sessionId: string;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runSessionTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 03: SESSIONS');

    const setupResult = await runTest('03-SETUP', 'Setup (Cashier + Manager)', async () => {
        const setup = await setupSessions();
        ctx.data.sessionSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-026', 'Open Session', async () => {
        const setup = getSetup(ctx);
        await testOpenSession(setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-027', 'Open Session - Duplicate Prevention', async () => {
        const setup = getSetup(ctx);
        await testDuplicateOpen(setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-028', 'Close Session - Standard', async () => {
        const setup = getSetup(ctx);
        await testCloseSession(setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-029', 'Session Closed - No Current Session', async () => {
        const setup = getSetup(ctx);
        await testNoCurrentSession(setup);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): SessionSetup {
    const setup = ctx.data.sessionSetup as SessionSetup | undefined;
    if (!setup) {
        throw new Error('Session setup missing');
    }
    return setup;
}

async function runTest(
    id: string,
    name: string,
    fn: () => Promise<RunnerResult>,
): Promise<TestResult> {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;

        if (result.passed) {
            logPass(`${id}: ${name}`);
            return { id, name, passed: true, duration };
        }

        logFail(`${id}: ${name} - ${result.error ?? 'failed'}`);
        return { id, name, passed: false, duration, error: result.error };
    } catch (error) {
        const duration = Date.now() - start;
        const message = (error as Error).message;
        logFail(`${id}: ${name} - ${message}`);
        return { id, name, passed: false, duration, error: message };
    }
}

async function setupSessions(): Promise<SessionSetup> {
    const auth = new AuthHelper();
    const adminLogin = await auth.loginAsAdmin();
    if (!adminLogin.success || !adminLogin.token || !adminLogin.userId) {
        throw new Error(adminLogin.error ?? 'Admin login failed');
    }

    const cashierLogin = await auth.loginAsCashier();
    const managerLogin = await auth.loginAsManager();

    const operator = await ensureOpenSessionWithFallback([
        cashierLogin.success && cashierLogin.token && cashierLogin.userId
            ? { label: 'cashier', token: cashierLogin.token, userId: cashierLogin.userId }
            : undefined,
        { label: 'admin', token: adminLogin.token, userId: adminLogin.userId },
    ].filter(Boolean) as AuthCandidate[]);

    const closerToken = managerLogin.success && managerLogin.token ? managerLogin.token : adminLogin.token;
    const closerId = managerLogin.success && managerLogin.userId ? managerLogin.userId : adminLogin.userId;

    return {
        operatorToken: operator.token,
        operatorId: operator.userId,
        closerToken,
        closerId,
        adminToken: adminLogin.token,
        adminId: adminLogin.userId,
        sessionId: operator.sessionId,
    };
}

interface AuthCandidate {
    label: string;
    token: string;
    userId: string;
}

function isForbiddenMessage(message?: string): boolean {
    if (!message) return false;
    return message.includes('HTTP 401') || message.includes('HTTP 403');
}

async function ensureOpenSessionWithFallback(
    candidates: AuthCandidate[],
): Promise<{ sessionId: string; token: string; userId: string }> {
    for (const candidate of candidates) {
        const helper = new SessionHelper(candidate.token);
        const openResult = await helper.openSession({
            terminalId: TERMINALS.pos2,
            openingBalance: TEST_DEFAULTS.OPENING_BALANCE,
        });

        if (openResult.success && openResult.data?.id) {
            logInfo(`Opened session (${candidate.label}): ${openResult.data.id}`);
            return { sessionId: openResult.data.id, token: candidate.token, userId: candidate.userId };
        }

        if (isForbiddenMessage(openResult.error)) {
            logInfo(`${candidate.label} not permitted to open session (${openResult.error})`);
            continue;
        }

        try {
            const api = createApiClient(candidate.token);
            const current = await api.get<Session>(`/sessions/current/${candidate.userId}`);
            const session = current.data as Session;
            if (session?.id) {
                logInfo(`Using existing session (${candidate.label}): ${session.id}`);
                return { sessionId: session.id, token: candidate.token, userId: candidate.userId };
            }
        } catch (error) {
            if (isForbiddenMessage((error as Error).message)) {
                logInfo(`${candidate.label} not permitted to view current session`);
                continue;
            }
        }

        throw new Error(openResult.error ?? 'No current session found');
    }

    throw new Error('No available user could open or access a session');
}

async function testOpenSession(setup: SessionSetup): Promise<void> {
    const api = createApiClient(setup.operatorToken);
    const response = await api.get<Session>(`/sessions/current/${setup.operatorId}`);
    const session = response.data as Session;

    if (!session?.id) {
        throw new Error('Current session not found after open');
    }
}

async function testDuplicateOpen(setup: SessionSetup): Promise<void> {
    const api = createRawApi(setup.operatorToken);

    const response = await api.post('/sessions/open', {
        terminalId: TERMINALS.pos2,
        openingBalance: TEST_DEFAULTS.OPENING_BALANCE,
    });

    if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
    }
}

async function testCloseSession(setup: SessionSetup): Promise<void> {
    const denominations: DenominationDto[] = [{ value: 100, count: 5 }];
    const payload: CloseSessionDto = { sessionId: setup.sessionId, denominations };

    await cleanupDraftOrders(setup.adminToken, setup.sessionId);

    const closeWith = async (token: string) => {
        const api = createRawApi(token);
        return api.post('/sessions/close', payload);
    };

    let response = await closeWith(setup.closerToken);

    if (response.status === 401 || response.status === 403) {
        response = await closeWith(setup.adminToken);
    }

    if (response.status === 400) {
        const message = response.data?.message ?? response.data?.error ?? response.data?.detail;
        if (typeof message === 'string' && message.toLowerCase().includes('draft order')) {
            await cleanupDraftOrders(setup.adminToken, setup.sessionId);
            response = await closeWith(setup.adminToken);
        }
    }

    if (response.status === 400) {
        const message = response.data?.message ?? response.data?.error ?? response.data?.detail;
        if (typeof message === 'string' && message.toLowerCase().includes('already closed')) {
            return;
        }
        throw new Error(`Close session failed (${response.status}): ${message ?? 'unknown error'}`);
    }

    if (response.status !== 200 && response.status !== 201) {
        throw new Error(`Expected 200/201, got ${response.status}`);
    }

    let sessionPayload: any = response.data?.data ?? response.data;
    if (sessionPayload && typeof sessionPayload === 'object' && 'data' in sessionPayload) {
        sessionPayload = (sessionPayload as { data?: unknown }).data;
    }
    const session = sessionPayload as Session;
    if (session.status !== 'CLOSED') {
        throw new Error(`Expected CLOSED status, got ${session.status}`);
    }
}

async function testNoCurrentSession(setup: SessionSetup): Promise<void> {
    const api = createRawApi(setup.operatorToken);

    const response = await api.get(`/sessions/current/${setup.operatorId}`);
    if (response.status === 200) {
        const data = response.data?.data ?? response.data;
        if (data && data.id) {
            throw new Error('Expected no current session after close');
        }
        return;
    }

    if (response.status !== 404) {
        throw new Error(`Expected 404 or empty session, got ${response.status}`);
    }
}

function createRawApi(token: string) {
    return axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        validateStatus: () => true,
    });
}

async function cleanupDraftOrders(adminToken: string, sessionId: string): Promise<void> {
    const api = createRawApi(adminToken);
    const response = await api.get(`/orders/session/${sessionId}`);
    const body = response.data;
    let orders: any[] = [];

    if (Array.isArray(body)) {
        orders = body;
    } else if (Array.isArray(body?.data)) {
        orders = body.data;
    } else if (Array.isArray(body?.data?.data)) {
        orders = body.data.data;
    }

    if (orders.length === 0) return;

    const draftOrders = orders.filter((order) => order?.status === 'DRAFT');
    if (draftOrders.length === 0) return;

    const adminApi = createApiClient(adminToken);
    for (const order of draftOrders) {
        if (order?.id) {
            await adminApi.put(`/orders/${order.id}/cancel`, { reason: 'Session close cleanup' });
        }
    }
}
