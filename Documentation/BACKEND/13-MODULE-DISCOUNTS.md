# Discounts Module Implementation

**Module**: Discounts, Rules, Time-Based  
**Priority**: High (POS requirement)  
**Dependencies**: Sales, Users

---

## **OVERVIEW**

Discount management system:
- **Discount Types** - Percentage, Fixed amount
- **Time-Based Rules** - Happy hour, Early bird
- **Corporate Discounts** - Special customer pricing
- **Manager Approval** - Threshold-based authorization

---

## **ENTITIES**

```prisma
model Discount {
  id            String   @id @default(uuid())
  code          String   @unique
  name          String
  nameAr        String
  description   String?
  
  // Type
  type          String   // PERCENTAGE, FIXED_AMOUNT
  value         Decimal  @db.Decimal(10, 2)
  
  // Conditions
  minOrderAmount Decimal? @db.Decimal(10, 2)
  maxDiscount   Decimal? @db.Decimal(10, 2) // For percentage discounts
  
  // Applicability
  applicableOn  String   @default("ORDER") // ORDER, CATEGORY, PRODUCT
  categoryIds   String[] // If applicable on category
  productIds    String[] // If applicable on product
  
  // Time-based rules
  startDate     DateTime?
  endDate       DateTime?
  startTime     String?  // "18:00" (HH:mm)
  endTime       String?  // "20:00" (HH:mm)
  daysOfWeek    Int[]    // [0-6] where 0=Sunday
  
  // Corporate
  isCorporate   Boolean  @default(false)
  corporateIds  String[] // Customer IDs eligible
  
  // Authorization
  requiresApproval Boolean @default(false)
  approvalThreshold Decimal? @db.Decimal(10, 2)
  
  // Usage limits
  maxUses       Int?
  usedCount     Int      @default(0)
  maxUsesPerCustomer Int?
  
  // Status
  isActive      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  
  @@index([code])
  @@index([type])
  @@index([isActive])
}

model DiscountUsage {
  id            String   @id @default(uuid())
  discountId    String
  discount      Discount @relation(fields: [discountId], references: [id])
  
  // Order reference
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id])
  
  // Customer
  customerId    String?
  
  // Applied discount
  discountAmount Decimal @db.Decimal(10, 2)
  orderTotal    Decimal  @db.Decimal(10, 2)
  
  // Authorization
  approvedBy    String?
  approvedAt    DateTime?
  
  appliedAt     DateTime @default(now())
  appliedBy     String
  
  @@index([discountId])
  @@index([orderId])
  @@index([customerId])
}
```

---

## **SERVICE**

```typescript
// discounts.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class DiscountsService {
  constructor(
    private readonly discountRepo: DiscountRepository,
    private readonly eventBus: IEventBus
  ) {}

  async validateAndCalculate(
    discountCode: string,
    orderTotal: Decimal,
    customerId?: string,
    items?: OrderItem[]
  ): Promise<{ valid: boolean; amount: Decimal; requiresApproval: boolean }> {
    const discount = await this.discountRepo.findByCode(discountCode);
    
    if (!discount || !discount.isActive) {
      throw new NotFoundException(`Discount code ${discountCode} not found or inactive`);
    }

    // Check time-based rules
    if (!this.isTimeValid(discount)) {
      throw new BadRequestException('Discount not valid at this time');
    }

    // Check minimum order amount
    if (discount.minOrderAmount) {
      const minAmount = new Decimal(discount.minOrderAmount);
      if (orderTotal.lessThan(minAmount)) {
        throw new BadRequestException(
          `Minimum order amount ${minAmount} not met`
        );
      }
    }

    // Check usage limits
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      throw new BadRequestException('Discount usage limit reached');
    }

    // Check corporate eligibility
    if (discount.isCorporate) {
      if (!customerId || !discount.corporateIds.includes(customerId)) {
        throw new BadRequestException('Not eligible for corporate discount');
      }
    }

    // Calculate discount amount
    let discountAmount: Decimal;
    
    if (discount.type === 'PERCENTAGE') {
      const percentage = new Decimal(discount.value).dividedBy(100);
      discountAmount = orderTotal.times(percentage);
      
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
      if (discountAmount.greaterThan(orderTotal)) {
        discountAmount = orderTotal;
      }
    }

    // Check if requires approval
    const requiresApproval = 
      discount.requiresApproval && 
      discount.approvalThreshold &&
      discountAmount.greaterThanOrEqualTo(discount.approvalThreshold);

    return {
      valid: true,
      amount: discountAmount,
      requiresApproval
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

  async applyDiscount(
    discountId: string,
    orderId: string,
    discountAmount: Decimal,
    orderTotal: Decimal,
    userId: string,
    approvedBy?: string
  ): Promise<DiscountUsage> {
    const usage = await this.discountRepo.createUsage({
      discountId,
      orderId,
      discountAmount: discountAmount.toNumber(),
      orderTotal: orderTotal.toNumber(),
      approvedBy,
      approvedAt: approvedBy ? new Date() : null,
      appliedBy: userId
    });

    // Update usage count
    await this.discountRepo.incrementUsage(discountId);

    await this.eventBus.publish('DiscountApplied',
      new DiscountAppliedEvent(
        discountId,
        orderId,
        discountAmount.toNumber()
      )
    );

    return usage;
  }

  async getActiveDiscounts(): Promise<Discount[]> {
    return this.discountRepo.findActive();
  }

  async getValidDiscountsForOrder(
    orderTotal: Decimal,
    customerId?: string
  ): Promise<Discount[]> {
    const allDiscounts = await this.getActiveDiscounts();
    
    return allDiscounts.filter(discount => {
      // Check time validity
      if (!this.isTimeValid(discount)) {
        return false;
      }

      // Check minimum
      if (discount.minOrderAmount && 
          orderTotal.lessThan(discount.minOrderAmount)) {
        return false;
      }

      // Check corporate
      if (discount.isCorporate) {
        if (!customerId || !discount.corporateIds.includes(customerId)) {
          return false;
        }
      }

      return true;
    });
  }
}
```

