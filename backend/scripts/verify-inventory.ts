
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = 'http://localhost:3001/api/v1';
const LOG_FILE = path.join(__dirname, 'verification_inventory.log');

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

async function verifyInventory() {
    if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
    log('STARTING INVENTORY MODULE VERIFICATION');

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

        // 2. Create Warehouse
        log('\n2. Creating Warehouse...');
        const warehouseCode = `WH-${Date.now()}`.substring(0, 20);
        const whRes = await api.post('/inventory/warehouses', {
            code: warehouseCode,
            nameEn: 'Verification Warehouse',
            nameAr: 'مستودع التحقق'
            // location removed
        });
        const warehouseId = whRes.data.data.id;
        log(`✅ Warehouse created: ${warehouseId} (${warehouseCode})`);

        // 3. Create Category (Needed for Product)
        log('\n3. Creating Category...');
        const categoryRes = await api.post('/categories', {
            nameEn: `Inv Cat ${Date.now()}`,
            nameAr: `تصنيف مخزون`,
            isActive: true,
            sortOrder: 1
        });
        const categoryId = categoryRes.data.data.id;
        log(`✅ Category created: ${categoryId}`);

        // 4. Create Product
        log('\n4. Creating Product...');
        const productSku = `INV-TEST-${Date.now()}`;
        const prodRes = await api.post('/products', {
            nameEn: 'Inventory Test Item',
            nameAr: 'منتج اختبار المخزون',
            sku: productSku,
            price: 50.00,
            categoryId: categoryId,
            taxCategory: 'STANDARD',
            trackInventory: true
        });
        const productId = prodRes.data.data.id;
        log(`✅ Product created: ${productId} (${productSku})`);

        // 5. Receive Stock
        log('\n5. Receiving Stock (100 units)...');
        await api.post('/inventory/receive', {
            productId: productId,
            warehouseId: warehouseId,
            quantity: 100,
            costPerUnit: 10.00,
            batchNumber: 'BATCH-001'
        });
        log('✅ Stock received.');

        // 6. Verify Stock Level
        log('\n6. Verifying Stock Level...');
        const stockRes = await api.get(`/inventory/stock/${productId}/${warehouseId}`);
        const data = stockRes.data.data;
        const currentStock = Number(data.quantityOnHand !== undefined ? data.quantityOnHand : data.quantity);
        log(`Current Stock: ${currentStock}`);

        if (currentStock !== 100) {
            throw new Error(`Stock mismatch. Expected 100, got ${currentStock}`);
        }
        log('✅ Stock verification passed (100).');

        // 7. Adjust Stock (Reduce)
        log('\n7. Adjusting Stock (-5 units)...');
        await api.post('/inventory/adjust', {
            productId: productId,
            warehouseId: warehouseId,
            quantity: -5,
            reason: 'Verification Adjustment'
        });
        log('✅ Adjustment submitted.');

        // 8. Final Verification
        log('\n8. Final Stock Verification...');
        const finalStockRes = await api.get(`/inventory/stock/${productId}/${warehouseId}`);
        const finalData = finalStockRes.data.data;
        const finalStock = Number(finalData.quantityOnHand !== undefined ? finalData.quantityOnHand : finalData.quantity);
        log(`Final Stock: ${finalStock}`);

        if (finalStock !== 95) {
            throw new Error(`Final stock mismatch. Expected 95, got ${finalStock}`);
        }
        log('✅ Final stock verified (95).');

        log('\n✅ INVENTORY MODULE VERIFIED');

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

verifyInventory();
