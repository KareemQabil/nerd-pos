// Products Repository
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
    Product,
    Category,
    Modifier,
    ModifierOption,
    ProductWithRelations,
    CategoryWithProducts,
    ModifierWithOptions,
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
                modifiers: {
                    include: {
                        modifier: {
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
                modifiers: {
                    include: {
                        modifier: {
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
                modifiers: {
                    include: {
                        modifier: {
                            include: { options: true },
                        },
                    },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findActive(): Promise<Product[]> {
        return (this.prisma as any).product.findMany({
            where: { isActive: true },
            include: { category: true },
            orderBy: { name: 'asc' },
        });
    }

    async searchByName(query: string): Promise<Product[]> {
        return (this.prisma as any).product.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { nameAr: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } },
                ],
                isActive: true,
            },
            include: { category: true },
            take: 20,
        });
    }

    async updateStock(productId: string, quantity: number): Promise<void> {
        await (this.prisma as any).product.update({
            where: { id: productId },
            data: { currentStock: { increment: quantity } },
        });
    }

    async setAvailability(productId: string, isAvailable: boolean): Promise<void> {
        await (this.prisma as any).product.update({
            where: { id: productId },
            data: { isAvailable },
        });
    }

    // ==================== CATEGORY ====================

    async findAllCategories(): Promise<Category[]> {
        return (this.prisma as any).category.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
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
            orderBy: { displayOrder: 'asc' },
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

    // ==================== MODIFIER ====================

    async findAllModifiers(): Promise<ModifierWithOptions[]> {
        return (this.prisma as any).modifierGroup.findMany({
            where: { isActive: true },
            include: { options: { where: { isActive: true } } },
        });
    }

    async findModifierById(id: string): Promise<ModifierWithOptions | null> {
        return (this.prisma as any).modifierGroup.findUnique({
            where: { id },
            include: { options: true },
        });
    }

    async createModifier(data: Partial<Modifier>): Promise<Modifier> {
        return (this.prisma as any).modifierGroup.create({ data });
    }

    async updateModifier(id: string, data: Partial<Modifier>): Promise<Modifier> {
        return (this.prisma as any).modifierGroup.update({
            where: { id },
            data,
        });
    }

    async deleteModifier(id: string): Promise<void> {
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

    // ==================== PRODUCT-MODIFIER ASSIGNMENT ====================

    async assignModifierToProduct(productId: string, modifierId: string): Promise<void> {
        await (this.prisma as any).productModifierGroup.create({
            data: { productId, modifierGroupId: modifierId },
        });
    }

    async removeModifierFromProduct(productId: string, modifierId: string): Promise<void> {
        await (this.prisma as any).productModifierGroup.delete({
            where: {
                productId_modifierGroupId: { productId, modifierGroupId: modifierId },
            },
        });
    }

    async getProductModifiers(productId: string): Promise<ModifierWithOptions[]> {
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
