# Backend Testing Strategy

**Framework**: Jest  
**Types**: Unit → Integration → E2E  
**Coverage**: 80% minimum  

---

## **UNIT TESTS (Services)**

```typescript
// products.service.spec.ts
import { Test } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { ProductRepository } from './product.repository';
import Decimal from 'decimal.js';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductRepository>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get(ProductsService);
    repository = module.get(ProductRepository);
  });

  describe('createProduct', () => {
    it('should create product with correct price', async () => {
      const dto = {
        name: 'Test Product',
        price: 100,
        categoryId: 'cat-1',
      };

      repository.create.mockResolvedValue({
        id: 'prod-1',
        ...dto,
        price: new Decimal(100),
      });

      const result = await service.create(dto);

      expect(result.price).toBeInstanceOf(Decimal);
      expect(result.price.toString()).toBe('100');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Product',
          price: expect.any(Decimal),
        })
      );
    });

    it('should throw error for negative price', async () => {
      const dto = { name: 'Test', price: -10, categoryId: 'cat-1' };
      
      await expect(service.create(dto)).rejects.toThrow('Price must be positive');
    });
  });
});
```

---

## **INTEGRATION TESTS (Controller + Service)**

```typescript
// products.controller.spec.ts
import { Test } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsController (Integration)', () => {
  let controller: ProductsController;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [ProductsService, PrismaService, ProductRepository],
    }).compile();

    controller = module.get(ProductsController);
    prisma = module.get(PrismaService);
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.product.deleteMany();
  });

  it('should create and retrieve product', async () => {
    const createDto = {
      name: 'Integration Test Product',
      price: 50,
      categoryId: 'cat-1',
    };

    const created = await controller.create(createDto);
    expect(created).toHaveProperty('id');

    const retrieved = await controller.findOne(created.id);
    expect(retrieved.name).toBe('Integration Test Product');
  });
});
```

---

## **E2E TESTS (Full HTTP)**

```typescript
// test/products.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Products (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'admin', password: 'password' });
    
    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/products (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'E2E Test Product',
        price: 75,
        categoryId: 'cat-1',
      })
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('E2E Test Product');
  });

  it('/products/:id (GET)', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test', price: 100, categoryId: 'cat-1' });

    const productId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .get(`/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.id).toBe(productId);
  });
});
```

---

## **TESTING DECIMAL.JS**

```typescript
describe('Price Calculations', () => {
  it('should calculate with Decimal.js precision', () => {
    const price = new Decimal('10.50');
    const quantity = new Decimal('3');
    const result = price.times(quantity);

    expect(result.toString()).toBe('31.50');
    expect(result).toBeInstanceOf(Decimal);
  });

  it('should handle rounding correctly', () => {
    const price = new Decimal('10.555');
    const rounded = price.toDecimalPlaces(2);

    expect(rounded.toString()).toBe('10.56');
  });
});
```

---

## **MOCKING PRISMA**

```typescript
const mockPrisma = {
  product: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// Use in tests
{ provide: PrismaService, useValue: mockPrisma }
```

---

## **RUN TESTS**

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

**NEXT**: [08-repository.md](08-repository.md)
