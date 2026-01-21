// Customers Repository
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md, 08-repository.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
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
export class CustomersRepository extends BaseRepository<Customer> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  protected get model() {
    return 'customer';
  }

  // ==================== CUSTOMER ====================

  async findByPhone(phone: string): Promise<Customer | null> {
    return (this.prisma as any).customer.findUnique({
      where: { phone },
    });
  }

  async findByCode(code: string): Promise<Customer | null> {
    return (this.prisma as any).customer.findUnique({
      where: { code },
    });
  }

  async findWithTier(id: string): Promise<CustomerWithTier | null> {
    return (this.prisma as any).customer.findUnique({
      where: { id },
      include: { tier: true, addresses: true },
    });
  }

  async findActive(): Promise<Customer[]> {
    return (this.prisma as any).customer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async search(query: string): Promise<Customer[]> {
    return (this.prisma as any).customer.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
          { code: { contains: query } },
        ],
      },
      take: 20,
    });
  }

  async countByPrefix(prefix: string): Promise<number> {
    return (this.prisma as any).customer.count({
      where: { code: { startsWith: prefix } },
    });
  }

  // ==================== CUSTOMER ADDRESS ====================

  async findAddressesByCustomer(
    customerId: string,
  ): Promise<CustomerAddress[]> {
    return (this.prisma as any).customerAddress.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { label: 'asc' }],
    });
  }

  async addAddress(data: CreateCustomerAddressData): Promise<CustomerAddress> {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await (this.prisma as any).customerAddress.updateMany({
        where: { customerId: data.customerId },
        data: { isDefault: false },
      });
    }
    return (this.prisma as any).customerAddress.create({ data });
  }

  async updateAddress(
    id: string,
    data: Partial<CreateCustomerAddressData>,
  ): Promise<CustomerAddress> {
    return (this.prisma as any).customerAddress.update({
      where: { id },
      data,
    });
  }

  async deleteAddress(id: string): Promise<void> {
    await (this.prisma as any).customerAddress.delete({
      where: { id },
    });
  }

  // ==================== LOYALTY TIER ====================

  async findAllTiers(): Promise<LoyaltyTier[]> {
    return (this.prisma as any).loyaltyTier.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findTierById(id: string): Promise<LoyaltyTier | null> {
    return (this.prisma as any).loyaltyTier.findUnique({
      where: { id },
    });
  }

  async createTier(data: CreateLoyaltyTierData): Promise<LoyaltyTier> {
    return (this.prisma as any).loyaltyTier.create({ data });
  }

  async updateTier(
    id: string,
    data: Partial<CreateLoyaltyTierData>,
  ): Promise<LoyaltyTier> {
    return (this.prisma as any).loyaltyTier.update({
      where: { id },
      data,
    });
  }

  // ==================== STATISTICS ====================

  async getTopCustomers(limit: number = 10): Promise<Customer[]> {
    return (this.prisma as any).customer.findMany({
      where: { isActive: true },
      orderBy: { totalSpent: 'desc' },
      take: limit,
    });
  }

  async getCustomersByTier(tierId: string): Promise<Customer[]> {
    return (this.prisma as any).customer.findMany({
      where: { tierId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
