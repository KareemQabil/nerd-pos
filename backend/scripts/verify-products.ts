import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'http://localhost:3001/api/v1';
const LOG_FILE = path.join(__dirname, 'verification_products.log');

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
    fs.writeFileSync(LOG_FILE, 'STARTING PRODUCTS VERIFICATION\n');

    try {
        log('1. Logging in as admin...');
        const login = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'nerdpos123'
        });

        const tokenRaw = login.data.data?.access_token || login.data.access_token;
        const token = tokenRaw ? tokenRaw.trim() : null;

        if (!token) {
            log('❌ Login failed: No token received', login.data);
            process.exit(1);
        }
        log('✅ Login successful.');

        const api = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const timestamp = new Date().getTime();

        // 2. Create Category
        log('\n2. Creating Category...');
        const categoryData = {
            nameAr: `تصنيف ${timestamp}`,
            nameEn: `Category ${timestamp}`,
            sortOrder: 1,
            isActive: true
        };
        const catRes = await api.post('/categories', categoryData);
        const categoryId = catRes.data.data.id;
        log('✅ Category created:', categoryId);

        // 3. Create Product
        log('\n3. Creating Product...');
        const productData = {
            sku: `SKU-${timestamp}`,
            nameAr: `منتج ${timestamp}`,
            nameEn: `Product ${timestamp}`,
            categoryId: categoryId,
            price: 50.00,
            cost: 30.00,
            taxCategory: 'STANDARD',
            trackInventory: true
        };
        const prodRes = await api.post('/products', productData);
        const productId = prodRes.data.data.id;
        log('✅ Product created:', productId);

        // 4. Get Product
        log('\n4. Getting Product details...');
        const getRes = await api.get(`/products/${productId}`);
        if (getRes.data.data.id === productId) {
            log('✅ Get Product verified');
        } else {
            log('❌ Get Product mismatch', getRes.data);
        }

        // 5. Update Product
        log('\n5. Updating Product...');
        const updateRes = await api.put(`/products/${productId}`, {
            price: 55.00
        });
        if (updateRes.data.data.price == 55.00) { // loose equality for decimal
            log('✅ Update Product verified');
        } else {
            log('❌ Update Product mismatch', updateRes.data);
        }

        // 6. List Products
        log('\n6. Listing Products...');
        const listRes = await api.get('/products');
        if (listRes.data.data.length > 0) {
            log(`✅ List Products verified (${listRes.data.data.length} items)`);
        } else {
            log('⚠️ List Products returned empty');
        }

        log('\n✅ PRODUCTS VARIATION COMPLETE');

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
