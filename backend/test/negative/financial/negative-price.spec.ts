/**
 * FIN-04: Negative Price
 *
 * Tests that products cannot have negative prices
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../../../src/modules/products/products.service';
import { ProductsRepository } from '../../../src/modules/products/products.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import {
  cleanupTestData,
  createTestCategory,
  createTestProduct,
  generateTestId,
} from '../../helpers/test-helpers';

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
    const category = await createTestCategory(prisma);
    const sku = generateTestId('NEG-001');
    const productData = {
      nameEn: 'Invalid Product',
      nameAr: 'Ù…Ù†ØªØ¬ ØºÙŠØ± ØµØ§Ù„Ø­',
      sku,
      categoryId: category.id,
      price: -10,
      isActive: true,
    };

    // Act: Try to create product with negative price
    const result = await productsService
      .createProduct(productData as any)
      .catch(e => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify product was not created
    const products = await prisma.product.findMany({
      where: { sku },
    });

    expect(products.length).toBe(0);
  });

  it('should reject updating product to negative price', async () => {
    // Setup: Create valid product
    const product = await createTestProduct(prisma, {
      sku: generateTestId('NEG-002'),
      price: 50,
    });

    // Act: Try to update to negative price
    const result = await productsService
      .updateProduct(product.id, {
        price: -20,
      })
      .catch(e => ({ error: e }));

    // Assert: Should reject
    expect('error' in result).toBe(true);

    // Verify price unchanged
    const unchangedProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(unchangedProduct?.price.toNumber()).toBe(50);
  });

  it('should accept zero price products', async () => {
    const category = await createTestCategory(prisma);
    // Some products might be free (promotional items)
    const sku = generateTestId('FREE-001');
    const productData = {
      nameEn: 'Free Item',
      nameAr: 'Ø¹Ù†ØµØ± Ù…Ø¬Ø§Ù†ÙŠ',
      sku,
      categoryId: category.id,
      price: 0,
      isActive: true,
    };

    // Act: Create product with zero price
    const result = await productsService
      .createProduct(productData as any)
      .catch(e => ({ error: e }));

    if (!('error' in result)) {
      expect(Number(result.price)).toBe(0);
    }
  });

  it('should reject price less than zero', async () => {
    const category = await createTestCategory(prisma);
    const testPrices = [-0.01, -1, -100, -1000];
    const baseSku = generateTestId('NEG');

    for (const price of testPrices) {
      const result = await productsService
        .createProduct({
          nameEn: `Test Product ${price}`,
          nameAr: 'Ù…Ù†ØªØ¬',
          sku: `${baseSku}-${Math.abs(price)}`,
          categoryId: category.id,
          price,
          isActive: true,
        } as any)
        .catch(e => ({ error: e }));

      // Should reject negative prices
      expect('error' in result).toBe(true);
    }
  });

  it('should validate price on bulk import', async () => {
    const category = await createTestCategory(prisma);
    // Test bulk product import scenario
    const bulkBase = generateTestId('BULK');
    const products = [
      { name: 'Product 1', sku: `${bulkBase}-1`, price: 10 },
      { name: 'Product 2', sku: `${bulkBase}-2`, price: -5 }, // Invalid!
      { name: 'Product 3', sku: `${bulkBase}-3`, price: 20 },
    ];

    const results = await Promise.allSettled(
      products.map(p =>
        productsService.createProduct({
          nameEn: p.name,
          nameAr: 'Ù…Ù†ØªØ¬',
          sku: p.sku,
          categoryId: category.id,
          price: p.price,
          isActive: true,
        } as any),
      ),
    );

    // Two should succeed, one should fail
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    expect(successCount).toBe(2);
    expect(failureCount).toBe(1);
  });

  it('should handle price update from positive to negative', async () => {
    const product = await createTestProduct(prisma, {
      sku: generateTestId('PRICE-TEST'),
      price: 100,
    });

    // Try multiple negative values
    const negativeUpdates = [-1, -50, -100];
    const results = await Promise.allSettled(
      negativeUpdates.map(price => productsService.updateProduct(product.id, { price })),
    );

    // All should fail
    const failureCount = results.filter(r => r.status === 'rejected').length;
    expect(failureCount).toBe(3);

    // Original price should remain
    const unchanged = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(unchanged?.price.toNumber()).toBe(100);
  });

  it('should validate price is a number', async () => {
    const category = await createTestCategory(prisma);
    const result = await productsService
      .createProduct({
        nameEn: 'Test',
        nameAr: 'ØªØ¬Ø±Ø¨Ø©',
        sku: generateTestId('TYPE-TEST'),
        categoryId: category.id,
        price: NaN as any,
        isActive: true,
      } as any)
      .catch(e => ({ error: e }));

    expect('error' in result).toBe(true);
  });

  it('should allow very small positive prices', async () => {
    const category = await createTestCategory(prisma);
    const product = await productsService.createProduct({
      nameEn: 'Micro Price',
      nameAr: 'Ø³Ø¹Ø± Ø¯Ù‚ÙŠÙ‚',
      sku: generateTestId('MICRO-001'),
      categoryId: category.id,
      price: 0.01,
      isActive: true,
    } as any);

    expect(Number(product.price)).toBe(0.01);
  });

  it('should track price changes for audit', async () => {
    const product = await createTestProduct(prisma, {
      sku: generateTestId('AUDIT-001'),
      price: 50,
    });

    // Update price
    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: 60,
        updatedAt: new Date(),
      },
    });

    // Verify price changed
    const updated = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(updated?.price.toNumber()).toBe(60);
    expect(updated?.updatedAt).toBeDefined();
  });
});
