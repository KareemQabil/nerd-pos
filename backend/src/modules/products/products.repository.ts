// Products Repository
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  Product,
  Category,
  ModifierGroup,
  ModifierOption,
  ProductWithRelations,
  CategoryWithProducts,
  ModifierGroupWithOptions,
} from './entities/product.entity';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../core/interfaces/pagination.interface';

@Injectable()
export class ProductsRepository extends BaseRepository<Product, 'product'> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model(): 'product' {
    return 'product';
  }

  private mapProductWithRelations(
    product: Prisma.ProductGetPayload<{
      include: {
        category: true;
        modifierGroups: {
          include: {
            modifierGroup: { include: { options: true } };
          };
        };
      };
    }> | null,
  ): ProductWithRelations | null {
    if (!product) {
      return null;
    }

    const modifierGroups = product.modifierGroups.map(
      (link) => link.modifierGroup,
    );

    return {
      ...product,
      modifierGroups,
    };
  }

  // ==================== PRODUCT ====================

  async findWithRelations(id: string): Promise<ProductWithRelations | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: true },
            },
          },
        },
      },
    });
    return this.mapProductWithRelations(product);
  }

  async findBySku(sku: string): Promise<ProductWithRelations | null> {
    const product = await this.prisma.product.findUnique({
      where: { sku },
      include: {
        category: true,
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: true },
            },
          },
        },
      },
    });
    return this.mapProductWithRelations(product);
  }

  async findByCategory(categoryId: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { categoryId, isActive: true },
      include: {
        category: true,
        modifierGroups: {
          include: {
            modifierGroup: {
              include: { options: true },
            },
          },
        },
      },
      orderBy: { nameEn: 'asc' },
    });
  }

  async findActive(): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { nameEn: 'asc' },
    });
  }

  // FORENSIC AUDIT FIX: Paginated version to prevent unbounded queries
  async findActivePaginated(
    options: PaginationOptions,
  ): Promise<PaginatedResult<Product>> {
    const page = options.page || 1;
    const limit = options.limit || 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        include: { category: true },
        orderBy: { nameEn: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async searchByName(query: string): Promise<Product[]> {
    return this.prisma.product.findMany({
      where: {
        OR: [
          { nameEn: { contains: query, mode: 'insensitive' } },
          { nameAr: { contains: query, mode: 'insensitive' } },
          { sku: { contains: query, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      include: { category: true },
      take: 20,
    });
  }

  // Note: Stock is tracked in InventoryItem, not in Product
  // Removed updateStock and setAvailability that used non-existent fields

  // ==================== CATEGORY ====================

  async findAllCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // PAGINATION FIX: Paginated version for API endpoints
  async findAllCategoriesPaginated(
    options: PaginationOptions,
  ): Promise<PaginatedResult<Category>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = { isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findCategoryById(id: string): Promise<CategoryWithProducts | null> {
    return this.prisma.category.findUnique({
      where: { id },
      include: {
        products: { where: { isActive: true } },
        children: true,
        parent: true,
      },
    });
  }

  async findRootCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: { children: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(
    data: Prisma.CategoryUncheckedCreateInput,
  ): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async updateCategory(
    id: string,
    data: Prisma.CategoryUncheckedUpdateInput,
  ): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== MODIFIER GROUP ====================

  async findAllModifierGroups(): Promise<ModifierGroupWithOptions[]> {
    return this.prisma.modifierGroup.findMany({
      where: { isActive: true },
      include: { options: { where: { isActive: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // PAGINATION FIX: Paginated version for API endpoints
  async findAllModifierGroupsPaginated(
    options: PaginationOptions,
  ): Promise<PaginatedResult<ModifierGroupWithOptions>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = { isActive: true };

    const [data, total] = await Promise.all([
      this.prisma.modifierGroup.findMany({
        where,
        include: { options: { where: { isActive: true } } },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.modifierGroup.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findModifierGroupById(
    id: string,
  ): Promise<ModifierGroupWithOptions | null> {
    return this.prisma.modifierGroup.findUnique({
      where: { id },
      include: { options: true },
    });
  }

  async createModifierGroup(
    data: Prisma.ModifierGroupCreateInput,
  ): Promise<ModifierGroup> {
    return this.prisma.modifierGroup.create({ data });
  }

  async updateModifierGroup(
    id: string,
    data: Prisma.ModifierGroupUpdateInput,
  ): Promise<ModifierGroup> {
    return this.prisma.modifierGroup.update({
      where: { id },
      data,
    });
  }

  async deleteModifierGroup(id: string): Promise<void> {
    await this.prisma.modifierGroup.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== MODIFIER OPTIONS ====================

  async createModifierOption(
    data: Prisma.ModifierOptionUncheckedCreateInput,
  ): Promise<ModifierOption> {
    return this.prisma.modifierOption.create({ data });
  }

  async updateModifierOption(
    id: string,
    data: Prisma.ModifierOptionUncheckedUpdateInput,
  ): Promise<ModifierOption> {
    return this.prisma.modifierOption.update({
      where: { id },
      data,
    });
  }

  async deleteModifierOption(id: string): Promise<void> {
    await this.prisma.modifierOption.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ==================== PRODUCT-MODIFIER GROUP ASSIGNMENT ====================

  async assignModifierGroupToProduct(
    productId: string,
    groupId: string,
  ): Promise<void> {
    await this.prisma.productModifierGroup.create({
      data: { productId, modifierGroupId: groupId },
    });
  }

  async removeModifierGroupFromProduct(
    productId: string,
    groupId: string,
  ): Promise<void> {
    await this.prisma.productModifierGroup.delete({
      where: {
        productId_modifierGroupId: { productId, modifierGroupId: groupId },
      },
    });
  }

  async getProductModifierGroups(
    productId: string,
  ): Promise<ModifierGroupWithOptions[]> {
    const links = await this.prisma.productModifierGroup.findMany({
      where: { productId },
      include: {
        modifierGroup: {
          include: { options: true },
        },
      },
    });
    return links.map((link) => link.modifierGroup);
  }
}
