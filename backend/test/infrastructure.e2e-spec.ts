/**
 * Test Infrastructure Verification
 * Validates that test setup and custom matchers work correctly
 */
import Decimal from 'decimal.js';
import {
  createMockProduct,
  createMockUser,
  createMockSalesOrder,
} from './helpers/mock-factories';
import {
  createMockRepository,
  createMockEventBus,
} from './helpers/repository-mock';

describe('Test Infrastructure', () => {
  describe('Decimal.js Custom Matchers', () => {
    it('toBeDecimal() should pass for Decimal instances', () => {
      const price = new Decimal('10.50');
      expect(price).toBeDecimal();
    });

    it('toEqualDecimal() should compare Decimal values correctly', () => {
      const price = new Decimal('10.50');
      expect(price).toEqualDecimal('10.50');
      expect(price).toEqualDecimal(10.5);
    });

    it('toBeGreaterThanDecimal() should compare values correctly', () => {
      const total = new Decimal('100.00');
      expect(total).toBeGreaterThanDecimal('50.00');
    });

    it('should handle Decimal.js calculations with precision', () => {
      const price = new Decimal('19.99');
      const quantity = new Decimal('3');
      const total = price.times(quantity);

      expect(total).toEqualDecimal('59.97');
    });
  });

  describe('Mock Factories', () => {
    it('should create mock product with Decimal price', () => {
      const product = createMockProduct();

      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('nameAr');
      expect(product).toHaveProperty('nameEn');
      expect(product.price).toBeDecimal();
    });

    it('should create mock product with overrides', () => {
      const product = createMockProduct({
        nameEn: 'Test Product',
        price: new Decimal('50.00'),
      });

      expect(product.nameEn).toBe('Test Product');
      expect(product.price).toEqualDecimal('50.00');
    });

    it('should create mock user with required fields', () => {
      const user = createMockUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('roleId');
    });

    it('should create mock sales order with Decimal totals', () => {
      const order = createMockSalesOrder();

      expect(order.subtotal).toBeDecimal();
      expect(order.taxAmount).toBeDecimal();
      expect(order.grandTotal).toBeDecimal();
      expect(order.grandTotal).toEqualDecimal('115.00');
    });
  });

  describe('Repository Mocks', () => {
    it('should create mock repository with jest functions', () => {
      const repo = createMockRepository();

      expect(repo.create).toBeDefined();
      expect(repo.findById).toBeDefined();
      expect(repo.update).toBeDefined();
      expect(repo.delete).toBeDefined();
      expect(typeof repo.create).toBe('function');
    });

    it('should track mock function calls', async () => {
      const repo = createMockRepository();
      const mockProduct = createMockProduct();

      repo.findById.mockResolvedValue(mockProduct);

      const result = await repo.findById('test-id');

      expect(repo.findById).toHaveBeenCalledWith('test-id');
      expect(result).toEqual(mockProduct);
    });
  });

  describe('EventBus Mocks', () => {
    it('should create mock event bus', () => {
      const eventBus = createMockEventBus();

      expect(eventBus.publish).toBeDefined();
      expect(eventBus.subscribe).toBeDefined();
      expect(typeof eventBus.publish).toBe('function');
    });

    it('should track event publications', async () => {
      const eventBus = createMockEventBus();

      await eventBus.publish('OrderCreated', { orderId: '123' });

      expect(eventBus.publish).toHaveBeenCalledWith('OrderCreated', {
        orderId: '123',
      });
    });
  });
});
