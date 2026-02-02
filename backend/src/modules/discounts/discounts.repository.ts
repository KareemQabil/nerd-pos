// Discounts Repository
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md, 08-repository.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../core/interfaces/pagination.interface';
import { Discount, DiscountUsage } from './entities/discounts.entity';

@Injectable()
export class DiscountsRepository extends BaseRepository<Discount> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return 'discount';
  }

  // ==================== DISCOUNTS ====================

  async findByCode(code: string): Promise<Discount | null> {
    return (this.prisma as any).discount.findUnique({
      where: { code },
    });
  }

  async findActive(): Promise<Discount[]> {
    return (this.prisma as any).discount.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // PAGINATION FIX: Paginated version for API endpoints
  async findActivePaginated(
    options: PaginationOptions,
  ): Promise<PaginatedResult<Discount>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = { isActive: true };

    const [data, total] = await Promise.all([
      (this.prisma as any).discount.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      (this.prisma as any).discount.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findActiveByType(
    type: 'PERCENTAGE' | 'FIXED_AMOUNT',
  ): Promise<Discount[]> {
    return (this.prisma as any).discount.findMany({
      where: { isActive: true, type },
      orderBy: { name: 'asc' },
    });
  }

  async incrementUsage(id: string): Promise<void> {
    await (this.prisma as any).discount.update({
      where: { id },
      data: { usedCount: { increment: 1 } },
    });
  }

  // ==================== DISCOUNT USAGE ====================

  async createUsage(data: any): Promise<DiscountUsage> {
    return (this.prisma as any).discountUsage.create({ data });
  }

  async findUsageByOrder(orderId: string): Promise<DiscountUsage[]> {
    return (this.prisma as any).discountUsage.findMany({
      where: { orderId },
      include: { discount: true },
    });
  }

  async findUsageByCustomer(customerId: string): Promise<DiscountUsage[]> {
    return (this.prisma as any).discountUsage.findMany({
      where: { customerId },
      orderBy: { appliedAt: 'desc' },
    });
  }

  async countUsageByCustomer(
    discountId: string,
    customerId: string,
  ): Promise<number> {
    return (this.prisma as any).discountUsage.count({
      where: { discountId, customerId },
    });
  }

  // ==================== STATISTICS ====================

  async getPopularDiscounts(limit: number = 10): Promise<any[]> {
    return (this.prisma as any).discount.findMany({
      where: { isActive: true },
      orderBy: { usedCount: 'desc' },
      take: limit,
    });
  }

  async getUsageStats(discountId: string): Promise<{ totalUsage: number; totalDiscountGiven: number }> {
    const usage = await (this.prisma as any).discountUsage.aggregate({
      where: { discountId },
      _sum: { discountAmount: true },
      _count: { id: true },
    });

    return {
      totalUsage: usage._count.id,
      totalDiscountGiven: usage._sum.discountAmount || 0,
    };
  }
}
