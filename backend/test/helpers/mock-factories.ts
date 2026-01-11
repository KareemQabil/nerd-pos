/**
 * Mock Factories for Test Data Generation
 * Source: Phase 1 Test Infrastructure Plan
 */
import { faker } from '@faker-js/faker';
import Decimal from 'decimal.js';

/**
 * Creates mock product data for testing
 */
export const createMockProduct = (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    sku: faker.string.alphanumeric(10).toUpperCase(),
    nameAr: faker.commerce.productName() + ' عربي',
    nameEn: faker.commerce.productName(),
    price: new Decimal(faker.commerce.price({ min: 10, max: 1000 })),
    cost: new Decimal(faker.commerce.price({ min: 5, max: 500 })),
    categoryId: faker.string.uuid(),
    isActive: true,
    trackInventory: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Creates mock category data for testing
 */
export const createMockCategory = (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    nameAr: faker.commerce.department() + ' قسم',
    nameEn: faker.commerce.department(),
    sortOrder: faker.number.int({ min: 1, max: 100 }),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Creates mock sales order data for testing
 */
export const createMockSalesOrder = (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    orderNumber: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
    orderType: 'QUICK_SALE',
    orderDate: new Date(),
    subtotal: new Decimal('100.00'),
    taxAmount: new Decimal('15.00'),
    discountAmount: new Decimal('0.00'),
    grandTotal: new Decimal('115.00'),
    status: 'COMPLETED',
    paymentStatus: 'PAID',
    createdBy: faker.string.uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Creates mock user data for testing
 */
export const createMockUser = (overrides?: Partial<any>) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
        id: faker.string.uuid(),
        username: faker.internet.username({ firstName, lastName }),
        password: '$2b$10$mockedhashedpassword', // Placeholder bcrypt hash
        nameAr: `${firstName} ${lastName}`,
        nameEn: `${firstName} ${lastName}`,
        email: faker.internet.email({ firstName, lastName }),
        phone: faker.phone.number(),
        roleId: faker.string.uuid(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
};

/**
 * Creates mock session data for testing
 */
export const createMockSession = (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    sessionNumber: faker.number.int({ min: 1000, max: 9999 }),
    userId: faker.string.uuid(),
    openedAt: new Date(),
    closedAt: null,
    openingBalance: new Decimal('100.00'),
    closingBalance: null,
    expectedBalance: null,
    variance: null,
    status: 'OPEN',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Creates mock inventory item data for testing
 */
export const createMockInventoryItem = (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    productId: faker.string.uuid(),
    warehouseId: faker.string.uuid(),
    quantityOnHand: new Decimal('100'),
    reservedQuantity: new Decimal('0'),
    minQuantity: new Decimal('10'),
    maxQuantity: new Decimal('500'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

/**
 * Creates mock payment data for testing
 */
export const createMockPayment = (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    orderId: faker.string.uuid(),
    method: 'CASH',
    amount: new Decimal('100.00'),
    referenceNumber: null,
    status: 'COMPLETED',
    createdAt: new Date(),
    ...overrides,
});

/**
 * Creates mock customer data for testing
 */
export const createMockCustomer = (overrides?: Partial<any>) => ({
    id: faker.string.uuid(),
    nameAr: faker.person.fullName(),
    nameEn: faker.person.fullName(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    loyaltyPoints: new Decimal('0'),
    loyaltyTier: 'BRONZE',
    visitsCount: 0,
    totalSpent: new Decimal('0'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});
