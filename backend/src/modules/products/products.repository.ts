// Products Repository
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma

import { Injectable } from '@nestjs/common';
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

@Injectable()
export class ProductsRepository extends BaseRepository<Product> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'product';
    }

    // ==================== PRODUCT ====================

    async findWithRelations(id: string): Promise<ProductWithRelations | null> {
        return (this.prisma as any).product.findUnique({
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
    }

    async findBySku(sku: string): Promise<ProductWithRelations | null> {
        return (this.prisma as any).product.findUnique({
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
    }

    async findByCategory(categoryId: string): Promise<Product[]> {
        return (this.prisma as any).product.findMany({
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
        return (this.prisma as any).product.findMany({
            where: { isActive: true },
            include: { category: true },
            orderBy: { nameEn: 'asc' },
        });
    }

    async searchByName(query: string): Promise<Product[]> {
        return (this.prisma as any).product.findMany({
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
        return (this.prisma as any).category.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async findCategoryById(id: string): Promise<CategoryWithProducts | null> {
        return (this.prisma as any).category.findUnique({
            where: { id },
            include: {
                products: { where: { isActive: true } },
                children: true,
                parent: true,
            },
        });
    }

    async findRootCategories(): Promise<Category[]> {
        return (this.prisma as any).category.findMany({
            where: { parentId: null, isActive: true },
            include: { children: true },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async createCategory(data: Partial<Category>): Promise<Category> {
        return (this.prisma as any).category.create({ data });
    }

    async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
        return (this.prisma as any).category.update({
            where: { id },
            data,
        });
    }

    async deleteCategory(id: string): Promise<void> {
        await (this.prisma as any).category.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // ==================== MODIFIER GROUP ====================

    async findAllModifierGroups(): Promise<ModifierGroupWithOptions[]> {
        return (this.prisma as any).modifierGroup.findMany({
            where: { isActive: true },
            include: { options: { where: { isActive: true } } },
            orderBy: { sortOrder: 'asc' },
        });
    }

    async findModifierGroupById(id: string): Promise<ModifierGroupWithOptions | null> {
        return (this.prisma as any).modifierGroup.findUnique({
            where: { id },
            include: { options: true },
        });
    }

    async createModifierGroup(data: Partial<ModifierGroup>): Promise<ModifierGroup> {
        return (this.prisma as any).modifierGroup.create({ data });
    }

    async updateModifierGroup(id: string, data: Partial<ModifierGroup>): Promise<ModifierGroup> {
        return (this.prisma as any).modifierGroup.update({
            where: { id },
            data,
        });
    }

    async deleteModifierGroup(id: string): Promise<void> {
        await (this.prisma as any).modifierGroup.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // ==================== MODIFIER OPTIONS ====================

    async createModifierOption(data: Partial<ModifierOption>): Promise<ModifierOption> {
        return (this.prisma as any).modifierOption.create({ data });
    }

    async updateModifierOption(id: string, data: Partial<ModifierOption>): Promise<ModifierOption> {
        return (this.prisma as any).modifierOption.update({
            where: { id },
            data,
        });
    }

    async deleteModifierOption(id: string): Promise<void> {
        await (this.prisma as any).modifierOption.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // ==================== PRODUCT-MODIFIER GROUP ASSIGNMENT ====================

    async assignModifierGroupToProduct(productId: string, groupId: string): Promise<void> {
        await (this.prisma as any).productModifierGroup.create({
            data: { productId, groupId },
        });
    }

    async removeModifierGroupFromProduct(productId: string, groupId: string): Promise<void> {
        await (this.prisma as any).productModifierGroup.delete({
            where: {
                productId_groupId: { productId, groupId },
            },
        });
    }

    async getProductModifierGroups(productId: string): Promise<ModifierGroupWithOptions[]> {
        const links = await (this.prisma as any).productModifierGroup.findMany({
            where: { productId },
            include: {
                modifierGroup: {
                    include: { options: true },
                },
            },
        });
        return links.map((l: any) => l.modifierGroup);
    }
}
