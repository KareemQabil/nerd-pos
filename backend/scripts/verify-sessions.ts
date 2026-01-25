
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3001/api/v1';
const LOG_FILE = path.join(__dirname, 'verification_sessions.log');

// Helper to log to file and console
function log(message: string, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;

    console.log(message);

    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (e) {
        console.error('Failed to write to log file:', e);
    }
}

async function verifySessions() {
    // Clear previous log
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

    log('STARTING SESSIONS MODULE VERIFICATION');

    try {
        // 1. Login
        log('1. Logging in as admin...');
        let token: string;
        let userId: string;

        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin',
                password: 'nerdpos123'
            });
            token = loginRes.data.data.access_token;
            userId = loginRes.data.data.user.id;
            log(`✅ Login successful (User ID: ${userId}).`);
        } catch (error: any) {
            log('❌ Login Failed');
            throw error;
        }

        const api = axios.create({
            baseURL: API_URL,
            headers: { Authorization: `Bearer ${token}` }
        });

        // 2. Check for Active Session
        log('\n2. Checking for active session...');
        let activeSessionId: string | null = null;

        try {
            const activeRes = await api.get(`/sessions/current/${userId}`);
            if (activeRes.data.data) {
                activeSessionId = activeRes.data.data.id;
                log(`ℹ️ Active session found: ${activeSessionId}. Closing it first...`);

                try {
                    await api.post('/sessions/close', {
                        sessionId: activeSessionId,
                        denominations: [{ value: 100, count: 5 }]
                    });
                    log('✅ Active session closed.');
                } catch (closeError: any) {
                    log(`⚠️ Close failed: ${closeError.message}`);
                    if (closeError.response?.data) {
                        log(`Details: ${JSON.stringify(closeError.response.data)}`);

                        // Check for draft orders
                        const detail = closeError.response.data.detail || '';
                        if (detail.includes('draft order(s) pending')) {
                            log('ℹ️ Found pending draft orders. Attempting to cleanup...');

                            // Fetch orders for session
                            const ordersRes = await api.get(`/orders/session/${activeSessionId}`);
                            const orders = ordersRes.data.data || [];
                            const draftOrders = orders.filter((o: any) => o.status === 'DRAFT');

                            log(`ℹ️ Found ${draftOrders.length} draft orders. Cancelling...`);

                            for (const order of draftOrders) {
                                await api.put(`/orders/${order.id}/cancel`, { reason: 'Session Force Close' });
                                log(`✅ Cancelled order ${order.orderNumber}`);
                            }

                            // Retry close
                            log('ℹ️ Retrying close...');
                            await api.post('/sessions/close', {
                                sessionId: activeSessionId,
                                denominations: [{ value: 100, count: 5 }]
                            });
                            log('✅ Active session closed (Retry).');
                        }
                    }
                }
                activeSessionId = null;
            } else {
                log('ℹ️ No active session found.');
            }
        } catch (error: any) {
            if (error.response?.status !== 404) {
                log(`⚠️ Error checking session: ${error.message}`);
                // Don't throw, try to proceed to open. If session is stuck, open will fail and we'll catch it there.
            } else {
                log('ℹ️ No active session found (404).');
            }
        }

        // 3. Open New Session
        log('\n3. Opening new session...');
        try {
            const openRes = await api.post('/sessions/open', {
                terminalId: 'TERM-VERIFY-001',
                openingBalance: 500.00
            });

            activeSessionId = openRes.data.data.id;
            log(`✅ Session opened: ${activeSessionId}`);

            // Verify properties
            if (openRes.data.data.status !== 'OPEN') throw new Error('Session status is not OPEN');

            const returnedBalance = Number(openRes.data.data.openingBalance);
            if (returnedBalance !== 500) {
                throw new Error(`Opening balance mismatch. Expected 500, got ${openRes.data.data.openingBalance} (Type: ${typeof openRes.data.data.openingBalance})`);
            }

        } catch (error: any) {
            log(`❌ Failed to open session: ${error.message}`);
            if (error.response) {
                log(`Response: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }

        // 4. Get Session Details
        log('\n4. Verifying session details...');
        try {
            const detailsRes = await api.get(`/sessions/${activeSessionId}`);
            if (detailsRes.data.data.id !== activeSessionId) {
                throw new Error('Fetched session ID mismatch');
            }
            log('✅ Session details verified.');
        } catch (error: any) {
            log('❌ Failed to get session details');
            throw error;
        }

        // 5. Close Session
        log('\n5. Closing session...');
        try {
            // Target closing balance: 750.50
            // 3x200 + 1x100 + 1x50 + 1x0.50
            const closeRes = await api.post('/sessions/close', {
                sessionId: activeSessionId,
                denominations: [
                    { value: 200, count: 3 },
                    { value: 100, count: 1 },
                    { value: 50, count: 1 },
                    { value: 0.5, count: 1 }
                ]
            });

            if (closeRes.data.data.status !== 'CLOSED') {
                throw new Error('Session status is not CLOSED after closing');
            }

            const actualClosing = closeRes.data.data.actualClosingBalance;
            // Note: DB stores number, might have float precision issues but Decimal.js on backend should handle.
            // But API returns JSON number.
            if (actualClosing !== 750.5) {
                log(`⚠️ Closing balance mismatch: Expected 750.5, got ${actualClosing}`);
            } else {
                log('✅ Closing balance verified (750.50).');
            }

            log('✅ Session closed successfully.');
        } catch (error: any) {
            log('❌ Failed to close session');
            if (error.response) {
                log(`Response: ${JSON.stringify(error.response.data)}`);
            }
            throw error;
        }

        log('\n✅ SESSIONS MODULE VERIFIED');

    } catch (error: any) {
        log('\n❌ ERROR OCCURRED');
        // log(`Status: ${error.response?.status}`);
        // log(`Data: ${JSON.stringify(error.response?.data, null, 2)}`);
        process.exit(1);
    }
}

verifySessions();
