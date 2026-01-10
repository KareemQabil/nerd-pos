// Products Repository
// Source: WORKFLOWS-BACKEND/01-create-module.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsRepository extends BaseRepository<Product> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'product'; // Must match Prisma model name (camelCase)
    }

    // Custom queries
    async findBySku(sku: string): Promise<Product | null> {
        return (this.prisma as any).product.findUnique({
            where: { sku },
        });
    }

    async findByCategory(categoryId: string): Promise<Product[]> {
        return (this.prisma as any).product.findMany({
            where: { categoryId, isActive: true },
            orderBy: { nameEn: 'asc' },
        });
    }

    async findActive(): Promise<Product[]> {
        return (this.prisma as any).product.findMany({
            where: { isActive: true },
            orderBy: { nameEn: 'asc' },
        });
    }

    async searchByName(name: string): Promise<Product[]> {
        return (this.prisma as any).product.findMany({
            where: {
                OR: [
                    { nameEn: { contains: name, mode: 'insensitive' } },
                    { nameAr: { contains: name, mode: 'insensitive' } },
                ],
                isActive: true,
            },
        });
    }
}
