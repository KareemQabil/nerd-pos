// Products Service
// Source: WORKFLOWS-BACKEND/01-create-module.md
// Uses Decimal.js for price handling, publishes events

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { CreateProductDto, UpdateProductDto } from './dto';
import { ProductCreatedEvent } from './events/product-created.event';
import { ProductUpdatedEvent } from './events/product-updated.event';
import { Product } from './entities/product.entity';
import Decimal from 'decimal.js';

@Injectable()
export class ProductsService {
    constructor(
        private readonly repo: ProductsRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
    ) { }

    async create(dto: CreateProductDto): Promise<Product> {
        // Convert price to Decimal for precision
        const data = {
            ...dto,
            price: new Decimal(dto.price).toNumber(),
            cost: dto.cost ? new Decimal(dto.cost).toNumber() : 0,
        };

        const product = await this.repo.create(data);

        // Publish event (handlers execute in parallel)
        await this.eventBus.publish(
            'ProductCreated',
            new ProductCreatedEvent(product.id, product.sku, product.nameEn),
        );

        return product;
    }

    async findById(id: string): Promise<Product> {
        const product = await this.repo.findById(id);
        if (!product) {
            throw new NotFoundException(`Product ${id} not found`);
        }
        return product;
    }

    async findBySku(sku: string): Promise<Product> {
        const product = await this.repo.findBySku(sku);
        if (!product) {
            throw new NotFoundException(`Product with SKU ${sku} not found`);
        }
        return product;
    }

    async findAll(): Promise<Product[]> {
        return this.repo.findActive();
    }

    async findByCategory(categoryId: string): Promise<Product[]> {
        return this.repo.findByCategory(categoryId);
    }

    async search(name: string): Promise<Product[]> {
        return this.repo.searchByName(name);
    }

    async update(id: string, dto: UpdateProductDto): Promise<Product> {
        await this.findById(id); // Ensure exists

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
            new ProductUpdatedEvent(product.id, product.sku),
        );

        return product;
    }

    async delete(id: string): Promise<void> {
        await this.findById(id); // Ensure exists
        await this.repo.delete(id);
    }

    async deactivate(id: string): Promise<Product> {
        return this.update(id, { isActive: false });
    }
}
