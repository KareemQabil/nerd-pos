// Simple test to verify session creation
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function test() {
    try {
        console.log('1. Logging in as admin...');
        const login = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'nerdpos123'
        });
        console.log('Login response:', login.data);

        const token = login.data.data?.access_token || login.data.access_token;
        console.log('Token:', token ? 'Got token' : 'NO TOKEN');

        const api = axios.create({
            baseURL: API_BASE_URL,
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('\n2. Testing session open...');
        const sessionResponse = await api.post('/sessions/open', {
            terminalId: 'TERM-TEST-001',
            openingBalance: 500.00,
        });
        console.log('Session response:', sessionResponse.status, sessionResponse.data);

        console.log('\n✅ SUCCESS!');
    } catch (error: any) {
        console.log('\n❌ ERROR:');
        console.log('Status:', error.response?.status);
        console.log('Data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Message:', error.message);
    }
}

test();
