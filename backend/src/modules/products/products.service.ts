// Products Service
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import {
    CreateProductDto,
    UpdateProductDto,
    CreateCategoryDto,
    UpdateCategoryDto,
    CreateModifierDto,
    UpdateModifierDto,
    CreateModifierOptionDto,
    UpdateModifierOptionDto,
    AssignModifierDto,
} from './dto';
import {
    ProductCreatedEvent,
    ProductUpdatedEvent,
    ProductDeletedEvent,
    CategoryCreatedEvent,
    CategoryUpdatedEvent,
    ProductStockChangedEvent,
    ProductAvailabilityChangedEvent,
} from './events/product-created.event';
import {
    Product,
    Category,
    Modifier,
    ModifierOption,
    ProductWithRelations,
    ModifierWithOptions,
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
        const data = {
            ...dto,
            price: new Decimal(dto.price).toNumber(),
            cost: dto.cost ? new Decimal(dto.cost).toNumber() : null,
        };

        const product = await this.repo.create(data);

        await this.eventBus.publish(
            'ProductCreated',
            new ProductCreatedEvent(product.id, product.name, product.sku),
        );

        // Assign modifiers if provided
        if (dto.modifierIds && dto.modifierIds.length > 0) {
            for (const modifierId of dto.modifierIds) {
                await this.repo.assignModifierToProduct(product.id, modifierId);
            }
        }

        return product;
    }

    async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
        await this.findProductById(id); // Ensure exists

        const data: any = { ...dto };
        if (dto.price !== undefined) {
            data.price = new Decimal(dto.price).toNumber();
        }
        if (dto.cost !== undefined) {
            data.cost = new Decimal(dto.cost).toNumber();
        }

        const product = await this.repo.update(id, data);

        await this.eventBus.publish(
            'ProductUpdated',
            new ProductUpdatedEvent(product.id, product.name),
        );

        return product;
    }

    async findProductById(id: string): Promise<ProductWithRelations> {
        const product = await this.repo.findWithRelations(id);
        if (!product) {
            throw new NotFoundException(`Product ${id} not found`);
        }
        return product;
    }

    async findProductBySku(sku: string): Promise<ProductWithRelations> {
        const product = await this.repo.findBySku(sku);
        if (!product) {
            throw new NotFoundException(`Product with SKU ${sku} not found`);
        }
        return product;
    }

    async findAllProducts(): Promise<Product[]> {
        return this.repo.findActive();
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

    async updateStock(productId: string, quantityChange: number): Promise<void> {
        const product = await this.findProductById(productId);
        const previousStock = product.currentStock;
        await this.repo.updateStock(productId, quantityChange);
        const newStock = previousStock + quantityChange;

        await this.eventBus.publish(
            'ProductStockChanged',
            new ProductStockChangedEvent(productId, previousStock, newStock),
        );
    }

    async setAvailability(productId: string, isAvailable: boolean): Promise<void> {
        await this.repo.setAvailability(productId, isAvailable);

        await this.eventBus.publish(
            'ProductAvailabilityChanged',
            new ProductAvailabilityChangedEvent(productId, isAvailable),
        );
    }

    // ==================== CATEGORY ====================

    async createCategory(dto: CreateCategoryDto): Promise<Category> {
        const category = await this.repo.createCategory(dto);

        await this.eventBus.publish(
            'CategoryCreated',
            new CategoryCreatedEvent(category.id, category.name),
        );

        return category;
    }

    async updateCategory(id: string, dto: UpdateCategoryDto): Promise<Category> {
        const category = await this.repo.updateCategory(id, dto);

        await this.eventBus.publish(
            'CategoryUpdated',
            new CategoryUpdatedEvent(category.id, category.name),
        );

        return category;
    }

    async findAllCategories(): Promise<Category[]> {
        return this.repo.findAllCategories();
    }

    async findCategoryById(id: string): Promise<Category> {
        const category = await this.repo.findCategoryById(id);
        if (!category) {
            throw new NotFoundException(`Category ${id} not found`);
        }
        return category;
    }

    async findRootCategories(): Promise<Category[]> {
        return this.repo.findRootCategories();
    }

    async deleteCategory(id: string): Promise<void> {
        await this.repo.deleteCategory(id);
    }

    // ==================== MODIFIER ====================

    async createModifier(dto: CreateModifierDto): Promise<Modifier> {
        return this.repo.createModifier(dto);
    }

    async updateModifier(id: string, dto: UpdateModifierDto): Promise<Modifier> {
        return this.repo.updateModifier(id, dto);
    }

    async findAllModifiers(): Promise<ModifierWithOptions[]> {
        return this.repo.findAllModifiers();
    }

    async findModifierById(id: string): Promise<ModifierWithOptions> {
        const modifier = await this.repo.findModifierById(id);
        if (!modifier) {
            throw new NotFoundException(`Modifier ${id} not found`);
        }
        return modifier;
    }

    async deleteModifier(id: string): Promise<void> {
        await this.repo.deleteModifier(id);
    }

    // ==================== MODIFIER OPTIONS ====================

    async createModifierOption(dto: CreateModifierOptionDto): Promise<ModifierOption> {
        const data = {
            ...dto,
            price: new Decimal(dto.price || 0).toNumber(),
        };
        return this.repo.createModifierOption(data);
    }

    async updateModifierOption(id: string, dto: UpdateModifierOptionDto): Promise<ModifierOption> {
        const data: any = { ...dto };
        if (dto.price !== undefined) {
            data.price = new Decimal(dto.price).toNumber();
        }
        return this.repo.updateModifierOption(id, data);
    }

    async deleteModifierOption(id: string): Promise<void> {
        await this.repo.deleteModifierOption(id);
    }

    // ==================== PRODUCT-MODIFIER ASSIGNMENT ====================

    async assignModifier(dto: AssignModifierDto): Promise<void> {
        await this.repo.assignModifierToProduct(dto.productId, dto.modifierId);
    }

    async removeModifier(productId: string, modifierId: string): Promise<void> {
        await this.repo.removeModifierFromProduct(productId, modifierId);
    }

    async getProductModifiers(productId: string): Promise<ModifierWithOptions[]> {
        return this.repo.getProductModifiers(productId);
    }
}
