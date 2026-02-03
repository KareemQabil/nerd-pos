// Products Service
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { ErrorMessages } from '../../common/constants';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierOptionDto,
  UpdateModifierOptionDto,
  AssignModifierGroupDto,
} from './dto';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
} from './events/product-created.event';
import {
  Product,
  Category,
  ModifierGroup,
  ModifierOption,
  ProductWithRelations,
  ModifierGroupWithOptions,
} from './entities/product.entity';
import Decimal from 'decimal.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) { }

  // ==================== PRODUCT ====================

  async createProduct(dto: CreateProductDto): Promise<Product> {
    if (!Number.isFinite(dto.price)) {
      throw new BadRequestException({
        ...ErrorMessages.InvalidPrice,
        details: { field: 'price' },
      });
    }
    if (dto.price < 0) {
      throw new BadRequestException({
        ...ErrorMessages.NegativePrice,
        details: { field: 'price' },
      });
    }

    const data = {
      ...dto,
      price: new Decimal(dto.price).toNumber(),
      cost: dto.cost !== undefined ? new Decimal(dto.cost).toNumber() : 0,
    };

    const product = await this.repo.create(data);

    await this.eventBus.publish(
      'ProductCreated',
      new ProductCreatedEvent(product.id, product.nameEn, product.sku),
    );

    // Assign modifier groups if provided
    if (dto.modifierGroupIds && dto.modifierGroupIds.length > 0) {
      for (const groupId of dto.modifierGroupIds) {
        await this.repo.assignModifierGroupToProduct(product.id, groupId);
      }
    }

    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    await this.findProductById(id); // Ensure exists

    const data: any = { ...dto };
    if (dto.price !== undefined) {
      if (!Number.isFinite(dto.price)) {
        throw new BadRequestException({
          ...ErrorMessages.InvalidPrice,
          details: { field: 'price' },
        });
      }
      if (dto.price < 0) {
        throw new BadRequestException({
          ...ErrorMessages.NegativePrice,
          details: { field: 'price' },
        });
      }
      data.price = new Decimal(dto.price).toNumber();
    }
    if (dto.cost !== undefined) {
      data.cost = new Decimal(dto.cost).toNumber();
    }

    const product = await this.repo.update(id, data);

    await this.eventBus.publish(
      'ProductUpdated',
      new ProductUpdatedEvent(product.id, product.nameEn),
    );

    return product;
  }

  async findProductById(id: string): Promise<ProductWithRelations> {
    const product = await this.repo.findWithRelations(id);
    if (!product) {
      throw new NotFoundException({
        ...ErrorMessages.ProductNotFound,
        details: { productId: id },
      });
    }
    return product;
  }

  async findProductBySku(sku: string): Promise<ProductWithRelations> {
    const product = await this.repo.findBySku(sku);
    if (!product) {
      throw new NotFoundException({
        ...ErrorMessages.ProductSkuNotFound,
        details: { sku },
      });
    }
    return product;
  }

  async findAllProducts(): Promise<Product[]> {
    return this.repo.findActive();
  }

  // Paginated version for API endpoints - prevents unbounded queries
  async findAllProductsPaginated(options: { page?: number; limit?: number }): Promise<{
    data: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.repo.findActivePaginated(options);
  }

  async findProductsByCategory(categoryId: string): Promise<Product[]> {
    return this.repo.findByCategory(categoryId);
  }

  async searchProducts(query: string): Promise<Product[]> {
    return this.repo.searchByName(query);
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.findProductById(id);
    await this.repo.delete(id);

    await this.eventBus.publish(
      'ProductDeleted',
      new ProductDeletedEvent(id, product.sku),
    );
  }

  async deactivateProduct(id: string): Promise<Product> {
    return this.updateProduct(id, { isActive: false });
  }

  // ==================== CATEGORY ====================

  async createCategory(dto: CreateCategoryDto): Promise<Category> {
    const category = await this.repo.createCategory(dto);

    await this.eventBus.publish(
      'CategoryCreated',
      new CategoryCreatedEvent(category.id, category.nameEn),
    );

    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.repo.updateCategory(id, dto);

    await this.eventBus.publish(
      'CategoryUpdated',
      new CategoryUpdatedEvent(category.id, category.nameEn),
    );

    return category;
  }

  async findAllCategories(): Promise<Category[]> {
    return this.repo.findAllCategories();
  }

  // Paginated version for API endpoints
  async findAllCategoriesPaginated(options: { page?: number; limit?: number }): Promise<{
    data: Category[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.repo.findAllCategoriesPaginated(options);
  }

  async findCategoryById(id: string): Promise<Category> {
    const category = await this.repo.findCategoryById(id);
    if (!category) {
      throw new NotFoundException({
        ...ErrorMessages.CategoryNotFound,
        details: { categoryId: id },
      });
    }
    return category;
  }

  async findRootCategories(): Promise<Category[]> {
    return this.repo.findRootCategories();
  }

  async deleteCategory(id: string): Promise<void> {
    await this.repo.deleteCategory(id);
  }

  // ==================== MODIFIER GROUP ====================

  async createModifierGroup(
    dto: CreateModifierGroupDto,
  ): Promise<ModifierGroup> {
    return this.repo.createModifierGroup(dto);
  }

  async updateModifierGroup(
    id: string,
    dto: UpdateModifierGroupDto,
  ): Promise<ModifierGroup> {
    return this.repo.updateModifierGroup(id, dto);
  }

  async findAllModifierGroups(): Promise<ModifierGroupWithOptions[]> {
    return this.repo.findAllModifierGroups();
  }

  // Paginated version for API endpoints
  async findAllModifierGroupsPaginated(options: { page?: number; limit?: number }): Promise<{
    data: ModifierGroupWithOptions[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.repo.findAllModifierGroupsPaginated(options);
  }

  async findModifierGroupById(id: string): Promise<ModifierGroupWithOptions> {
    const group = await this.repo.findModifierGroupById(id);
    if (!group) {
      throw new NotFoundException({
        ...ErrorMessages.ModifierGroupNotFound,
        details: { modifierGroupId: id },
      });
    }
    return group;
  }

  async deleteModifierGroup(id: string): Promise<void> {
    await this.repo.deleteModifierGroup(id);
  }

  // ==================== MODIFIER OPTIONS ====================

  async createModifierOption(
    dto: CreateModifierOptionDto,
  ): Promise<ModifierOption> {
    const data = {
      ...dto,
      price: new Decimal(dto.price || 0).toNumber(),
    };
    return this.repo.createModifierOption(data);
  }

  async updateModifierOption(
    id: string,
    dto: UpdateModifierOptionDto,
  ): Promise<ModifierOption> {
    const data: any = { ...dto };
    if (dto.price !== undefined) {
      data.price = new Decimal(dto.price).toNumber();
    }
    return this.repo.updateModifierOption(id, data);
  }

  async deleteModifierOption(id: string): Promise<void> {
    await this.repo.deleteModifierOption(id);
  }

  // ==================== PRODUCT-MODIFIER GROUP ASSIGNMENT ====================

  async assignModifierGroup(dto: AssignModifierGroupDto): Promise<void> {
    await this.repo.assignModifierGroupToProduct(dto.productId, dto.groupId);
  }

  async removeModifierGroup(productId: string, groupId: string): Promise<void> {
    await this.repo.removeModifierGroupFromProduct(productId, groupId);
  }

  async getProductModifierGroups(
    productId: string,
  ): Promise<ModifierGroupWithOptions[]> {
    return this.repo.getProductModifierGroups(productId);
  }
}
