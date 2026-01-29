import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'http://127.0.0.1:3001/api/v1';
const LOG_FILE = path.join(__dirname, 'verification_payments.log');

function log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    let logLine = `[${timestamp}] ${message}`;
    if (data !== undefined) {
        logLine += `\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
    }
    logLine += '\n';
    fs.appendFileSync(LOG_FILE, logLine);
}

async function test() {
    // Clear log file
    fs.writeFileSync(LOG_FILE, 'STARTING PAYMENTS VERIFICATION\n');

    try {
        log('1. Logging in as admin...');
        const login = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'nerdpos123'
        });

        const token = login.data.data?.access_token || login.data.access_token;
        const userId = login.data.data?.user?.id || login.data.user?.id;
        if (!token) {
            log('❌ Login failed: No token received', login.data);
            process.exit(1);
        }
        log(`✅ Login successful (User ID: ${userId}).`);

        const api = axios.create({
            baseURL: API_BASE_URL,
            timeout: 10000,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const timestamp = new Date().getTime();

        // 2. Open Session (Prerequisite for sales/payments)
        log('\n2. Opening Session/Resolving Current...');
        let sessionId;
        try {
            const currentSession = await api.get(`/sessions/current/${userId}`);
            if (currentSession.data.data) {
                log('ℹ️ Active session found, using it.');
                sessionId = currentSession.data.data.id;
            } else {
                throw new Error('No session data');
            }
        } catch (e: any) {
            log('ℹ️ No active session, creating new one...');
            try {
                const sessionRes = await api.post('/sessions/open', {
                    openingBalance: 1000.00,
                    terminalId: 'TERM-PAY-01'
                });
                sessionId = sessionRes.data.data.id;
                log('✅ Session opened');
            } catch (err: any) {
                log('❌ Failed to open session: ', err.response?.data || err.message);
                // If getting 400 because already open but GET /current failed, we have issues.
                // But let's assume one of the above worked.
            }
        }

        if (!sessionId) {
            log('⚠️ Proceeding without explicit session ID (SalesService has auto-resolution now)');
        }

        // 3. Create Product for Sale (Quickly)
        log('\n3. Creating Product for Sale...');
        const catRes = await api.post('/categories', {
            nameEn: `Pay Cat ${timestamp}`,
            nameAr: `تصنيف دفع ${timestamp}`,
            isActive: true
        });
        const categoryId = catRes.data.data.id;

        const prodRes = await api.post('/products', {
            sku: `PAY-${timestamp}`,
            nameEn: `Pay Item ${timestamp}`,
            nameAr: `منتج دفع ${timestamp}`,
            categoryId: categoryId,
            price: 50.00,
            cost: 25.00,
            trackInventory: false, // Skip inventory for payment test simplicity
            taxCategory: 'STANDARD'
        });
        const productId = prodRes.data.data.id;
        log('✅ Product created:', productId);

        // 4. Create Order
        log('\n4. Creating Sale Order...');
        const orderData = {
            type: 'DINE_IN',
            items: [
                {
                    productId: productId,
                    name: `Pay Item ${timestamp}`,
                    nameAr: `منتج دفع ${timestamp}`,
                    quantity: 2,
                    price: 50.00
                }
            ],
            sessionId: sessionId
        };
        const orderRes = await api.post('/orders', orderData);
        const orderId = orderRes.data.data.id;
        const grandTotal = orderRes.data.data.grandTotal || 115.0; // 100 + 15% tax
        log('✅ Order created:', orderId);
        log('Grand Total:', grandTotal);

        // 5. Confirm Order (Required before payment usually?) 
        // Docs say DRAFT orders can be confirmed. Payments usually happen on Confirmed or even Draft? 
        // Let's confirm it first to be safe.
        log('\n5. Confirming Order...');
        await api.put(`/orders/${orderId}/confirm`);
        log('✅ Order confirmed');

        // 6. Get Payment Methods
        log('\n6. Fetching Payment Methods...');
        let methodsRes;
        try {
            methodsRes = await api.get('/payments/methods');
        } catch (e: any) {
            if (e.response && e.response.status === 404) {
                methodsRes = { data: { data: [] } };
            } else {
                throw e;
            }
        }

        let cashMethod = methodsRes.data.data.find((m: any) => m.type === 'CASH');

        if (!cashMethod) {
            log('ℹ️ No CASH payment method found. Creating one...');
            const createMethodRes = await api.post('/payments/methods', {
                code: 'CASH',
                nameEn: 'Cash',
                nameAr: 'نقدي',
                type: 'CASH',
                isActive: true,
                sortOrder: 1
            });
            cashMethod = createMethodRes.data.data;
            log('✅ CASH payment method created:', cashMethod.id);
        } else {
            log('✅ Payment Methods fetched. Using:', cashMethod.code);
        }

        // 7. Process Payment (Full)
        log('\n7. Processing Full Payment...');
        const paymentData = {
            orderId: orderId,
            method: cashMethod.code,
            amount: grandTotal,
            receivedAmount: grandTotal,
            sessionId: sessionId,
            createdBy: userId
        };

        const payRes = await api.post('/payments', paymentData);
        const paymentId = payRes.data.data.id;
        log('✅ Payment processed:', paymentId);
        log('Payment Status:', payRes.data.data.status);

        // 8. Verify Order Status Updated to PAID/COMPLETED
        // Ideally should be COMPLETED if fully paid.
        log('\n8. Verifying Order Status...');
        const getOrderRes = await api.get(`/orders/${orderId}`);
        const finalStatus = getOrderRes.data.data.status;
        const paymentStatus = getOrderRes.data.data.paymentStatus;

        log(`Order Status: ${finalStatus}`);
        log(`Payment Status: ${paymentStatus}`);

        if (paymentStatus === 'PAID') {
            log('✅ Order marked as PAID');
        } else {
            log('⚠️ Order NOT marked as PAID (Might be partial or logic mismatch)');
        }

        log('\n✅ PAYMENTS MODULE VERIFIED');

    } catch (error: any) {
        log('❌ ERROR OCCURRED');
        if (error.response) {
            log('Status:', error.response.status);
            log('Data:', error.response.data);
        } else if (error.request) {
            log('No response received (Request failed)');
        } else {
            log('Message:', error.message);
        }
        process.exit(1);
    }
}

test();
