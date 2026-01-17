/**
 * ProductsService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import Decimal from 'decimal.js';

// Test helpers - inline definitions to avoid import issues
function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        findOne: jest.fn(),
        findAll: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        findWithRelations: jest.fn(),
        findBySku: jest.fn(),
        findActive: jest.fn(),
        findByCategory: jest.fn(),
        searchByName: jest.fn(),
        createCategory: jest.fn(),
        updateCategory: jest.fn(),
        findAllCategories: jest.fn(),
        findCategoryById: jest.fn(),
        findRootCategories: jest.fn(),
        deleteCategory: jest.fn(),
        createModifierGroup: jest.fn(),
        updateModifierGroup: jest.fn(),
        findAllModifierGroups: jest.fn(),
        findModifierGroupById: jest.fn(),
        deleteModifierGroup: jest.fn(),
        createModifierOption: jest.fn(),
        updateModifierOption: jest.fn(),
        deleteModifierOption: jest.fn(),
        assignModifierGroupToProduct: jest.fn(),
        removeModifierGroupFromProduct: jest.fn(),
        getProductModifierGroups: jest.fn(),
    };
}

function createMockEventBus() {
    return {
        publish: jest.fn(),
        subscribe: jest.fn(),
    };
}

function createMockProduct(overrides: Partial<any> = {}) {
    return {
        id: 'prod-1',
        sku: 'SKU-001',
        nameAr: 'منتج تجريبي',
        nameEn: 'Test Product',
        price: 35.00,
        cost: 12.00,
        categoryId: 'cat-1',
        isActive: true,
        trackInventory: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function createMockCategory(overrides: Partial<any> = {}) {
    return {
        id: 'cat-1',
        nameAr: 'قسم تجريبي',
        nameEn: 'Test Category',
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe('ProductsService', () => {
    let service: ProductsService;
    let repo: ReturnType<typeof createMockRepository>;
    let eventBus: ReturnType<typeof createMockEventBus>;

    beforeEach(async () => {
        repo = createMockRepository();
        eventBus = createMockEventBus();

        // Add additional repository methods specific to ProductsRepository
        (repo as any).findWithRelations = jest.fn();
        (repo as any).findBySku = jest.fn();
        (repo as any).findActive = jest.fn();
        (repo as any).findByCategory = jest.fn();
        (repo as any).searchByName = jest.fn();
        (repo as any).createCategory = jest.fn();
        (repo as any).updateCategory = jest.fn();
        (repo as any).findAllCategories = jest.fn();
        (repo as any).findCategoryById = jest.fn();
        (repo as any).findRootCategories = jest.fn();
        (repo as any).deleteCategory = jest.fn();
        (repo as any).createModifierGroup = jest.fn();
        (repo as any).updateModifierGroup = jest.fn();
        (repo as any).findAllModifierGroups = jest.fn();
        (repo as any).findModifierGroupById = jest.fn();
        (repo as any).deleteModifierGroup = jest.fn();
        (repo as any).createModifierOption = jest.fn();
        (repo as any).updateModifierOption = jest.fn();
        (repo as any).deleteModifierOption = jest.fn();
        (repo as any).assignModifierGroupToProduct = jest.fn();
        (repo as any).removeModifierGroupFromProduct = jest.fn();
        (repo as any).getProductModifierGroups = jest.fn();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                { provide: ProductsRepository, useValue: repo },
                { provide: 'IEventBus', useValue: eventBus },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==================== PRODUCT CRUD TESTS ====================

    describe('createProduct', () => {
        it('should create product with Decimal price conversion', async () => {
            const dto = {
                nameAr: 'شاورما',
                nameEn: 'Shawarma',
                sku: 'SHWRM-001',
                price: 35.00,
                cost: 12.00,
                categoryId: 'cat-1',
            };

            const mockProduct = createMockProduct({
                ...dto,
                id: 'prod-1',
                price: 35.00,
                cost: 12.00,
            });

            repo.create.mockResolvedValue(mockProduct);

            const result = await service.createProduct(dto);

            expect(result).toEqual(mockProduct);
            expect(repo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    nameEn: 'Shawarma',
                    price: expect.any(Number),
                })
            );
            expect(eventBus.publish).toHaveBeenCalledWith(
                'ProductCreated',
                expect.objectContaining({ productId: 'prod-1' })
            );
        });

        it('should handle Decimal.js precision correctly', async () => {
            const dto = {
                nameAr: 'قهوة',
                nameEn: 'Coffee',
                sku: 'CFE-001',
                price: 19.99,
                categoryId: 'cat-1',
            };

            const decimalPrice = new Decimal(dto.price);
            expect(decimalPrice.toString()).toBe('19.99');

            const mockProduct = createMockProduct({ ...dto, id: 'prod-2' });
            repo.create.mockResolvedValue(mockProduct);

            await service.createProduct(dto);

            expect(repo.create).toHaveBeenCalled();
        });

        it('should assign modifier groups if provided', async () => {
            const dto = {
                nameAr: 'بيتزا',
                nameEn: 'Pizza',
                sku: 'PZA-001',
                price: 45.00,
                categoryId: 'cat-1',
                modifierGroupIds: ['mod-1', 'mod-2'],
            };

            const mockProduct = createMockProduct({ ...dto, id: 'prod-3' });
            repo.create.mockResolvedValue(mockProduct);
            (repo as any).assignModifierGroupToProduct.mockResolvedValue(undefined);

            await service.createProduct(dto);

            expect((repo as any).assignModifierGroupToProduct).toHaveBeenCalledTimes(2);
            expect((repo as any).assignModifierGroupToProduct).toHaveBeenCalledWith('prod-3', 'mod-1');
            expect((repo as any).assignModifierGroupToProduct).toHaveBeenCalledWith('prod-3', 'mod-2');
        });

        it('should default cost to 0 if not provided', async () => {
            const dto = {
                nameAr: 'ماء',
                nameEn: 'Water',
                sku: 'WTR-001',
                price: 5.00,
                categoryId: 'cat-1',
            };

            const mockProduct = createMockProduct({ ...dto, id: 'prod-4', cost: 0 });
            repo.create.mockResolvedValue(mockProduct);

            await service.createProduct(dto);

            expect(repo.create).toHaveBeenCalledWith(
                expect.objectContaining({ cost: 0 })
            );
        });
    });

    describe('updateProduct', () => {
        it('should update product price with Decimal conversion', async () => {
            const existingProduct = createMockProduct({ id: 'prod-1', price: 30.00 });
            const updatedProduct = { ...existingProduct, price: 35.00 };

            (repo as any).findWithRelations.mockResolvedValue(existingProduct);
            repo.update.mockResolvedValue(updatedProduct);

            const result = await service.updateProduct('prod-1', { price: 35.00 });

            expect(result.price).toBe(35.00);
            expect(eventBus.publish).toHaveBeenCalledWith('ProductUpdated', expect.anything());
        });

        it('should throw NotFoundException for non-existent product', async () => {
            (repo as any).findWithRelations.mockResolvedValue(null);

            await expect(service.updateProduct('non-existent', { price: 50 }))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findProductById', () => {
        it('should return product with relations', async () => {
            const mockProduct = createMockProduct({ id: 'prod-1' });
            (repo as any).findWithRelations.mockResolvedValue(mockProduct);

            const result = await service.findProductById('prod-1');

            expect(result).toEqual(mockProduct);
            expect((repo as any).findWithRelations).toHaveBeenCalledWith('prod-1');
        });

        it('should throw NotFoundException if product not found', async () => {
            (repo as any).findWithRelations.mockResolvedValue(null);

            await expect(service.findProductById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('findProductBySku', () => {
        it('should return product by SKU', async () => {
            const mockProduct = createMockProduct({ sku: 'SHWRM-001' });
            (repo as any).findBySku.mockResolvedValue(mockProduct);

            const result = await service.findProductBySku('SHWRM-001');

            expect(result.sku).toBe('SHWRM-001');
        });

        it('should throw NotFoundException if SKU not found', async () => {
            (repo as any).findBySku.mockResolvedValue(null);

            await expect(service.findProductBySku('INVALID-SKU'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteProduct', () => {
        it('should delete product and publish event', async () => {
            const mockProduct = createMockProduct({ id: 'prod-1', sku: 'DEL-001' });
            (repo as any).findWithRelations.mockResolvedValue(mockProduct);
            repo.delete.mockResolvedValue(undefined);

            await service.deleteProduct('prod-1');

            expect(repo.delete).toHaveBeenCalledWith('prod-1');
            expect(eventBus.publish).toHaveBeenCalledWith(
                'ProductDeleted',
                expect.objectContaining({ productId: 'prod-1' })
            );
        });
    });

    describe('deactivateProduct', () => {
        it('should set isActive to false', async () => {
            const mockProduct = createMockProduct({ id: 'prod-1', isActive: true });
            const deactivatedProduct = { ...mockProduct, isActive: false };

            (repo as any).findWithRelations.mockResolvedValue(mockProduct);
            repo.update.mockResolvedValue(deactivatedProduct);

            const result = await service.deactivateProduct('prod-1');

            expect(result.isActive).toBe(false);
        });
    });

    // ==================== CATEGORY TESTS ====================

    describe('createCategory', () => {
        it('should create category and publish event', async () => {
            const dto = {
                nameAr: 'مشروبات',
                nameEn: 'Beverages',
                sortOrder: 1,
            };

            const mockCategory = createMockCategory({ ...dto, id: 'cat-1' });
            (repo as any).createCategory.mockResolvedValue(mockCategory);

            const result = await service.createCategory(dto);

            expect(result.nameEn).toBe('Beverages');
            expect(eventBus.publish).toHaveBeenCalledWith(
                'CategoryCreated',
                expect.anything()
            );
        });
    });

    describe('findCategoryById', () => {
        it('should return category by ID', async () => {
            const mockCategory = createMockCategory({ id: 'cat-1' });
            (repo as any).findCategoryById.mockResolvedValue(mockCategory);

            const result = await service.findCategoryById('cat-1');

            expect(result).toEqual(mockCategory);
        });

        it('should throw NotFoundException if category not found', async () => {
            (repo as any).findCategoryById.mockResolvedValue(null);

            await expect(service.findCategoryById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== MODIFIER GROUP TESTS ====================

    describe('findModifierGroupById', () => {
        it('should return modifier group with options', async () => {
            const mockGroup = {
                id: 'mod-1',
                nameAr: 'إضافات',
                nameEn: 'Toppings',
                options: [],
            };
            (repo as any).findModifierGroupById.mockResolvedValue(mockGroup);

            const result = await service.findModifierGroupById('mod-1');

            expect(result.nameEn).toBe('Toppings');
        });

        it('should throw NotFoundException if modifier group not found', async () => {
            (repo as any).findModifierGroupById.mockResolvedValue(null);

            await expect(service.findModifierGroupById('non-existent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== MODIFIER OPTION TESTS ====================

    describe('createModifierOption', () => {
        it('should create modifier option with Decimal price', async () => {
            const dto = {
                groupId: 'mod-1',
                nameAr: 'جبنة إضافية',
                nameEn: 'Extra Cheese',
                price: 5.00,
            };

            const mockOption = {
                id: 'opt-1',
                ...dto,
            };
            (repo as any).createModifierOption.mockResolvedValue(mockOption);

            const result = await service.createModifierOption(dto);

            expect(result.nameEn).toBe('Extra Cheese');
            expect((repo as any).createModifierOption).toHaveBeenCalledWith(
                expect.objectContaining({ price: 5 })
            );
        });

        it('should default price to 0 if not provided', async () => {
            const dto = {
                groupId: 'mod-1',
                nameAr: 'بدون بصل',
                nameEn: 'No Onion',
            };

            (repo as any).createModifierOption.mockResolvedValue({ id: 'opt-2', ...dto, price: 0 });

            await service.createModifierOption(dto);

            expect((repo as any).createModifierOption).toHaveBeenCalledWith(
                expect.objectContaining({ price: 0 })
            );
        });
    });

    // ==================== EVENT PUBLISHING TESTS ====================

    describe('Event Publishing', () => {
        it('should publish ProductCreated event on create', async () => {
            const mockProduct = createMockProduct({ id: 'prod-1', nameEn: 'Test', sku: 'TST-001' });
            repo.create.mockResolvedValue(mockProduct);

            await service.createProduct({
                nameAr: 'اختبار',
                nameEn: 'Test',
                sku: 'TST-001',
                price: 10,
                categoryId: 'cat-1',
            });

            expect(eventBus.publish).toHaveBeenCalledWith('ProductCreated', expect.anything());
        });

        it('should publish ProductUpdated event on update', async () => {
            const mockProduct = createMockProduct({ id: 'prod-1' });
            (repo as any).findWithRelations.mockResolvedValue(mockProduct);
            repo.update.mockResolvedValue(mockProduct);

            await service.updateProduct('prod-1', { nameEn: 'Updated' });

            expect(eventBus.publish).toHaveBeenCalledWith('ProductUpdated', expect.anything());
        });

        it('should publish ProductDeleted event on delete', async () => {
            const mockProduct = createMockProduct({ id: 'prod-1', sku: 'DEL-001' });
            (repo as any).findWithRelations.mockResolvedValue(mockProduct);
            repo.delete.mockResolvedValue(undefined);

            await service.deleteProduct('prod-1');

            expect(eventBus.publish).toHaveBeenCalledWith('ProductDeleted', expect.anything());
        });
    });
});
