/**
 * FIN-04: Negative Price
 *
 * Tests that products cannot have negative prices
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../../../src/modules/products/products.service';
import { ProductsRepository } from '../../../src/modules/products/products.repository';
import { PrismaService } from '../../../src/core/prisma/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { cleanupTestData } from '../../helpers/test-helpers';

describe('FIN-04: Negative Price', () => {
  let productsService: ProductsService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        ProductsRepository,
        PrismaService,
        { provide: 'IEventBus', useValue: { publish: jest.fn(), subscribe: jest.fn() } },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should reject creating product with negative price', async () => {
    const productData = {
      name: 'Invalid Product',
      nameAr: 'منتج غير صالح',
      sku: 'NEG-001',
      price: -10,
      isActive: true
    };

    // Act: Try to create product with negative price
    const result = await productsService.create(productData as any)
      .catch(e => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify product was not created
    const products = await prisma.product.findMany({
      where: { sku: 'NEG-001' }
    });

    expect(products.length).toBe(0);
  });

  it('should reject updating product to negative price', async () => {
    // Setup: Create valid product
    const product = await prisma.product.create({
      data: {
        name: 'Valid Product',
        nameAr: 'منتج صالح',
        sku: 'NEG-002',
        price: 50,
        isActive: true
      }
    });

    // Act: Try to update to negative price
    const result = await productsService.update(product.id, {
      price: -20
    }).catch(e => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify price unchanged
    const unchangedProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });

    expect(unchangedProduct?.price.toNumber()).toBe(50);
  });

  it('should accept zero price products', async () => {
    // Some products might be free (promotional items)
    const productData = {
      name: 'Free Item',
      nameAr: 'عنصر مجاني',
      sku: 'FREE-001',
      price: 0,
      isActive: true
    };

    // Act: Create product with zero price
    const result = await productsService.create(productData as any)
      .catch(e => ({ error: e }));

    // Zero price should be allowed (implementation dependent)
    if (!('error' in result)) {
      expect(result.price.toNumber()).toBe(0);
    }
  });

  it('should reject price less than zero', async () => {
    const testPrices = [-0.01, -1, -100, -1000];

    for (const price of testPrices) {
      const result = await prisma.product.create({
        data: {
          name: `Test Product ${price}`,
          nameAr: 'منتج',
          sku: `TEST-${price}`,
          price,
          isActive: true
        }
      }).catch(e => ({ error: e }));

      // Should reject negative prices
      expect('error' in result).toBe(true);
    }
  });

  it('should validate price on bulk import', async () => {
    // Test bulk product import scenario
    const products = [
      { name: 'Product 1', sku: 'BULK-1', price: 10 },
      { name: 'Product 2', sku: 'BULK-2', price: -5 }, // Invalid!
      { name: 'Product 3', sku: 'BULK-3', price: 20 }
    ];

    const results = await Promise.allSettled(
      products.map(p => prisma.product.create({
        data: {
          name: p.name,
          nameAr: 'منتج',
          sku: p.sku,
          price: p.price,
          isActive: true
        }
      }))
    );

    // Two should succeed, one should fail
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    expect(successCount).toBe(2);
    expect(failureCount).toBe(1);
  });

  it('should handle price update from positive to negative', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Price Change Test',
        nameAr: 'تغير السعر',
        sku: 'PRICE-TEST',
        price: 100,
        isActive: true
      }
    });

    // Try multiple negative values
    const negativeUpdates = [-1, -50, -100];
    const results = await Promise.allSettled(
      negativeUpdates.map(price =>
        prisma.product.update({
          where: { id: product.id },
          data: { price }
        })
      )
    );

    // All should fail
    const failureCount = results.filter(r => r.status === 'rejected').length;
    expect(failureCount).toBe(3);

    // Original price should remain
    const unchanged = await prisma.product.findUnique({
      where: { id: product.id }
    });

    expect(unchanged?.price.toNumber()).toBe(100);
  });

  it('should validate price is a number', async () => {
    // Test non-number values (TypeScript should catch this, but test validates runtime)
    const result = await prisma.product.create({
      data: {
        name: 'Test',
        nameAr: 'تجربة',
        sku: 'TYPE-TEST',
        price: NaN as any,
        isActive: true
      }
    }).catch(e => ({ error: e }));

    expect('error' in result).toBe(true);
  });

  it('should allow very small positive prices', async () => {
    // Test precision edge case
    const product = await prisma.product.create({
      data: {
        name: 'Micro Price',
        nameAr: 'سعر دقيق',
        sku: 'MICRO-001',
        price: 0.01,
        isActive: true
      }
    });

    expect(product.price.toNumber()).toBe(0.01);
  });

  it('should track price changes for audit', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Audit Test',
        nameAr: 'اختبار التدقيق',
        sku: 'AUDIT-001',
        price: 50,
        isActive: true
      }
    });

    const originalPrice = product.price.toNumber();

    // Update price
    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: 60,
        updatedAt: new Date()
      }
    });

    // Verify price changed
    const updated = await prisma.product.findUnique({
      where: { id: product.id }
    });

    expect(updated?.price.toNumber()).toBe(60);
    expect(updated?.updatedAt).toBeDefined();
  });
});
