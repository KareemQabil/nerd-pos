// Customers Service
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md
// Handles: Customer CRUD, Loyalty points, Tier upgrades, Addresses

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CustomersRepository } from './customers.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  AddAddressDto,
  CreateLoyaltyTierDto,
  UpdateLoyaltyTierDto,
} from './dto';
import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  LoyaltyPointsAddedEvent,
  LoyaltyPointsRedeemedEvent,
  TierUpgradedEvent,
} from './events/customers.events';
import {
  Customer,
  CustomerWithTier,
  CustomerAddress,
  LoyaltyTier,
} from './entities/customers.entity';
import Decimal from 'decimal.js';

@Injectable()
export class CustomersService {
  // Points to SAR conversion rate (100 points = 1 SAR)
  private readonly pointsToSarRate = new Decimal('0.01');

  constructor(
    private readonly repo: CustomersRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {} // Force restart for Prisma Client update

  // ==================== CUSTOMER CRUD ====================

  async create(dto: CreateCustomerDto): Promise<Customer> {
    // Check if phone already exists
    const existing = await this.repo.findByPhone(dto.phone);
    if (existing) {
      throw new BadRequestException(
        `Customer with phone ${dto.phone} already exists`,
      );
    }

    const code = await this.generateCustomerCode();

    const customer = await this.repo.create({
      code,
      nameEn: dto.name,
      nameAr: dto.nameAr,
      phone: dto.phone,
      email: dto.email,
      preferredLanguage: dto.preferredLanguage || 'en',
      notes: dto.notes,
      loyaltyPoints: 0,
      totalSpent: 0,
      visitsCount: 0,
      isActive: true,
    });

    await this.eventBus.publish(
      'CustomerCreated',
      new CustomerCreatedEvent(customer.id, customer.nameEn),
    );

    return customer;
  }

  async findById(id: string): Promise<Customer> {
    const customer = await this.repo.findById(id);
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.repo.findByPhone(phone);
  }

  async findWithTier(id: string): Promise<CustomerWithTier> {
    const customer = await this.repo.findWithTier(id);
    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.repo.update(id, dto);

    await this.eventBus.publish(
      'CustomerUpdated',
      new CustomerUpdatedEvent(id, dto.name || customer.nameEn),
    );

    return customer;
  }

  async search(query: string): Promise<Customer[]> {
    return this.repo.search(query);
  }

  // Paginated version for API endpoints
  async searchPaginated(
    query: string,
    options: { page?: number; limit?: number },
  ): Promise<{
    data: Customer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.repo.searchPaginated(query, options);
  }

  // ==================== LOYALTY PROGRAM ====================

  async addLoyaltyPoints(
    customerId: string,
    amount: number,
    orderId: string,
  ): Promise<void> {
    const customer = await this.repo.findWithTier(customerId);
    if (!customer) return;

    // Get tier multiplier
    let multiplier = new Decimal(1);
    if (customer.tier) {
      multiplier = new Decimal(customer.tier.pointsMultiplier);
    }

    // Calculate points (1 SAR = 1 point * multiplier)
    const points = new Decimal(amount).times(multiplier);

    // Add points
    const newPoints = new Decimal(customer.loyaltyPoints).plus(points);

    await this.repo.update(customerId, {
      loyaltyPoints: newPoints.toNumber(),
    });

    await this.eventBus.publish(
      'LoyaltyPointsAdded',
      new LoyaltyPointsAddedEvent(customerId, points.toNumber(), orderId),
    );

    // Check tier upgrade
    await this.checkTierUpgrade(customerId);
  }

  async redeemPoints(
    customerId: string,
    pointsToRedeem: number,
  ): Promise<number> {
    const customer = await this.repo.findById(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const currentPoints = new Decimal(customer.loyaltyPoints);
    const points = new Decimal(pointsToRedeem);

    if (currentPoints.lessThan(points)) {
      throw new BadRequestException('Insufficient loyalty points');
    }

    // Points to SAR (100 points = 1 SAR)
    const discount = points.times(this.pointsToSarRate);

    // Deduct points
    const newPoints = currentPoints.minus(points);

    await this.repo.update(customerId, {
      loyaltyPoints: newPoints.toNumber(),
    });

    await this.eventBus.publish(
      'LoyaltyPointsRedeemed',
      new LoyaltyPointsRedeemedEvent(
        customerId,
        points.toNumber(),
        discount.toNumber(),
      ),
    );

    return discount.toNumber();
  }

  // ==================== CUSTOMER STATS ====================

  async updateStats(customerId: string, orderTotal: number): Promise<void> {
    const customer = await this.repo.findById(customerId);
    if (!customer) return;

    const totalSpent = new Decimal(customer.totalSpent).plus(orderTotal);
    const orderCount = (customer.visitsCount || 0) + 1;

    await this.repo.update(customerId, {
      totalSpent: totalSpent.toNumber(),
      visitsCount: orderCount,
      lastVisit: new Date(),
    });

    // Check tier upgrade
    await this.checkTierUpgrade(customerId);
  }

  private async checkTierUpgrade(customerId: string): Promise<void> {
    const customer = await this.repo.findById(customerId);
    if (!customer) return;

    const tiers = await this.repo.findAllTiers();

    // Find highest qualifying tier
    let qualifyingTier: LoyaltyTier | null = null;

    for (const tier of tiers) {
      const totalSpent = new Decimal(customer.totalSpent);
      const meetsSpend = totalSpent.greaterThanOrEqualTo(tier.minSpent);
      const meetsOrders = (customer.visitsCount || 0) >= tier.minOrders;

      if (meetsSpend && meetsOrders) {
        if (!qualifyingTier || tier.minSpent > qualifyingTier.minSpent) {
          qualifyingTier = tier;
        }
      }
    }

    if (qualifyingTier && customer.tierId !== qualifyingTier.id) {
      await this.repo.update(customerId, {
        tierId: qualifyingTier.id,
      });

      await this.eventBus.publish(
        'TierUpgraded',
        new TierUpgradedEvent(
          customerId,
          qualifyingTier.id,
          qualifyingTier.name,
        ),
      );
    }
  }

  // ==================== ADDRESSES ====================

  async addAddress(dto: AddAddressDto): Promise<CustomerAddress> {
    return this.repo.addAddress({
      customerId: dto.customerId,
      label: dto.label,
      street: dto.street,
      building: dto.building,
      floor: dto.floor,
      apartment: dto.apartment,
      city: dto.city,
      district: dto.district,
      latitude: dto.latitude,
      longitude: dto.longitude,
      instructions: dto.instructions,
      isDefault: dto.isDefault || false,
    });
  }

  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    return this.repo.findAddressesByCustomer(customerId);
  }

  // ==================== LOYALTY TIERS ====================

  async getAllTiers(): Promise<LoyaltyTier[]> {
    return this.repo.findAllTiers();
  }

  async createTier(dto: CreateLoyaltyTierDto): Promise<LoyaltyTier> {
    return this.repo.createTier({
      ...dto,
      isActive: true,
    });
  }

  async updateTier(
    id: string,
    dto: UpdateLoyaltyTierDto,
  ): Promise<LoyaltyTier> {
    return this.repo.updateTier(id, dto);
  }

  // ==================== CUSTOMER CODE GENERATION ====================

  private async generateCustomerCode(): Promise<string> {
    const date = new Date();
    const prefix = `CUS${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}`;
    const count = await this.repo.countByPrefix(prefix);
    return `${prefix}${(count + 1).toString().padStart(5, '0')}`;
  }
}