---

## **CONTROLLER**

```typescript
// discounts.controller.ts
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  async create(@Body() dto: CreateDiscountDto) {
    return this.discountsService.create(dto);
  }

  @Get()
  async getAll() {
    return this.discountsService.getActiveDiscounts();
  }

  @Post('validate')
  async validate(@Body() dto: ValidateDiscountDto) {
    return this.discountsService.validateAndCalculate(
      dto.code,
      new Decimal(dto.orderTotal),
      dto.customerId
    );
  }

  @Post('apply')
  async apply(@Body() dto: ApplyDiscountDto) {
    return this.discountsService.applyDiscount(
      dto.discountId,
      dto.orderId,
      new Decimal(dto.amount),
      new Decimal(dto.orderTotal),
      dto.userId,
      dto.approvedBy
    );
  }

  @Get('valid')
  async getValidForOrder(
    @Query('orderTotal') orderTotal: number,
    @Query('customerId') customerId?: string
  ) {
    return this.discountsService.getValidDiscountsForOrder(
      new Decimal(orderTotal),
      customerId
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.discountsService.findById(id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto
  ) {
    return this.discountsService.update(id, dto);
  }
}
```

---

## **DTOs**

```typescript
// dto/create-discount.dto.ts
export class CreateDiscountDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'])
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';

  @IsNumber()
  value: number;

  @IsOptional()
  @IsNumber()
  minOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  maxDiscount?: number;

  @IsOptional()
  @IsIn(['ORDER', 'CATEGORY', 'PRODUCT'])
  applicableOn?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  startTime?: string; // "18:00"

  @IsOptional()
  @IsString()
  endTime?: string; // "20:00"

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[]; // [0-6]

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsNumber()
  approvalThreshold?: number;

  @IsString()
  createdBy: string;
}

// dto/validate-discount.dto.ts
export class ValidateDiscountDto {
  @IsString()
  code: string;

  @IsNumber()
  orderTotal: number;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

// dto/apply-discount.dto.ts
export class ApplyDiscountDto {
  @IsUUID()
  discountId: string;

  @IsUUID()
  orderId: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  orderTotal: number;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  approvedBy?: string;
}
```

---

## **KEY FEATURES**

1. **Discount Types** - Percentage or fixed amount
2. **Time-Based Rules** - Happy hour, day/time restrictions
3. **Corporate Discounts** - Customer-specific pricing
4. **Manager Approval** - Threshold-based authorization
5. **Usage Limits** - Per discount and per customer
6. **Min Order Amount** - Conditions for eligibility
7. **Max Discount Cap** - Limit percentage discounts
8. **Real-Time Validation** - Check eligibility before applying

---

## **NEXT**

- [14-MODULE-USERS-ROLES.md](14-MODULE-USERS-ROLES.md) - Authentication & authorization
