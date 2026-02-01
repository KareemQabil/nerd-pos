/**
 * Common Test Helpers
 *
 * Utility functions for writing tests
 */

import { PrismaService } from '../../src/core/prisma/prisma.service';

/**
 * Create a test category in the database
 */
export async function createTestCategory(prisma: PrismaService, data?: any) {
  return prisma.category.create({
    data: {
      nameEn: data?.nameEn || data?.name || 'Test Category',
      nameAr: data?.nameAr || 'Test Category AR',
      sortOrder: data?.sortOrder ?? 0,
      isActive: data?.isActive ?? true,
      ...data,
    },
  });
}

/**
 * Create a test product in the database
 */
export async function createTestProduct(prisma: PrismaService, data?: any) {
  const categoryId =
    data?.categoryId || (await createTestCategory(prisma, data?.category)).id;

  return prisma.product.create({
    data: {
      sku: data?.sku || `TEST-${Date.now()}`,
      nameEn: data?.nameEn || data?.name || 'Test Product',
      nameAr: data?.nameAr || 'Test Product AR',
      categoryId,
      price: data?.price ?? 50,
      isActive: data?.isActive ?? true,
      ...data,
    },
  });
}

/**
 * Create a test order in the database
 */
export async function createTestOrder(prisma: PrismaService, data?: any) {
  const orderNumber = `TEST${Date.now()}`;
  const sessionId =
    data?.sessionId || (await createTestSession(prisma, data?.session)).id;

  return prisma.salesOrder.create({
    data: {
      orderNumber,
      orderType: data?.orderType || data?.type || 'DINE_IN',
      status: data?.status || 'DRAFT',
      sessionId,
      businessDate: data?.businessDate || new Date(),
      itemSubtotal: data?.itemSubtotal ?? 100,
      serviceChargeRate: data?.serviceChargeRate ?? 0,
      serviceChargeAmount: data?.serviceChargeAmount ?? 0,
      deliveryCharge: data?.deliveryCharge ?? 0,
      subtotalBeforeTax: data?.subtotalBeforeTax ?? 100,
      taxRate: data?.taxRate ?? 0.15,
      taxAmount: data?.taxAmount ?? 15,
      discountAmount: data?.discountAmount ?? 0,
      grandTotal: data?.grandTotal ?? 115,
      ...data,
    },
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
      password: data?.password || 'test-password',
      nameEn: data?.nameEn || 'Test User',
      nameAr: data?.nameAr || 'Test User AR',
      role: data?.role || 'CASHIER',
      roleId: data?.roleId,
      isActive: data?.isActive ?? true,
      ...data,
    },
  });
}

/**
 * Create a test session in the database
 */
export async function createTestSession(prisma: PrismaService, data?: any) {
  return prisma.registerSession.create({
    data: {
      id: data?.id,
      userId: data?.userId || 'test-user',
      terminalId: data?.terminalId || 'test-terminal',
      businessDate: data?.businessDate || new Date(),
      openingBalance: data?.openingBalance ?? 1000,
      status: data?.status || 'OPEN',
      ...data,
    },
  });
}

async function safeDelete(operation: () => Promise<unknown>) {
  try {
    await operation();
  } catch {
    // Best-effort cleanup for shared DBs.
  }
}

/**
 * Clean up all test data (best-effort)
 */
export async function cleanupTestData(prisma: PrismaService) {
  await safeDelete(() => prisma.payment.deleteMany({}));
  await safeDelete(() => prisma.orderItem.deleteMany({}));
  await safeDelete(() => prisma.salesOrder.deleteMany({}));
  await safeDelete(() => prisma.inventoryMovement.deleteMany({}));
  await safeDelete(() => prisma.inventoryBatch.deleteMany({}));
  await safeDelete(() => prisma.inventoryItem.deleteMany({}));
  await safeDelete(() => prisma.product.deleteMany({}));
  await safeDelete(() => prisma.user.deleteMany({}));
}

/**
 * Wait for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string,
): T {
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
  expectedError?: string | RegExp,
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
            `Expected error to include "${expectedError}" but got "${errorMessage}"`,
          );
        }
      } else {
        if (!expectedError.test(errorMessage)) {
          throw new Error(
            `Expected error to match ${expectedError} but got "${errorMessage}"`,
          );
        }
      }
    }
  }
}
