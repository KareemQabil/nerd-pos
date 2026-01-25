/**
 * Common Test Helpers
 *
 * Utility functions for writing tests
 */

import { PrismaService } from '../../src/core/prisma/prisma.service';

/**
 * Create a test product in the database
 */
export async function createTestProduct(prisma: PrismaService, data?: any) {
  return prisma.product.create({
    data: {
      name: data?.name || 'Test Product',
      nameAr: data?.nameAr || 'منتج تجريبي',
      price: data?.price || 50,
      sku: data?.sku || `TEST-${Date.now()}`,
      categoryId: data?.categoryId || 'test-category',
      isActive: true,
      ...data
    }
  });
}

/**
 * Create a test order in the database
 */
export async function createTestOrder(prisma: PrismaService, data?: any) {
  const orderNumber = `TEST${Date.now()}`;

  return prisma.salesOrder.create({
    data: {
      orderNumber,
      orderType: data?.type || 'DINE_IN',
      status: data?.status || 'DRAFT',
      sessionId: data?.sessionId || 'test-session',
      businessDate: new Date(),
      itemSubtotal: data?.itemSubtotal || 100,
      serviceChargeRate: 0,
      serviceChargeAmount: 0,
      deliveryCharge: 0,
      subtotalBeforeTax: 100,
      taxRate: 0.15,
      taxAmount: 15,
      discountAmount: 0,
      grandTotal: 115,
      ...data
    }
  });
}

/**
 * Create a test user in the database
 */
export async function createTestUser(prisma: PrismaService, data?: any) {
  return prisma.user.create({
    data: {
      username: data?.username || `testuser-${Date.now()}`,
      email: data?.email || `test-${Date.now()}@example.com`,
      passwordHash: data?.passwordHash || 'hash',
      roleId: data?.roleId || 'test-role',
      isActive: true,
      ...data
    }
  });
}

/**
 * Create a test session in the database
 */
export async function createTestSession(prisma: PrismaService, data?: any) {
  return prisma.registerSession.create({
    data: {
      sessionNumber: `SESS${Date.now()}`,
      userId: data?.userId || 'test-user',
      terminalId: data?.terminalId || 'test-terminal',
      status: 'OPEN',
      openingBalance: data?.openingBalance || 1000,
      ...data
    }
  });
}

/**
 * Clean up all test data
 */
export async function cleanupTestData(prisma: PrismaService) {
  // Delete in order of dependencies
  await prisma.orderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.registerSession.deleteMany({});
  await prisma.inventoryMovement.deleteMany({});
  await prisma.inventoryBatch.deleteMany({});
  await prisma.inventoryItem.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Assert that a value is defined
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value === null || value === undefined) {
    throw new Error(message || `Value is ${value}`);
  }
  return value;
}

/**
 * Assert that an async function throws
 */
export async function assertThrows(
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (expectedError) {
      const errorMessage = (error as Error).message;
      if (typeof expectedError === 'string') {
        if (!errorMessage.includes(expectedError)) {
          throw new Error(
            `Expected error to include "${expectedError}" but got "${errorMessage}"`
          );
        }
      } else {
        if (!expectedError.test(errorMessage)) {
          throw new Error(
            `Expected error to match ${expectedError} but got "${errorMessage}"`
          );
        }
      }
    }
  }
}
