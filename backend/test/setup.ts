/**
 * Global Test Setup
 *
 * Runs before all test suites
 */

import Decimal from 'decimal.js';
import { PrismaService } from '../src/core/prisma/prisma.service';

// Set test environment variables
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/nerdpos_test';
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = 'test-jwt-secret-32-characters-minimum';
}

// Increase timeout for integration tests
jest.setTimeout(30000);

const toDecimal = (value: any): Decimal => {
  if (value instanceof Decimal) {
    return value;
  }
  if (value && value.constructor && value.constructor.name === 'Decimal') {
    return new Decimal(value);
  }
  return new Decimal(value);
};

expect.extend({
  toBeDecimal(received: any) {
    const pass =
      received instanceof Decimal ||
      (received &&
        received.constructor &&
        received.constructor.name === 'Decimal');
    return {
      pass,
      message: () =>
        pass
          ? 'expected value not to be a Decimal instance'
          : `expected ${received} to be a Decimal instance`,
    };
  },
  toEqualDecimal(received: any, expected: string | number) {
    try {
      const pass = toDecimal(received).equals(toDecimal(expected));
      return {
        pass,
        message: () =>
          pass
            ? `expected ${received} not to equal ${expected}`
            : `expected ${received} to equal ${expected}`,
      };
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `expected ${received} to be comparable as Decimal: ${error}`,
      };
    }
  },
  toBeGreaterThanDecimal(received: any, expected: string | number) {
    try {
      const pass = toDecimal(received).greaterThan(toDecimal(expected));
      return {
        pass,
        message: () =>
          pass
            ? `expected ${received} not to be greater than ${expected}`
            : `expected ${received} to be greater than ${expected}`,
      };
    } catch (error) {
      return {
        pass: false,
        message: () =>
          `expected ${received} to be comparable as Decimal: ${error}`,
      };
    }
  },
});

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
