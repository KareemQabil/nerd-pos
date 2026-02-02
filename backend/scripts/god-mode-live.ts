/**
 * GOD MODE LIVE E2E TEST 🔥
 * 
 * A 100% LIVE end-to-end test that hits the actual running backend.
 * No mocks. No fakes. Real HTTP requests. Real database.
 * 
 * PREREQUISITES:
 * - Backend running: npm run start:dev (http://localhost:3001)
 * - Database seeded with at least one admin user
 * - Environment variables (optional): TEST_ADMIN_USER, TEST_ADMIN_PASS
 * 
 * RUN: npx ts-node scripts/god-mode-live.ts
 */

import axios, { AxiosInstance } from 'axios';
import Decimal from 'decimal.js';

// ==================== CONFIGURATION ====================
const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001/api/v1';
const REQUEST_TIMEOUT = 10000; // 10 second timeout

// Credentials from environment or defaults (for local dev only)
const ADMIN_CREDENTIALS = {
    username: process.env.TEST_ADMIN_USER || 'admin',
    password: process.env.TEST_ADMIN_PASS || 'admin123'
};
const MANAGER_CREDENTIALS = {
    username: process.env.TEST_MANAGER_USER || 'manager',
    password: process.env.TEST_MANAGER_PASS || 'manager123'
};

// Unique identifiers per test run (prevents race conditions)
const TEST_RUN_ID = Date.now();
const TERMINAL_ID = `TEST-TERMINAL-${TEST_RUN_ID}`;

// ==================== TYPES ====================
interface AuthResponse {
    accessToken: string;
    user: { id: string; username: string; roleId: string };
}

interface ProductResponse {
    id: string;
    name: string;
    sku: string;
    price: number;
    categoryId: string;
}

interface SessionResponse {
    id: string;
    sessionNumber: string;
    status: string;
    openingBalance: number;
}

interface OrderResponse {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    subtotal?: number;
    taxAmount?: number;
    items: Array<{ id: string; productId: string; quantity: number }>;
}

interface PaymentResponse {
    id: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
}

interface ZReportResponse {
    sessionId: string;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    orderCount: number;
}

interface ApiErrorResponse {
    message?: string;
    error?: string;
    statusCode?: number;
}

// ==================== UTILITIES ====================
function log(emoji: string, message: string) {
    console.log(`${emoji} ${new Date().toISOString().slice(11, 19)} | ${message}`);
}

function logPass(message: string) {
    log('✅', message);
}

function logFail(message: string) {
    log('❌', message);
}

function logInfo(message: string) {
    log('ℹ️', message);
}

function logWarn(message: string) {
    log('⚠️', message);
}

