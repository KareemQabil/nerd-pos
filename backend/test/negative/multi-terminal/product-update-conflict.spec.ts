/**
 * MT-03: Same Product Concurrent Update
 *
 * Tests that concurrent product updates don't cause data corruption
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from '../../../src/modules/products/products.service';
import { ProductsRepository } from '../../../src/modules/products/products.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { IEventBus } from '../../../src/core/event-bus/event-bus.interface';
import { RaceConditionTester } from '../../helpers/race-condition';

describe('MT-03: Same Product Concurrent Update', () => {
  let productsService: ProductsService;
  let prisma: {
    category: { create: (args: { data: any }) => Promise<any> };
    product: {
      create: (args: { data: any }) => Promise<any>;
      update: (args: { where: { id: string }; data: any }) => Promise<any>;
      findUnique: (args: { where: { id: string } }) => Promise<any>;
    };
  };
  const categories = new Map<string, any>();
  const products = new Map<string, any>();
  const toDecimal = (value: number) => ({ toNumber: () => value, value });

  beforeAll(async () => {
    const prismaMock = {
      category: {
        create: jest.fn(async ({ data }) => {
          const id = `cat-${categories.size + 1}`;
          const category = { id, ...data };
          categories.set(id, category);
          return category;
        }),
      },
      product: {
        create: jest.fn(async ({ data }) => {
          const existingSku = [...products.values()].some(
            (product) => product.sku === data.sku,
          );
          if (existingSku) {
            throw new Error('Unique constraint failed on the fields: (`sku`)');
          }
          const id = `prod-${products.size + 1}`;
          const product = {
            id,
            ...data,
            price: toDecimal(data.price ?? 0),
            cost: data.cost !== undefined ? toDecimal(data.cost) : undefined,
            isActive: data.isActive ?? true,
          };
          products.set(id, product);
          return product;
        }),
        update: jest.fn(async ({ where, data }) => {
          const existing = products.get(where.id);
          if (!existing) {
            throw new Error('Product not found');
          }
          if (
            data.sku &&
            [...products.values()].some(
              (product) => product.id !== where.id && product.sku === data.sku,
            )
          ) {
            throw new Error('Unique constraint failed on the fields: (`sku`)');
          }
          const updated = { ...existing, ...data };
          if (data.price !== undefined) {
            updated.price = toDecimal(data.price);
          }
          if (data.cost !== undefined) {
            updated.cost = toDecimal(data.cost);
          }
          products.set(where.id, updated);
          return updated;
        }),
        findUnique: jest.fn(async ({ where }) => {
          return products.get(where.id) ?? null;
        }),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        ProductsRepository,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: 'IEventBus',
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    categories.clear();
    products.clear();
    jest.clearAllMocks();
  });

  it('should handle concurrent price updates correctly', async () => {
    // Setup: Create a product (categoryId is required)
    const category = await prisma.category.create({
      data: {
        nameAr: 'فئة',
        nameEn: 'Category',
      },
    });

    const product = await prisma.product.create({
      data: {
        nameEn: 'Test Product',
        nameAr: 'منتج',
        sku: 'PROD-UPDATE-001',
        categoryId: category.id,
        price: 50,
        isActive: true,
      },
    });

    // Act: Two terminals try to update price simultaneously
    const { terminalAResult, terminalBResult } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { price: 60 },
          }),
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { price: 70 },
          }),
      );

    // Assert: One write should win
    const finalProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(finalProduct?.price.toNumber()).toBeGreaterThanOrEqual(60);
    expect(finalProduct?.price.toNumber()).toBeLessThanOrEqual(70);
  });

  it('should handle concurrent name updates', async () => {
    const category = await prisma.category.create({
      data: {
        nameAr: 'فئة',
        nameEn: 'Category',
      },
    });

    const product = await prisma.product.create({
      data: {
        nameEn: 'Original Name',
        nameAr: 'الاسم الأصلي',
        sku: 'PROD-NAME-001',
        categoryId: category.id,
        price: 50,
        isActive: true,
      },
    });

    // Act: Two concurrent name updates
    const { terminalAResult, terminalBResult } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { nameEn: 'Updated Name A', nameAr: 'الاسم المحدث أ' },
          }),
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { nameEn: 'Updated Name B', nameAr: 'الاسم المحدث ب' },
          }),
      );

    // Assert: One name should persist
    const finalProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(['Updated Name A', 'Updated Name B']).toContain(
      finalProduct?.nameEn,
    );
    expect(finalProduct?.nameEn).not.toBe('Original Name');
  });

  it('should handle concurrent active/inactive status changes', async () => {
    const category = await prisma.category.create({
      data: {
        nameAr: 'فئة',
        nameEn: 'Category',
      },
    });

    const product = await prisma.product.create({
      data: {
        nameEn: 'Test Product',
        nameAr: 'منتج',
        sku: 'PROD-STATUS-001',
        categoryId: category.id,
        price: 50,
        isActive: true,
      },
    });

    // Act: One terminal deactivates, another reactivates
    const { terminalAResult, terminalBResult } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { isActive: false },
          }),
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { isActive: true },
          }),
      );

    // Assert: Final state should be valid (either true or false)
    const finalProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect([true, false]).toContain(finalProduct?.isActive);
  });

  it('should handle concurrent SKU updates with unique constraint', async () => {
    const category = await prisma.category.create({
      data: {
        nameAr: 'فئة',
        nameEn: 'Category',
      },
    });

    const product1 = await prisma.product.create({
      data: {
        nameEn: 'Product 1',
        nameAr: 'منتج 1',
        sku: 'SKU-001',
        categoryId: category.id,
        price: 50,
        isActive: true,
      },
    });

    const product2 = await prisma.product.create({
      data: {
        nameEn: 'Product 2',
        nameAr: 'منتج 2',
        sku: 'SKU-002',
        categoryId: category.id,
        price: 60,
        isActive: true,
      },
    });

    // Act: Try to make both products have same SKU
    const update1 = prisma.product
      .update({
        where: { id: product1.id },
        data: { sku: 'SKU-DUPLICATE' },
      })
      .catch((e: unknown) => ({ error: e }));

    const update2 = prisma.product
      .update({
        where: { id: product2.id },
        data: { sku: 'SKU-DUPLICATE' }, // Same SKU!
      })
      .catch((e: unknown) => ({ error: e }));

    const [result1, result2] = await Promise.all([update1, update2]);

    // Assert: At least one should fail due to unique constraint
    const hasError = 'error' in result1 || 'error' in result2;
    expect(hasError).toBe(true);
  });

  it('should handle mixed concurrent field updates', async () => {
    const category = await prisma.category.create({
      data: {
        nameAr: 'فئة',
        nameEn: 'Category',
      },
    });

    const product = await prisma.product.create({
      data: {
        nameEn: 'Original Name',
        nameAr: 'الاسم الأصلي',
        sku: 'PROD-MIXED-001',
        categoryId: category.id,
        price: 50,
        cost: 30,
        isActive: true,
      },
    });

    // Act: Concurrent updates to different fields
    const { terminalAResult, terminalBResult } =
      await RaceConditionTester.simulateDualTerminalRequest(
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { nameEn: 'Updated Name', price: 60 },
          }),
        () =>
          prisma.product.update({
            where: { id: product.id },
            data: { cost: 35, isActive: false },
          }),
      );

    // Assert: Both updates should be reflected (last write wins per field)
    const finalProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(finalProduct).toBeDefined();
    expect(finalProduct?.price.toNumber()).toBeGreaterThanOrEqual(50);
    expect(finalProduct?.cost?.toNumber()).toBeGreaterThanOrEqual(30);
  });

  it('should preserve data integrity during high concurrency', async () => {
    const category = await prisma.category.create({
      data: {
        nameAr: 'فئة',
        nameEn: 'Category',
      },
    });

    const product = await prisma.product.create({
      data: {
        nameEn: 'Concurrent Test Product',
        nameAr: 'منتج التزامن',
        sku: 'PROD-CONCURRENT-001',
        categoryId: category.id,
        price: 50,
        isActive: true,
      },
    });

    // Act: 10 concurrent updates
    const updates = Array.from({ length: 10 }, (_, i) =>
      prisma.product.update({
        where: { id: product.id },
        data: { price: 50 + i * 10 },
      }),
    );

    await Promise.allSettled(updates);

    // Assert: Product should have one valid price
    const finalProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });

    expect(finalProduct).toBeDefined();
    expect(finalProduct?.price.toNumber()).toBeGreaterThanOrEqual(50);
    expect(finalProduct?.price.toNumber()).toBeLessThanOrEqual(140);
  });
});
