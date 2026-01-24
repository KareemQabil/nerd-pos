import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = 'http://localhost:3001/api/v1';
const LOG_FILE = path.join(__dirname, 'verification.log');

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
    fs.writeFileSync(LOG_FILE, 'STARTING VERIFICATION\n');

    try {
        log('1. Logging in as admin...');
        const login = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'nerdpos123'
        });

        // Correct path for AuthController response wrapped by interceptor
        // AuthController returns { access_token: ... }
        const tokenRaw = login.data.data?.access_token || login.data.access_token;
        const token = tokenRaw ? tokenRaw.trim() : null;

        if (!token) {
            log('❌ Login failed: No token received', login.data);
            process.exit(1);
        }
        log('✅ Login successful.');
        log('Token start:', token.substring(0, 50) + "...");

        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            log('Token Payload:', payload);
        } catch (e: any) {
            log('Error decoding token payload:', e.message);
        }

        const api = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        log('\n2. Creating test customer...');
        const timestamp = new Date().getTime();
        const customerData = {
            name: `Verification Customer ${timestamp}`,
            nameAr: "عميل تحقق",
            phone: `+9665${timestamp.toString().substring(3, 11)}`,
            email: `verify.${timestamp}@nerdpos.com`,
            notes: "Created by verify-customer-fix.ts"
        };
        log('Payload:', customerData);

        const createResponse = await api.post('/customers', customerData);
        log('✅ Customer created successfully!');
        log('Response:', createResponse.data);

    } catch (error: any) {
        log('❌ ERROR OCCURRED');
        if (error.response) {
            log('Status:', error.response.status);
            log('Data:', error.response.data);
            log('Headers:', error.response.headers);
        } else if (error.request) {
            log('No response received (Request failed)');
        } else {
            log('Message:', error.message);
        }
        process.exit(1);
    }
}

test();
