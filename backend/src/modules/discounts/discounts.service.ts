// Discounts Service
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md
// Handles: Discount CRUD, validation, time-based rules, application

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DiscountsRepository } from './discounts.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { CreateDiscountDto, UpdateDiscountDto, ApplyDiscountDto } from './dto';
import {
  DiscountCreatedEvent,
  DiscountAppliedEvent,
  DiscountUsageLimitReachedEvent,
} from './events/discounts.events';
import {
  Discount,
  DiscountUsage,
  DiscountValidationResult,
} from './entities/discounts.entity';
import Decimal from 'decimal.js';

@Injectable()
export class DiscountsService {
  constructor(
    private readonly repo: DiscountsRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}

  // ==================== DISCOUNT CRUD ====================

  async create(dto: CreateDiscountDto): Promise<Discount> {
    const discount = await this.repo.create({
      ...dto,
      applicableOn: dto.applicableOn || 'ORDER',
      isCorporate: dto.isCorporate || false,
      requiresApproval: dto.requiresApproval || false,
      usedCount: 0,
      isActive: true,
    });

    await this.eventBus.publish(
      'DiscountCreated',
      new DiscountCreatedEvent(discount.id, discount.code),
    );

    return discount;
  }

  async findById(id: string): Promise<Discount> {
    const discount = await this.repo.findById(id);
    if (!discount) {
      throw new NotFoundException(`Discount ${id} not found`);
    }
    return discount;
  }

  async findByCode(code: string): Promise<Discount | null> {
    return this.repo.findByCode(code);
  }

  async update(id: string, dto: UpdateDiscountDto): Promise<Discount> {
    return this.repo.update(id, dto);
  }

  async getActiveDiscounts(): Promise<Discount[]> {
    return this.repo.findActive();
  }

  // ==================== VALIDATION ====================

  async validateAndCalculate(
    code: string,
    orderTotal: number,
    customerId?: string,
  ): Promise<DiscountValidationResult> {
    const discount = await this.repo.findByCode(code);

    if (!discount || !discount.isActive) {
      return {
        valid: false,
        amount: 0,
        requiresApproval: false,
        message: 'Discount code not found or inactive',
      };
    }

    // Check time-based rules
    if (!this.isTimeValid(discount)) {
      return {
        valid: false,
        amount: 0,
        requiresApproval: false,
        message: 'Discount not valid at this time',
      };
    }

    const orderTotalDecimal = new Decimal(orderTotal);

    // Check minimum order amount
    if (discount.minOrderAmount) {
      const minAmount = new Decimal(discount.minOrderAmount);
      if (orderTotalDecimal.lessThan(minAmount)) {
        return {
          valid: false,
          amount: 0,
          requiresApproval: false,
          message: `Minimum order amount ${minAmount} not met`,
        };
      }
    }

    // Check usage limits
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return {
        valid: false,
        amount: 0,
        requiresApproval: false,
        message: 'Discount usage limit reached',
      };
    }

    // Check customer usage limit
    if (discount.maxUsesPerCustomer && customerId) {
      const customerUsage = await this.repo.countUsageByCustomer(
        discount.id,
        customerId,
      );
      if (customerUsage >= discount.maxUsesPerCustomer) {
        return {
          valid: false,
          amount: 0,
          requiresApproval: false,
          message: 'You have reached the maximum uses for this discount',
        };
      }
    }

    // Check corporate eligibility
    if (discount.isCorporate) {
      if (!customerId || !discount.corporateIds?.includes(customerId)) {
        return {
          valid: false,
          amount: 0,
          requiresApproval: false,
          message: 'Not eligible for corporate discount',
        };
      }
    }

    // Calculate discount amount
    let discountAmount: Decimal;

    if (discount.type === 'PERCENTAGE') {
      const percentage = new Decimal(discount.value).dividedBy(100);
      discountAmount = orderTotalDecimal.times(percentage);

      // Apply max discount cap
      if (discount.maxDiscount) {
        const maxDiscount = new Decimal(discount.maxDiscount);
        if (discountAmount.greaterThan(maxDiscount)) {
          discountAmount = maxDiscount;
        }
      }
    } else {
      // FIXED_AMOUNT
      discountAmount = new Decimal(discount.value);

      // Don't exceed order total
      if (discountAmount.greaterThan(orderTotalDecimal)) {
        discountAmount = orderTotalDecimal;
      }
    }

    // Check if requires approval
    const requiresApproval =
      discount.requiresApproval &&
      discount.approvalThreshold !== null &&
      discount.approvalThreshold !== undefined &&
      discountAmount.greaterThanOrEqualTo(
        new Decimal(discount.approvalThreshold),
      );

    return {
      valid: true,
      amount: discountAmount.toNumber(),
      requiresApproval,
    };
  }

  private isTimeValid(discount: Discount): boolean {
    const now = new Date();

    // Check date range
    if (discount.startDate && now < discount.startDate) {
      return false;
    }
    if (discount.endDate && now > discount.endDate) {
      return false;
    }

    // Check time of day
    if (discount.startTime || discount.endTime) {
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (discount.startTime && currentTime < discount.startTime) {
        return false;
      }
      if (discount.endTime && currentTime > discount.endTime) {
        return false;
      }
    }

    // Check days of week
    if (discount.daysOfWeek && discount.daysOfWeek.length > 0) {
      const dayOfWeek = now.getDay();
      if (!discount.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }

    return true;
  }

  // ==================== APPLICATION ====================

  async applyDiscount(dto: ApplyDiscountDto): Promise<DiscountUsage> {
    const usage = await this.repo.createUsage({
      discountId: dto.discountId,
      orderId: dto.orderId,
      discountAmount: dto.amount,
      orderTotal: dto.orderTotal,
      approvedBy: dto.approvedBy,
      approvedAt: dto.approvedBy ? new Date() : null,
      appliedAt: new Date(),
      appliedBy: dto.userId,
    });

    // Increment usage count
    await this.repo.incrementUsage(dto.discountId);

    // Check if limit reached
    const discount = await this.repo.findById(dto.discountId);
    if (
      discount &&
      discount.maxUses &&
      discount.usedCount + 1 >= discount.maxUses
    ) {
      await this.eventBus.publish(
        'DiscountUsageLimitReached',
        new DiscountUsageLimitReachedEvent(dto.discountId, discount.code),
      );
    }

    await this.eventBus.publish(
      'DiscountApplied',
      new DiscountAppliedEvent(dto.discountId, dto.orderId, dto.amount),
    );

    return usage;
  }

  // ==================== QUERIES ====================

  async getValidDiscountsForOrder(
    orderTotal: number,
    customerId?: string,
  ): Promise<Discount[]> {
    const allDiscounts = await this.getActiveDiscounts();

    const validDiscounts: Discount[] = [];

    for (const discount of allDiscounts) {
      const result = await this.validateAndCalculate(
        discount.code,
        orderTotal,
        customerId,
      );
      if (result.valid) {
        validDiscounts.push(discount);
      }
    }

    return validDiscounts;
  }
}
