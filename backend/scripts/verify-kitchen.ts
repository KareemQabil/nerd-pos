
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3001/api/v1';
const LOG_FILE = path.join(__dirname, 'verification_kitchen.log');

function log(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(message);
    try {
        fs.appendFileSync(LOG_FILE, logMessage + '\n');
    } catch (e) {
        console.error('Failed to write to log file:', e);
    }
}

async function verifyKitchen() {
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
    log('STARTING KITCHEN MODULE VERIFICATION');

    try {
        // 1. Login
        log('1. Logging in as admin...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'nerdpos123'
        });
        const token = loginRes.data.data.access_token;
        const api = axios.create({
            baseURL: API_URL,
            headers: { Authorization: `Bearer ${token}` }
        });
        log('✅ Login successful.');
        const userId = loginRes.data.data.user.id;

        // 1.5 Open Session (Prerequisite for sales)
        log('\n1.5 Opening Session...');
        try {
            const currentSession = await api.get(`/sessions/current/${userId}`);
            if (currentSession.data.data) {
                log('ℹ️ Active session found, using it.');
            } else {
                throw new Error('No session data');
            }
        } catch (e: any) {
            log('ℹ️ No active session, creating new one...');
            await api.post('/sessions/open', {
                openingBalance: 1000.00,
                terminalId: 'TERM-KITCHEN-TEST'
            });
            log('✅ Session opened');
        }

        // 2. Create Category (For Kitchen Routing)
        log('\n2. Creating Category for Kitchen...');
        const categoryRes = await api.post('/categories', {
            nameEn: `Kitchen Cat ${Date.now()}`,
            nameAr: `تصنيف مطبخ`,
            isActive: true,
            sortOrder: 1
        });
        const categoryId = categoryRes.data.data.id;
        log(`✅ Category created: ${categoryId}`);

        // 3. Create Kitchen Station linked to Category
        log('\n3. Creating Kitchen Station...');
        const stationRes = await api.post('/kitchen/stations', {
            name: 'Grill Station',
            nameAr: 'محطة الشواء',
            color: '#FF0000',
            displayOrder: 1,
            categoryIds: [categoryId]
        });
        const stationId = stationRes.data.data.id;
        log(`✅ Station created: ${stationId} (Linked to Cat: ${categoryId})`);

        // 4. Create Product
        log('\n4. Creating Product...');
        const productSku = `KIT-TEST-${Date.now()}`;
        const prodRes = await api.post('/products', {
            nameEn: 'Grilled Chicken',
            nameAr: 'دجاج مشوي',
            sku: productSku,
            price: 60.00,
            categoryId: categoryId,
            taxCategory: 'STANDARD',
            trackInventory: false // Verified valid
        });

        if (!prodRes.data.data) {
            throw new Error('Product creation returned no data');
        }

        const productId = prodRes.data.data.id;
        log(`✅ Product created: ${productId}`);

        // 5. Create Order
        log('\n5. Creating Order...');
        const orderRes = await api.post('/orders', {
            type: 'DINE_IN',
            items: [
                {
                    productId: productId,
                    name: 'Grilled Chicken',
                    nameAr: 'دجاج مشوي',
                    quantity: 2,
                    price: 60.00
                }
            ],
            tableId: null
        });
        const orderId = orderRes.data.data.id;
        const orderNumber = orderRes.data.data.orderNumber;
        log(`✅ Order created: ${orderNumber} (${orderId})`);

        // 6. Confirm Order (Triggers Kitchen Ticket)
        log('\n6. Confirming Order...');
        await api.put(`/orders/${orderId}/confirm`);
        log('✅ Order confirmed.');

        // 7. Verify Ticket Creation (Poll)
        log('\n7. Verifying Ticket Creation (Event Driven)...');
        let ticketId: string | null = null;
        let attempts = 0;

        while (!ticketId && attempts < 10) {
            await new Promise(r => setTimeout(r, 1000));
            try {
                // FIXED: Use correct endpoint /kitchen/orders/:orderId/tickets
                const ticketsRes = await api.get(`/kitchen/orders/${orderId}/tickets`);
                const tickets = ticketsRes.data.data || [];

                if (tickets.length > 0) {
                    const ticket = tickets[0];
                    ticketId = ticket.id;
                    log(`✅ Ticket found: ${ticketId} (Station: ${ticket.station || 'Unknown'})`);
                } else {
                    log(`...waiting for ticket (Attempt ${attempts + 1})`);
                }
            } catch (e: any) {
                log(`Error fetching tickets: ${e.message}`);
            }
            attempts++;
        }

        if (!ticketId) {
            throw new Error('Ticket not created after order confirmation');
        }

        // 8. Update Ticket Status (PREPARING)
        log('\n8. Updating Ticket Status (PREPARING)...');
        await api.post(`/kitchen/tickets/${ticketId}/start`); // Changed to POST /start based on Controller
        log('✅ Status updated to PREPARING (Started).');

        // 9. Update Ticket Status (READY)
        log('\n9. Updating Ticket Status (READY)...');
        await api.post(`/kitchen/tickets/${ticketId}/ready`); // Changed to POST /ready based on Controller
        log('✅ Status updated to READY.');

        // 10. Update Ticket Status (COMPLETED)
        log('\n10. Updating Ticket Status (COMPLETED)...');
        await api.post(`/kitchen/tickets/${ticketId}/complete`); // Changed to POST /complete based on Controller
        log('✅ Status updated to COMPLETED.');

        log('\n✅ KITCHEN MODULE VERIFIED');

    } catch (error: any) {
        log('\n❌ ERROR OCCURRED');
        log(`Status: ${error.response?.status}`);
        if (error.response?.data) {
            log(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            log(`Message: ${error.message}`);
        }
        process.exit(1);
    }
}

verifyKitchen();
