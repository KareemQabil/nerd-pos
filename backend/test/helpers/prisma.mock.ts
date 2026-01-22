/**
 * Mock PrismaService for testing
 * Provides a mock implementation of Prisma client for unit/integration tests
 */

export const createMockPrismaService = (): any => ({
    // Transaction support
    $transaction: jest.fn((callback: any) => {
        if (typeof callback === 'function') {
            // Create a fresh mock transaction context (avoid circular reference)
            const txMock = {
                kitchenTicket: { create: jest.fn().mockResolvedValue({ id: 'mock-ticket' }) },
                kitchenTicketItem: { create: jest.fn().mockResolvedValue({ id: 'mock-item' }) },
            };
            return callback(txMock);
        }
        return Promise.resolve(callback);
    }),

    // Common query methods
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),

    // Connection methods
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),

    // Model mocks
    salesOrder: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
    },

    salesOrderItem: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        delete: jest.fn(),
    },

    kitchenTicket: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },

    kitchenTicketItem: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
    },

    kitchenStation: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
    },

    payment: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },

    paymentMethod: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },

    refund: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
    },

    session: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },

    user: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },

    product: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },

    customer: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },

    inventoryBatch: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    },

    inventoryMovement: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
    },

    storeSettings: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },

    auditLog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
    },

    complianceInvoice: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },

    discount: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
    },

    table: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
    },

    floor: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
    },

    deliveryOrder: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
});

export type MockPrismaService = ReturnType<typeof createMockPrismaService>;
