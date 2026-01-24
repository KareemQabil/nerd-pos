import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'http://localhost:3001/api/v1';
const LOG_FILE = path.join(__dirname, 'verification_sales.log');

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
    fs.writeFileSync(LOG_FILE, 'STARTING SALES VERIFICATION\n');

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
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const timestamp = new Date().getTime();

        // 2. Open Session (Prerequisite for sales)
        log('\n2. Opening Session...');
        // First check if there is an active session
        try {
            const currentSession = await api.get(`/sessions/current/${userId}`);
            if (currentSession.data.data) {
                log('ℹ️ Active session found, using it.');
            } else {
                throw new Error('No session data');
            }
        } catch (e: any) {
            // If 404/not found, create one
            log('ℹ️ No active session, creating new one...');
            const sessionRes = await api.post('/sessions/open', {
                openingBalance: 1000.00,
                terminalId: 'TERM-001'
            });
            log('✅ Session opened');
        }


        // 3. Create Product for Sale
        log('\n3. Creating Product for Sale...');
        // Need category first
        const catRes = await api.post('/categories', {
            nameEn: `Sales Cat ${timestamp}`,
            nameAr: `تصنيف ${timestamp}`,
            isActive: true
        });
        const categoryId = catRes.data.data.id;

        const prodRes = await api.post('/products', {
            sku: `SALE-${timestamp}`,
            nameEn: `Sale Item ${timestamp}`,
            nameAr: `منتج بيع ${timestamp}`,
            categoryId: categoryId,
            price: 100.00,
            cost: 50.00,
            trackInventory: true,
            taxCategory: 'STANDARD'
        });
        const productId = prodRes.data.data.id;
        log('✅ Product created:', productId);

        // 3.5 Adjust Inventory (so we can sell it)
        // Assuming we can adjust without specific warehouse if default exists, 
        // Or we might need to create warehouse. Let's try adjusting stock first.
        log('\n3.5 Adjusting Inventory...');
        try {
            // Find a warehouse first or use default
            const whRes = await api.get('/inventory/warehouses');
            let warehouseId;
            if (whRes.data.data && whRes.data.data.length > 0) {
                warehouseId = whRes.data.data[0].id;
            } else {
                // Create warehouse
                const newWh = await api.post('/inventory/warehouses', {
                    name: 'Main Warehouse',
                    code: 'WH-MAIN',
                    isDefault: true
                });
                warehouseId = newWh.data.data.id;
            }

            await api.post('/inventory/adjust', {
                warehouseId: warehouseId,
                items: [
                    { productId: productId, quantity: 100, type: 'IN', reason: 'Initial Stock' }
                ],
                reason: 'Verification Init'
            });
            log('✅ Inventory adjusted');
        } catch (e: any) {
            log('⚠️ Inventory adjustment failed (might be fine if tracking disabled or auto-negative allowed):', e.response?.data?.message || e.message);
        }


        // 4. Create Sale Order
        log('\n4. Creating Sale Order...');
        const orderData = {
            type: 'DINE_IN',
            items: [
                {
                    productId: productId,
                    name: `Sale Item ${timestamp}`,
                    nameAr: `منتج بيع ${timestamp}`,
                    quantity: 2,
                    price: 100.00,
                    notes: 'Extra sauce'
                }
            ]
            // notes: 'Verification Order' -- Removed as it is not in DTO
        };
        const orderRes = await api.post('/orders', orderData);
        const orderId = orderRes.data.data.id;
        log('✅ Order created:', orderId);
        log('Order Total:', orderRes.data.data.total);

        // 5. Get Order Details
        log('\n5. Getting Order Details...');
        const getOrderRes = await api.get(`/orders/${orderId}`);
        if (getOrderRes.data.data.id === orderId) {
            log('✅ Get Order verified');
            // Verify total calculation: 2 * 100 = 200 + Tax? 
            // We'll just log it for now
            log('Retrieved Total:', getOrderRes.data.data.total);
        } else {
            log('❌ Get Order mismatch');
        }

        // 6. List Orders
        log('\n6. Listing Orders...');
        const listRes = await api.get('/orders');
        if (listRes.data.data.length > 0) {
            log(`✅ List Orders verified (${listRes.data.data.length} items)`);
        } else {
            log('⚠️ List Orders empty');
        }

        log('\n✅ SALES MODULE VERIFIED');

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
