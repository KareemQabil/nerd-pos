/**
 * E2E Test Environment Configuration
 * 
 * Environment variables take precedence over defaults.
 * For CI/CD, set TEST_API_URL, TEST_ADMIN_USER, TEST_ADMIN_PASS
 */

// Test run identifier (prevents collisions between parallel runs)
export const TEST_RUN_ID = Date.now();
export const TEST_RUN_SUFFIX = `_${TEST_RUN_ID}`;

// API Configuration
export const ENV = {
    BASE_URL: process.env.TEST_API_URL || 'http://localhost:3001/api/v1',
    TIMEOUT: parseInt(process.env.TEST_TIMEOUT || '15000', 10),
    RETRY_ATTEMPTS: parseInt(process.env.TEST_RETRIES || '3', 10),
    RETRY_DELAY: 1000, // ms between retries
};

// User credentials (mapped from BRD test data requirements)
export interface UserCredentials {
    username: string;
    password: string;
    role: string;
    pin?: string;
}

export const USERS: Record<string, UserCredentials> = {
    admin: {
        username: process.env.TEST_ADMIN_USER || 'admin',
        password: process.env.TEST_ADMIN_PASS || 'nerdpos123',
        role: 'ADMIN',
    },
    manager: {
        username: process.env.TEST_MANAGER_USER || 'manager',
        password: process.env.TEST_MANAGER_PASS || 'nerdpos123',
        role: 'MANAGER',
        pin: '1234',
    },
    cashier: {
        username: process.env.TEST_CASHIER_USER || 'cashier1',
        password: process.env.TEST_CASHIER_PASS || 'nerdpos123',
        role: 'CASHIER',
    },
    waiter: {
        username: process.env.TEST_WAITER_USER || 'waiter1',
        password: process.env.TEST_WAITER_PASS || 'nerdpos123',
        role: 'WAITER',
    },
    kitchen: {
        username: process.env.TEST_KITCHEN_USER || 'kitchen1',
        password: process.env.TEST_KITCHEN_PASS || 'nerdpos123',
        role: 'KITCHEN',
    },
};

// Terminal identifiers
export const TERMINALS = {
    pos1: `TEST-TERMINAL-${TEST_RUN_ID}`,
    pos2: `TEST-TERMINAL-2-${TEST_RUN_ID}`,
};

// Test data defaults
export const TEST_DEFAULTS = {
    OPENING_BALANCE: 500.00,
    TAX_RATE: 0.15, // 15% VAT (Saudi Arabia)
    SERVICE_CHARGE_RATE: 0.10, // 10% service charge

    // Delivery zones
    DELIVERY_ZONES: [
        { zone: 1, fee: 50.00 },
        { zone: 2, fee: 70.00 },
        { zone: 3, fee: 90.00 },
    ],

    // Performance targets
    TRANSACTION_TIME_LIMIT: 45000, // 45 seconds
    SYNC_TIME_LIMIT: 30000, // 30 seconds for offline sync
};

// Console colors for output
export const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
};

// Logging utilities
export function log(emoji: string, message: string): void {
    console.log(`${emoji} ${new Date().toISOString().slice(11, 19)} | ${message}`);
}

export function logPass(message: string): void {
    log('✅', `${COLORS.green}${message}${COLORS.reset}`);
}

export function logFail(message: string): void {
    log('❌', `${COLORS.red}${message}${COLORS.reset}`);
}

export function logInfo(message: string): void {
    log('ℹ️', `${COLORS.blue}${message}${COLORS.reset}`);
}

export function logWarn(message: string): void {
    log('⚠️', `${COLORS.yellow}${message}${COLORS.reset}`);
}

export function logSection(title: string): void {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${COLORS.cyan}${COLORS.bright}${title}${COLORS.reset}`);
    console.log('='.repeat(60));
}

export function logStep(step: number, total: number, description: string): void {
    log('🔄', `${COLORS.magenta}[${step}/${total}]${COLORS.reset} ${description}`);
}
