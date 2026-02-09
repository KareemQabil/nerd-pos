// Customers Repository
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md, 08-repository.md

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  PaginationOptions,
  PaginatedResult,
} from '../../core/interfaces/pagination.interface';
import {
  Customer,
  CustomerWithTier,
  CustomerAddress,
  LoyaltyTier,
} from './entities/customers.entity';
import {
  CreateCustomerAddressData,
  CreateLoyaltyTierData,
} from './dto/repository.dto';

@Injectable()
export class CustomersRepository extends BaseRepository<Customer, 'customer'> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model(): 'customer' {
    return 'customer';
  }

  // ==================== CUSTOMER ====================

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.prisma.customer.findFirst({
      where: { phone },
    });
  }

  async findByCode(code: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { code },
    });
  }

  async findWithTier(id: string): Promise<CustomerWithTier | null> {
    return this.prisma.customer.findUnique({
      where: { id },
      include: { tier: true, addresses: true },
    });
  }

  async findActive(): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { nameEn: 'asc' },
    });
  }

  async search(query: string): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: {
        OR: [
          { nameEn: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { nameAr: { contains: query, mode: Prisma.QueryMode.insensitive } },
          { phone: { contains: query } },
          { code: { contains: query } },
        ],
      },
      take: 20,
    });
  }

  // PAGINATION FIX: Paginated version for API endpoints
  async searchPaginated(
    query: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Customer>> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { nameEn: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { nameAr: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { phone: { contains: query } },
        { code: { contains: query } },
      ],
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async countByPrefix(prefix: string): Promise<number> {
    return this.prisma.customer.count({
      where: { code: { startsWith: prefix } },
    });
  }

  // ==================== CUSTOMER ADDRESS ====================

  async findAddressesByCustomer(
    customerId: string,
  ): Promise<CustomerAddress[]> {
    return this.prisma.customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    });
  }

  async addAddress(data: CreateCustomerAddressData): Promise<CustomerAddress> {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId: data.customerId },
        data: { isDefault: false },
      });
    }
    return this.prisma.customerAddress.create({ data });
  }

  async updateAddress(
    id: string,
    data: Partial<CreateCustomerAddressData>,
  ): Promise<CustomerAddress> {
    return this.prisma.customerAddress.update({
      where: { id },
      data,
    });
  }

  async deleteAddress(id: string): Promise<void> {
    await this.prisma.customerAddress.delete({
      where: { id },
    });
  }

  // ==================== LOYALTY TIER ====================

  async findAllTiers(): Promise<LoyaltyTier[]> {
    return this.prisma.loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findTierById(id: string): Promise<LoyaltyTier | null> {
    return this.prisma.loyaltyTier.findUnique({
      where: { id },
    });
  }

  async createTier(data: CreateLoyaltyTierData): Promise<LoyaltyTier> {
    return this.prisma.loyaltyTier.create({ data });
  }

  async updateTier(
    id: string,
    data: Partial<CreateLoyaltyTierData>,
  ): Promise<LoyaltyTier> {
    return this.prisma.loyaltyTier.update({
      where: { id },
      data,
    });
  }

  // ==================== STATISTICS ====================

  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { totalSpent: 'desc' },
      take: limit,
    });
  }

  async getCustomersByTier(tierId: string): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: { tierId, isActive: true },
      orderBy: { nameEn: 'asc' },
    });
  }
}
