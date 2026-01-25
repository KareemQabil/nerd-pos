/**
 * Global Test Setup
 *
 * Runs before all test suites
 */

import { PrismaService } from '../src/core/prisma/prisma.service';

// Set test environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nerdpos_test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
global.console = {
  ...console,
  // Silence console.log during tests unless debugging
  log: jest.fn() as any,
};

beforeAll(async () => {
  // Any global setup can go here
  console.log('✓ Test environment initialized');
});

afterAll(async () => {
  // Any global cleanup can go here
  console.log('✓ Test environment cleaned up');
});
