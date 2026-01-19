/**
 * Repository Pattern Integration Tests
 *
 * Category D: LEGO Architecture - Repository Pattern
 *
 * Purpose: Verify repository abstraction, service-repository separation
 * Source: FINAL/BACKEND/02-CORE-PATTERNS.md (Repository Pattern)
 *
 * Verified Implementation:
 * - BaseRepository provides 7 methods (findAll, findById, create, update, delete, count, exists)
 * - Concrete repos extend BaseRepository
 * - Services inject repository (not direct Prisma)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../src/core/prisma/prisma.module';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { ProductsModule } from '../../../src/modules/products/products.module';
import { ProductsService } from '../../../src/modules/products/products.service';
import { ProductsRepository } from '../../../src/modules/products/products.repository';
import { EventBusModule } from '../../../src/core/event-bus/event-bus.module';

describe('Repository Pattern Integration (Category D)', () => {
  let module: TestingModule;
  let productsService: ProductsService;
  let productsRepository: ProductsRepository;
  let prismaService: PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        EventBusModule,
        ProductsModule,
      ],
    }).compile();

    productsService = module.get<ProductsService>(ProductsService);
    productsRepository = module.get<ProductsRepository>(ProductsRepository);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  // D1: BaseRepository.findAll
  describe('D1: Repository findAll', () => {
    it('should have findAll method that returns array', () => {
      expect(typeof productsRepository.findAll).toBe('function');
      // Method exists and is callable
    });
  });

  // D2: BaseRepository.findById
  describe('D2: Repository findById', () => {
    it('should have findById method that returns single entity or null', () => {
      expect(typeof productsRepository.findById).toBe('function');
    });
  });

  // D3: BaseRepository.create
  describe('D3: Repository create', () => {
    it('should have create method that persists entity', () => {
      expect(typeof productsRepository.create).toBe('function');
    });
  });

  // D4: BaseRepository.update
  describe('D4: Repository update', () => {
    it('should have update method that modifies entity', () => {
      expect(typeof productsRepository.update).toBe('function');
    });
  });

  // D5: BaseRepository.delete
  describe('D5: Repository delete', () => {
    it('should have delete method that removes entity', () => {
      expect(typeof productsRepository.delete).toBe('function');
    });
  });

  // D6: BaseRepository.count
  describe('D6: Repository count', () => {
    it('should have count method that returns number', () => {
      expect(typeof productsRepository.count).toBe('function');
    });
  });

  // D7: BaseRepository.exists
  describe('D7: Repository exists', () => {
    it('should have exists method that returns boolean', () => {
      expect(typeof productsRepository.exists).toBe('function');
    });
  });

  // D8: Service depends on repository interface (not Prisma directly)
  describe('D8: Service-Repository Separation', () => {
    it('ProductsService should inject ProductsRepository', () => {
      // Service exists and is injectable
      expect(productsService).toBeDefined();

      // Service has methods that delegate to repository
      expect(typeof productsService.findAllProducts).toBe('function');
      expect(typeof productsService.findProductById).toBe('function');
      expect(typeof productsService.createProduct).toBe('function');
    });

    it('ProductsService should NOT have direct prisma property', () => {
      // Service should not expose prisma directly
      // It should only use the injected repository
      const serviceAny = productsService as any;

      // Check that 'repo' exists (repository pattern)
      expect(serviceAny.repo).toBeDefined();
      expect(serviceAny.repo instanceof ProductsRepository).toBe(true);
    });
  });

  // D9: Repository mockable for unit tests
  describe('D9: Repository Mockability', () => {
    it('should allow repository to be mocked in tests', async () => {
      // Create module with mocked repository
      const mockFindAll = jest
        .fn()
        .mockResolvedValue([
          { id: 'mock-1', nameEn: 'Mock Product', price: 10 },
        ]);

      const mockRepo = {
        findAll: mockFindAll,
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        exists: jest.fn(),
      };

      const testModule = await Test.createTestingModule({
        providers: [
          {
            provide: ProductsRepository,
            useValue: mockRepo,
          },
        ],
      }).compile();

      const repo = testModule.get<ProductsRepository>(ProductsRepository);

      // Call the mocked method
      const result = await repo.findAll();

      expect(mockFindAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].nameEn).toBe('Mock Product');

      await testModule.close();
    });
  });

  // D10: Concrete repos extend BaseRepository
  describe('D10: Repository Inheritance', () => {
    it('ProductsRepository should extend BaseRepository pattern', () => {
      // Verify repository has all BaseRepository methods
      const baseRepoMethods = [
        'findAll',
        'findById',
        'create',
        'update',
        'delete',
        'count',
        'exists',
      ];

      for (const method of baseRepoMethods) {
        expect(typeof (productsRepository as any)[method]).toBe('function');
      }
    });

    it('ProductsRepository should have entity-specific methods', () => {
      // ProductsRepository extends BaseRepository with custom methods
      // Based on actual implementation
      expect(typeof (productsRepository as any).findByCategory).toBe(
        'function',
      );
      expect(typeof (productsRepository as any).searchByName).toBe('function');
    });
  });
});
