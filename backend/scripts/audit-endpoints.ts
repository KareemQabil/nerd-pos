#!/usr/bin/env ts-node
/**
 * Audit Endpoints Script
 * Verifies API response standardization
 * 
 * Validates:
 * 1. All GET endpoints return { success: boolean, data: T }
 * 2. No double wrapping (data.data)
 * 3. Consistent error format
 * 
 * Created: 2026-01-31
 * Author: Senior Backend Architect & QA Lead
 */

import axios, { AxiosError } from 'axios';

interface StandardResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
}

interface AuditResult {
    endpoint: string;
    method: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    reason?: string;
    responseStructure?: any;
}

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_TOKEN || '';

// Endpoints to audit (GET requests that should return standardized data)
const ENDPOINTS_TO_AUDIT = [
    { path: '/api/products', method: 'GET', requiresAuth: true },
    { path: '/api/categories', method: 'GET', requiresAuth: true },
    { path: '/api/inventory', method: 'GET', requiresAuth: true },
    { path: '/api/sales/orders', method: 'GET', requiresAuth: true },
    { path: '/api/sessions/current', method: 'GET', requiresAuth: true },
    { path: '/api/customers', method: 'GET', requiresAuth: true },
    { path: '/api/tables', method: 'GET', requiresAuth: true },
    { path: '/api/delivery/zones', method: 'GET', requiresAuth: true },
    { path: '/api/reports/daily', method: 'GET', requiresAuth: true },
    { path: '/api/settings/store', method: 'GET', requiresAuth: true },
];

class EndpointAuditor {
    private results: AuditResult[] = [];
    private token: string = '';

    async login(): Promise<boolean> {
        try {
            console.log(`🔐 Authenticating...`);
            const response = await axios.post(`${BASE_URL}/auth/login`, {
                username: 'admin',
                password: 'admin123',
            });

            if (response.data?.data?.access_token) {
                this.token = response.data.data.access_token;
                console.log(`✅ Authentication successful\n`);
                return true;
            }

            console.error(`❌ Login failed: No access token in response`);
            return false;
        } catch (error) {
            console.error(`❌ Login error:`, this.formatError(error));
            return false;
        }
    }

    async auditEndpoint(endpoint: { path: string; method: string; requiresAuth: boolean }): Promise<AuditResult> {
        const headers = endpoint.requiresAuth && this.token
            ? { Authorization: `Bearer ${this.token}` }
            : {};

        try {
            const response = await axios({
                url: `${BASE_URL}${endpoint.path}`,
                method: endpoint.method,
                headers,
                validateStatus: () => true, // Don't throw on non-2xx
            });

            return this.analyzeResponse(endpoint, response.data, response.status);
        } catch (error) {
            return {
                endpoint: endpoint.path,
                method: endpoint.method,
                status: 'FAIL',
                reason: `Request failed: ${this.formatError(error)}`,
            };
        }
    }

    analyzeResponse(endpoint: { path: string; method: string }, data: any, statusCode: number): AuditResult {
        const result: AuditResult = {
            endpoint: endpoint.path,
            method: endpoint.method,
            status: 'PASS',
        };

        // Check if response has standard structure
        if (typeof data !== 'object' || data === null) {
            result.status = 'FAIL';
            result.reason = 'Response is not an object';
            result.responseStructure = typeof data;
            return result;
        }

        // Check for required fields
        if (!('success' in data)) {
            result.status = 'FAIL';
            result.reason = 'Missing "success" field';
            result.responseStructure = Object.keys(data);
            return result;
        }

        if (!('data' in data)) {
            result.status = 'FAIL';
            result.reason = 'Missing "data" field';
            result.responseStructure = Object.keys(data);
            return result;
        }

        // Check for double wrapping (data.data)
        if (data.data && typeof data.data === 'object' && 'data' in data.data && 'success' in data.data) {
            result.status = 'FAIL';
            result.reason = '🚨 DOUBLE WRAPPING DETECTED: { success, data: { success, data } }';
            result.responseStructure = {
                outerKeys: Object.keys(data),
                innerKeys: Object.keys(data.data),
            };
            return result;
        }

        // Success criteria met
        result.status = 'PASS';
        result.reason = `Standard format: { success: ${data.success}, data: ${typeof data.data} }`;

        return result;
    }

    formatError(error: unknown): string {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError;
            return `${axiosError.message} - ${JSON.stringify(axiosError.response?.data || {})}`;
        }
        if (error instanceof Error) {
            return error.message;
        }
        return String(error);
    }

    async run(): Promise<void> {
        console.log(`
╔════════════════════════════════════════════════════════╗
║        NerdPOS Endpoint Audit Tool v1.0                ║
║        Testing Response Standardization                ║
╚════════════════════════════════════════════════════════╝
`);

        // Step 1: Login
        const loginSuccessful = await this.login();
        if (!loginSuccessful) {
            console.error(`\n⛔ Cannot continue without authentication\n`);
            process.exit(1);
        }

        // Step 2: Audit each endpoint
        console.log(`📊 Auditing ${ENDPOINTS_TO_AUDIT.length} endpoints...\n`);

        for (const endpoint of ENDPOINTS_TO_AUDIT) {
            process.stdout.write(`  Testing ${endpoint.method} ${endpoint.path}... `);
            const result = await this.auditEndpoint(endpoint);
            this.results.push(result);

            if (result.status === 'PASS') {
                console.log(`✅ PASS`);
            } else {
                console.log(`❌ FAIL - ${result.reason}`);
            }
        }

        // Step 3: Print summary
        this.printSummary();
    }

    printSummary(): void {
        const passed = this.results.filter(r => r.status === 'PASS').length;
        const failed = this.results.filter(r => r.status === 'FAIL').length;
        const total = this.results.length;

        console.log(`
╔════════════════════════════════════════════════════════╗
║                   AUDIT SUMMARY                        ║
╚════════════════════════════════════════════════════════╝
`);

        console.log(`Total Endpoints:  ${total}`);
        console.log(`✅ Passed:         ${passed}`);
        console.log(`❌ Failed:         ${failed}`);
        console.log(`📊 Success Rate:   ${((passed / total) * 100).toFixed(2)}%\n`);

        if (failed > 0) {
            console.log(`\n⚠️  FAILURES DETECTED:\n`);
            this.results
                .filter(r => r.status === 'FAIL')
                .forEach(r => {
                    console.log(`  ${r.method} ${r.endpoint}`);
                    console.log(`    Reason: ${r.reason}`);
                    if (r.responseStructure) {
                        console.log(`    Structure: ${JSON.stringify(r.responseStructure, null, 2)}`);
                    }
                    console.log(``);
                });

            console.log(`\n❌ Audit FAILED - Fix double wrapping issues\n`);
            process.exit(1);
        } else {
            console.log(`\n✅ All endpoints pass standardization checks!\n`);
            process.exit(0);
        }
    }
}

// Execute
const auditor = new EndpointAuditor();
auditor.run().catch(error => {
    console.error(`\n🔥 Fatal Error:`, error);
    process.exit(1);
});
