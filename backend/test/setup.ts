/**
 * Global Test Setup
 * Runs before all tests
 * Source: Phase 1 Test Infrastructure Plan
 */
import Decimal from 'decimal.js';

// Configure Decimal.js for consistent test behavior
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Extend Jest with custom matchers for Decimal.js
expect.extend({
  /**
   * Check if value is a Decimal instance
   * Usage: expect(result.price).toBeDecimal()
   */
  toBeDecimal(received) {
    const pass = received instanceof Decimal;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a Decimal instance`
          : `expected ${received} to be a Decimal instance`,
      pass,
    };
  },

  /**
   * Check if Decimal equals expected value
   * Usage: expect(result.price).toEqualDecimal('10.50')
   */
  toEqualDecimal(received, expected) {
    const receivedDecimal =
      received instanceof Decimal ? received : new Decimal(received);
    const expectedDecimal = new Decimal(expected);
    const pass = receivedDecimal.equals(expectedDecimal);

    return {
      message: () =>
        pass
          ? `expected ${receivedDecimal.toString()} not to equal ${expectedDecimal.toString()}`
          : `expected ${receivedDecimal.toString()} to equal ${expectedDecimal.toString()}`,
      pass,
    };
  },

  /**
   * Check if Decimal is greater than expected value
   * Usage: expect(result.total).toBeGreaterThanDecimal('100.00')
   */
  toBeGreaterThanDecimal(received, expected) {
    const receivedDecimal =
      received instanceof Decimal ? received : new Decimal(received);
    const expectedDecimal = new Decimal(expected);
    const pass = receivedDecimal.greaterThan(expectedDecimal);

    return {
      message: () =>
        pass
          ? `expected ${receivedDecimal.toString()} not to be greater than ${expectedDecimal.toString()}`
          : `expected ${receivedDecimal.toString()} to be greater than ${expectedDecimal.toString()}`,
      pass,
    };
  },
});

// Type declarations for custom matchers
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeDecimal(): R;
      toEqualDecimal(expected: string | number | Decimal): R;
      toBeGreaterThanDecimal(expected: string | number | Decimal): R;
    }
  }
}

// Global test setup
beforeAll(() => {
  // Silence console during tests (optional - comment out for debugging)
  // jest.spyOn(console, 'log').mockImplementation(() => {});
  // jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  // Cleanup after all tests
  jest.restoreAllMocks();
});
