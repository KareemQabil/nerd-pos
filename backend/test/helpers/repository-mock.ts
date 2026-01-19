/**
 * Repository Mock Helper
 * Creates mocked repository instances for unit testing
 * Source: Phase 1 Test Infrastructure Plan
 */

/**
 * Creates a mock repository with common methods
 * Use with Jest's mock type: jest.Mocked<ReturnType<typeof createMockRepository>>
 */
export function createMockRepository<T = any>() {
  return {
    create: jest.fn() as jest.MockedFunction<(data: Partial<T>) => Promise<T>>,
    findById: jest.fn() as jest.MockedFunction<
      (id: string) => Promise<T | null>
    >,
    findOne: jest.fn() as jest.MockedFunction<
      (filter: any) => Promise<T | null>
    >,
    findAll: jest.fn() as jest.MockedFunction<(filter?: any) => Promise<T[]>>,
    update: jest.fn() as jest.MockedFunction<
      (id: string, data: Partial<T>) => Promise<T>
    >,
    delete: jest.fn() as jest.MockedFunction<(id: string) => Promise<void>>,
    count: jest.fn() as jest.MockedFunction<(filter?: any) => Promise<number>>,
  };
}

/**
 * Creates a mock EventBus for testing event-driven flows
 */
export function createMockEventBus() {
  return {
    publish: jest.fn() as jest.MockedFunction<
      (event: string, payload: any) => Promise<void>
    >,
    subscribe: jest.fn() as jest.MockedFunction<
      (event: string, handler: any) => void
    >,
    unsubscribe: jest.fn() as jest.MockedFunction<
      (event: string, handler: any) => void
    >,
  };
}

/**
 * Creates a mock PrismaService for testing
 */
export function createMockPrisma(): Record<string, any> {
  const mockRepo = createMockRepository();
  return {
    product: { ...mockRepo },
    category: { ...mockRepo },
    salesOrder: { ...mockRepo },
    orderItem: { ...mockRepo },
    payment: { ...mockRepo },
    user: { ...mockRepo },
    registerSession: { ...mockRepo },
    customer: { ...mockRepo },
    inventoryItem: { ...mockRepo },
    $transaction: jest.fn((callback: any) => Promise.resolve(callback({}))),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}