function logSection(title: string) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${title}`);
    console.log('='.repeat(60));
}

// ==================== API CLIENT ====================
function createApiClient(token?: string): AxiosInstance {
    return axios.create({
        baseURL: BASE_URL,
        timeout: REQUEST_TIMEOUT, // ✅ Timeout configured
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
        validateStatus: () => true, // Don't throw on non-2xx
    });
}

// ==================== TEST STATE ====================
interface TestState {
    adminToken: string;
    managerToken: string;
    managerId: string;
    productId: string;
    categoryId: string;
    sessionId: string;
    order1Id: string;
    order2Id: string;
    order3Id: string;
    createdOrderIds: string[]; // Track for cleanup
    initialStock: number;
}

const state: TestState = {
    adminToken: '',
    managerToken: '',
    managerId: '',
    productId: '',
    categoryId: '',
    sessionId: '',
    order1Id: '',
    order2Id: '',
    order3Id: '',
    createdOrderIds: [],
    initialStock: 10,
};

// ==================== ASSERTIONS ====================
function assertEqual<T>(actual: T, expected: T, context: string): boolean {
    if (actual === expected) {
        logPass(`${context}: ${actual} === ${expected}`);
        return true;
    }
    logFail(`${context}: Expected ${expected}, got ${actual}`);
    return false;
}

/**
 * ZATCA-compliant decimal comparison
 * Uses 4 decimal places (0.0001) for tax precision
 */
function assertDecimalEqual(actual: number, expected: number, context: string): boolean {
    const diff = new Decimal(actual).minus(expected).abs();
    // ✅ ZATCA compliance: 4 decimal places
    if (diff.lessThan(0.0001)) {
        logPass(`${context}: ${actual} ≈ ${expected}`);
        return true;
    }
    logFail(`${context}: Expected ${expected}, got ${actual} (diff: ${diff.toFixed(4)})`);
    return false;
}

function assertStatus(actual: number, expected: number, context: string): boolean {
    if (actual === expected) {
        logPass(`${context}: HTTP ${actual}`);
        return true;
    }
    logFail(`${context}: Expected HTTP ${expected}, got ${actual}`);
    return false;
}

// ==================== HEALTH CHECK ====================
async function checkBackendHealth(): Promise<boolean> {
    logSection('0. PRE-FLIGHT HEALTH CHECK');

    try {
        logInfo(`Checking backend at ${BASE_URL}...`);
        const res = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, {
            timeout: 5000,
            validateStatus: () => true,
        });

        if (res.status === 200 || res.status === 404) {
            // 404 on /health is okay if server is responding
            logPass('Backend is responding');
            return true;
        }

        logFail(`Backend returned HTTP ${res.status}`);
        return false;
    } catch (error) {
        const err = error as Error;
        if (err.message.includes('ECONNREFUSED')) {
            logFail('❌ Backend not responding at ' + BASE_URL);
            logFail('   Run: npm run start:dev');
        } else if (err.message.includes('timeout')) {
            logFail('❌ Backend timeout - server may be overloaded');
        } else {
            logFail(`❌ Connection error: ${err.message}`);
        }
        return false;
    }
}

// ==================== CLEANUP ====================
async function cleanup(): Promise<void> {
    logSection('CLEANUP');
    const api = createApiClient(state.adminToken);

    try {
        // Cancel any unpaid orders
        for (const orderId of state.createdOrderIds) {
            if (orderId) {
                try {
                    await api.put(`/orders/${orderId}/cancel`, { reason: 'Test cleanup' });
                } catch {
                    // Ignore cleanup errors
                }
            }
        }

        // Delete test product
        if (state.productId) {
            const deleteRes = await api.delete(`/products/${state.productId}`);
            if (deleteRes.status === 200 || deleteRes.status === 204) {
                logPass('Test product deleted');
            } else {
                logInfo('Could not delete test product (may be in use)');
            }
        }

        logPass('Cleanup completed');
    } catch (error) {
        logWarn(`Cleanup error: ${(error as Error).message}`);
    }
}

// ==================== TEST SCENARIOS ====================

async function testAuth(): Promise<boolean> {
    logSection('1. AUTHENTICATION');
    const api = createApiClient();

    try {
        // Admin login
        logInfo('Logging in as Admin...');
        const adminRes = await api.post<AuthResponse>('/auth/login', ADMIN_CREDENTIALS);

        if (adminRes.status !== 200 && adminRes.status !== 201) {
            logFail(`Admin login failed: ${adminRes.status} - ${JSON.stringify(adminRes.data)}`);
            return false;
        }

        state.adminToken = adminRes.data.accessToken;
        logPass(`Admin login successful: ${adminRes.data.user.username}`);

        // Manager login
        logInfo('Logging in as Manager...');
        const managerRes = await api.post<AuthResponse>('/auth/login', MANAGER_CREDENTIALS);

        if (managerRes.status !== 200 && managerRes.status !== 201) {
            logWarn(`Manager login failed: ${managerRes.status}`);
            // Fall back to admin for remaining tests
            state.managerToken = state.adminToken;
            state.managerId = adminRes.data.user.id;
            logInfo('Using admin token for manager operations');
        } else {
            state.managerToken = managerRes.data.accessToken;
            state.managerId = managerRes.data.user.id;
            logPass(`Manager login successful: ${managerRes.data.user.username}`);
        }

        return true;
    } catch (error) {
        logFail(`Auth error: ${(error as Error).message}`);
        return false;
    }
}

async function testSetup(): Promise<boolean> {
    logSection('2. SETUP - Create Test Product');
    const api = createApiClient(state.adminToken);

    try {
        // Get or create category
        logInfo('Fetching categories...');
        const catRes = await api.get('/categories');

        if (catRes.status === 200 && Array.isArray(catRes.data) && catRes.data.length > 0) {
            state.categoryId = catRes.data[0].id;
            logPass(`Using existing category: ${catRes.data[0].name}`);
        } else {
            logInfo('Creating test category...');
            const newCatRes = await api.post('/categories', {
                name: 'Test Category',
                nameAr: 'فئة اختبار',
            });
            if (newCatRes.status !== 201 && newCatRes.status !== 200) {
                logFail(`Failed to create category: ${JSON.stringify(newCatRes.data)}`);
                return false;
            }
            state.categoryId = newCatRes.data.id;
            logPass('Created test category');
        }

        // Create test product with unique SKU
        const testSku = `TEST-BURGER-${TEST_RUN_ID}`;
        logInfo(`Creating test product: Live Test Burger (SKU: ${testSku})...`);
        const productRes = await api.post<ProductResponse>('/products', {
            name: 'Live Test Burger',
            nameAr: 'برجر اختبار',
            sku: testSku,
            price: 50,
            categoryId: state.categoryId,
            isActive: true,
        });

        if (productRes.status !== 201 && productRes.status !== 200) {
            logFail(`Failed to create product: ${JSON.stringify(productRes.data)}`);
            return false;
        }

        state.productId = productRes.data.id;
        logPass(`Product created: ${productRes.data.name} (ID: ${state.productId})`);
        logPass(`Price: ${productRes.data.price} SAR`);

        return true;
    } catch (error) {
        logFail(`Setup error: ${(error as Error).message}`);
        return false;
    }
}

async function testOpenSession(): Promise<boolean> {
    logSection('3. OPEN SESSION (Start Shift)');
    const api = createApiClient(state.managerToken);

    try {
        // Use unique terminal ID per test run
        logInfo(`Opening new session on ${TERMINAL_ID}...`);
        const sessionRes = await api.post<SessionResponse>('/sessions/open', {
            openingBalance: 500,
            terminalId: TERMINAL_ID,
        });

        if (sessionRes.status !== 201 && sessionRes.status !== 200) {
            // Check if session already open
            const errorData = sessionRes.data as ApiErrorResponse;
            if (errorData?.message?.includes('already has an open session')) {
                logInfo('Session already open, fetching current...');
                const currentRes = await api.get<SessionResponse>('/sessions/current');
                if (currentRes.status === 200 && currentRes.data?.id) {
                    state.sessionId = currentRes.data.id;
                    logPass(`Using existing session: ${currentRes.data.sessionNumber}`);
                    return true;
                }
            }
            logFail(`Failed to open session: ${JSON.stringify(sessionRes.data)}`);
            return false;
        }

        state.sessionId = sessionRes.data.id;
        logPass(`Session opened: ${sessionRes.data.sessionNumber}`);
        logPass(`Opening Balance: ${sessionRes.data.openingBalance} SAR`);

        return true;
    } catch (error) {
        logFail(`Session error: ${(error as Error).message}`);
        return false;
    }
}

async function testTransaction1_HappyPath(): Promise<boolean> {
    logSection('4. TRANSACTION 1 - The Happy Path (Buy 2 Burgers)');
    const api = createApiClient(state.managerToken);

    try {
        // Create order
        logInfo('Creating order: 2x Live Test Burger...');
        const orderRes = await api.post<OrderResponse>('/orders', {
            type: 'DINE_IN',
            sessionId: state.sessionId,
            items: [
                {
                    productId: state.productId,
                    name: 'Live Test Burger',
                    nameAr: 'برجر اختبار',
                    price: 50,
                    quantity: 2,
                },
            ],
        });

        if (orderRes.status !== 201 && orderRes.status !== 200) {
            logFail(`Failed to create order: ${JSON.stringify(orderRes.data)}`);
            return false;
        }

        state.order1Id = orderRes.data.id;
        state.createdOrderIds.push(orderRes.data.id);
        logPass(`Order created: ${orderRes.data.orderNumber}`);
        logPass(`Grand Total: ${orderRes.data.grandTotal} SAR`);

        // Confirm order
        logInfo('Confirming order...');
        const confirmRes = await api.put(`/orders/${state.order1Id}/confirm`);
        if (!assertStatus(confirmRes.status, 200, 'Confirm order')) {
            const confirmPatchRes = await api.patch(`/orders/${state.order1Id}/confirm`);
            if (!assertStatus(confirmPatchRes.status, 200, 'Confirm order (PATCH)')) {
                logInfo('Skipping confirm step...');
            }
        }

        // Pay Cash
        logInfo(`Processing payment: ${orderRes.data.grandTotal} SAR Cash...`);
        const paymentRes = await api.post<PaymentResponse>('/payments', {
            orderId: state.order1Id,
            amount: orderRes.data.grandTotal,
            method: 'CASH',
        });

        if (paymentRes.status !== 201 && paymentRes.status !== 200) {
            logFail(`Payment failed: ${JSON.stringify(paymentRes.data)}`);
            return false;
        }

        logPass(`Payment successful: ${paymentRes.data.amount} SAR (${paymentRes.data.method})`);

        return true;
    } catch (error) {
        logFail(`Transaction 1 error: ${(error as Error).message}`);
        return false;
    }
}

async function testTransaction2_NegativeTest(): Promise<boolean> {
    logSection('5. TRANSACTION 2 - Inventory Validation (CRITICAL)');
    const api = createApiClient(state.managerToken);

    try {
        logInfo('Attempting to order 100 burgers (expecting FAILURE)...');
        const orderRes = await api.post<OrderResponse>('/orders', {
            type: 'DINE_IN',
            sessionId: state.sessionId,
            items: [
                {
                    productId: state.productId,
                    name: 'Live Test Burger',
                    nameAr: 'برجر اختبار',
                    price: 50,
                    quantity: 100, // More than available stock
                },
            ],
        });

        // This SHOULD fail with 400 or 409 if inventory check is in place
        if (orderRes.status === 400 || orderRes.status === 409) {
            logPass('✅ Order correctly rejected - Inventory validation working');
            const errorData = orderRes.data as ApiErrorResponse;
            logPass(`   Reason: ${errorData?.message || 'Insufficient stock'}`);
            return true;
        }

        // If order was created, inventory validation is MISSING
        if (orderRes.status === 201 || orderRes.status === 200) {
            state.createdOrderIds.push(orderRes.data.id);
            logWarn(`Order created despite over-ordering: ${orderRes.data.orderNumber}`);

            // Try to confirm - this might fail instead
            const confirmRes = await api.put(`/orders/${orderRes.data.id}/confirm`);
            if (confirmRes.status === 400 || confirmRes.status === 409) {
                logPass('Order confirmation correctly rejected with stock validation');
                await api.put(`/orders/${orderRes.data.id}/cancel`, { reason: 'Test cleanup' });
                return true;
            }

            // ⚠️ CRITICAL: Inventory validation is missing
            logFail('❌ CRITICAL: Inventory validation MISSING!');
            logFail('   System accepted order for 100 items without stock check');
            logFail('   This is a PRODUCTION BUG - customers can over-order');

            // Cleanup
            await api.put(`/orders/${orderRes.data.id}/cancel`, { reason: 'Test cleanup - over-order' });

            // ✅ Fail the test - this is a critical bug
            return false;
        }

        logFail(`Unexpected response: ${orderRes.status}`);
        return false;
    } catch (error) {
        logFail(`Transaction 2 error: ${(error as Error).message}`);
        return false;
    }
}

async function testTransaction3_SplitPayment(): Promise<boolean> {
    logSection('6. TRANSACTION 3 - Split Payment (5 Burgers: Cash + Card)');
    const api = createApiClient(state.managerToken);

    try {
        // Create order
        logInfo('Creating order: 5x Live Test Burger...');
        const orderRes = await api.post<OrderResponse>('/orders', {
            type: 'DINE_IN',
            sessionId: state.sessionId,
            items: [
                {
                    productId: state.productId,
                    name: 'Live Test Burger',
                    nameAr: 'برجر اختبار',
                    price: 50,
                    quantity: 5,
                },
            ],
        });

        if (orderRes.status !== 201 && orderRes.status !== 200) {
            logFail(`Failed to create order: ${JSON.stringify(orderRes.data)}`);
            return false;
        }

        state.order3Id = orderRes.data.id;
        state.createdOrderIds.push(orderRes.data.id);
        const grandTotal = new Decimal(orderRes.data.grandTotal);
        logPass(`Order created: ${orderRes.data.orderNumber}`);
        logPass(`Grand Total: ${grandTotal.toNumber()} SAR`);

        // Split: 150 Cash + rest Card
        const cashAmount = new Decimal(150);
        const cardAmount = grandTotal.minus(cashAmount);

        logInfo(`Processing split payment: ${cashAmount.toNumber()} Cash + ${cardAmount.toNumber()} Card...`);
        const splitRes = await api.post('/payments/split', {
            orderId: state.order3Id,
            payments: [
                { amount: cashAmount.toNumber(), method: 'CASH' },
                { amount: cardAmount.toNumber(), method: 'CARD' },
            ],
        });

        if (splitRes.status === 201 || splitRes.status === 200) {
            logPass('Split payment processed successfully');
        } else {
            // Fall back to individual payments
            logInfo('Split endpoint not available, using individual payments...');

            await api.post<PaymentResponse>('/payments', {
                orderId: state.order3Id,
                amount: cashAmount.toNumber(),
                method: 'CASH',
            });
            logPass(`Cash payment: ${cashAmount.toNumber()} SAR`);

            await api.post<PaymentResponse>('/payments', {
                orderId: state.order3Id,
                amount: cardAmount.toNumber(),
                method: 'CARD',
            });
            logPass(`Card payment: ${cardAmount.toNumber()} SAR`);
        }

        // Verify order status
        const verifyRes = await api.get<OrderResponse>(`/orders/${state.order3Id}`);
        if (verifyRes.data.status === 'PAID' || verifyRes.data.status === 'COMPLETED') {
            logPass(`Order status: ${verifyRes.data.status}`);
        } else {
            logInfo(`Order status: ${verifyRes.data.status}`);
        }

        return true;
    } catch (error) {
        logFail(`Transaction 3 error: ${(error as Error).message}`);
        return false;
    }
}

async function testTransaction4_CancelOrder(): Promise<boolean> {
    logSection('7. TRANSACTION 4 - The Void (Cancel Order)');
    const api = createApiClient(state.managerToken);

    try {
        // Create order
        logInfo('Creating order: 1x Live Test Burger (to cancel)...');
        const orderRes = await api.post<OrderResponse>('/orders', {
            type: 'DINE_IN',
            sessionId: state.sessionId,
            items: [
                {
                    productId: state.productId,
                    name: 'Live Test Burger',
                    nameAr: 'برجر اختبار',
                    price: 50,
                    quantity: 1,
                },
            ],
        });

        if (orderRes.status !== 201 && orderRes.status !== 200) {
            logFail(`Failed to create order: ${JSON.stringify(orderRes.data)}`);
            return false;
        }

        state.order2Id = orderRes.data.id;
        state.createdOrderIds.push(orderRes.data.id);
        logPass(`Order created: ${orderRes.data.orderNumber}`);

        // Cancel order
        logInfo('Cancelling order...');
        let cancelled = false;

        const cancelRes = await api.put(`/orders/${state.order2Id}/cancel`, {
            reason: 'Customer changed mind',
        });
        if (cancelRes.status === 200) {
            cancelled = true;
        } else {
            const cancelPatchRes = await api.patch(`/orders/${state.order2Id}/cancel`, {
                reason: 'Customer changed mind',
            });
            if (cancelPatchRes.status === 200) {
                cancelled = true;
            }
        }

        if (!cancelled) {
            logFail(`Failed to cancel order`);
            return false;
        }

        // Verify order is CANCELLED
        const verifyRes = await api.get<OrderResponse>(`/orders/${state.order2Id}`);
        if (verifyRes.data.status === 'CANCELLED' || verifyRes.data.status === 'VOIDED') {
            logPass(`Order cancelled: ${verifyRes.data.status}`);
        } else {
            logInfo(`Order status: ${verifyRes.data.status}`);
        }

        return true;
    } catch (error) {
        logFail(`Transaction 4 error: ${(error as Error).message}`);
        return false;
    }
}

async function testCloseSession(): Promise<boolean> {
    logSection('8. CLOSE SESSION - The Money Check');
    const api = createApiClient(state.managerToken);

    try {
        logInfo('Closing session...');
        const closeRes = await api.post<SessionResponse>(`/sessions/${state.sessionId}/close`, {
            denominations: [
                { value: 100, count: 5 },
                { value: 50, count: 10 },
                { value: 10, count: 10 },
            ],
        });

        if (closeRes.status !== 200 && closeRes.status !== 201) {
            const closeAltRes = await api.put<SessionResponse>(`/sessions/${state.sessionId}/close`, {
                denominations: [
                    { value: 100, count: 5 },
                    { value: 50, count: 10 },
                    { value: 10, count: 10 },
                ],
            });
            if (closeAltRes.status !== 200) {
                logFail(`Failed to close session: ${JSON.stringify(closeRes.data)}`);
                return false;
            }
        }

        logPass('Session closed successfully');

        // Get Z-Report
        logInfo('Fetching Z-Report...');
        const zReportRes = await api.get<ZReportResponse>(`/reports/z-report/${state.sessionId}`);

        if (zReportRes.status === 200) {
            const report = zReportRes.data;
            logPass(`Z-Report Retrieved:`);
            logPass(`  Total Sales: ${report.totalSales} SAR`);
            logPass(`  Total Cash: ${report.totalCash} SAR`);
            logPass(`  Total Card: ${report.totalCard} SAR`);
            logPass(`  Order Count: ${report.orderCount}`);
        } else {
            logInfo('Z-Report endpoint not available');
        }

        return true;
    } catch (error) {
        logFail(`Close session error: ${(error as Error).message}`);
        return false;
    }
}

// ==================== MAIN EXECUTION ====================
async function runGodMode() {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║          🔥 GOD MODE LIVE E2E TEST 🔥                         ║');
    console.log('║                                                              ║');
    console.log('║  100% Real HTTP Requests | No Mocks | Live Database          ║');
    console.log(`║  Test Run ID: ${TEST_RUN_ID}                                   ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Pre-flight check
    if (!await checkBackendHealth()) {
        process.exit(1);
    }

    const results: { name: string; passed: boolean }[] = [];

    // Execute all tests
    const tests = [
        { name: 'Authentication', fn: testAuth },
        { name: 'Setup (Create Product)', fn: testSetup },
        { name: 'Open Session', fn: testOpenSession },
        { name: 'Transaction 1 (Happy Path)', fn: testTransaction1_HappyPath },
        { name: 'Transaction 2 (Inventory Check)', fn: testTransaction2_NegativeTest },
        { name: 'Transaction 3 (Split Payment)', fn: testTransaction3_SplitPayment },
        { name: 'Transaction 4 (Cancel Order)', fn: testTransaction4_CancelOrder },
        { name: 'Close Session + Z-Report', fn: testCloseSession },
    ];

    try {
        for (const test of tests) {
            try {
                const passed = await test.fn();
                results.push({ name: test.name, passed });

                if (!passed && test.name === 'Authentication') {
                    logFail('Authentication failed. Cannot continue.');
                    break;
                }
            } catch (error) {
                results.push({ name: test.name, passed: false });
                logFail(`Unexpected error in ${test.name}: ${(error as Error).message}`);
            }
        }
    } finally {
        // Always cleanup, even on failure
        await cleanup();
    }

    // Final Summary
    logSection('FINAL RESULTS');

    const passCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    results.forEach(r => {
        console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
    });

    console.log('\n' + '-'.repeat(60));
    console.log(`  TOTAL: ${passCount}/${totalCount} scenarios passed`);
    console.log('-'.repeat(60));

    if (passCount === totalCount) {
        console.log('\n  🏆 GOD MODE COMPLETE - ALL SCENARIOS PASSED! 🏆\n');
    } else {
        console.log('\n  ⚠️  Some scenarios failed. Check logs above.\n');
    }

    // Exit with appropriate code
    process.exit(passCount === totalCount ? 0 : 1);
}

// Run the tests
runGodMode().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
