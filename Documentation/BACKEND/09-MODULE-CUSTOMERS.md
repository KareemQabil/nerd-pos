# Customers Module Implementation

**Module**: Customer Management, Loyalty  
**Priority**: Medium (CRM)  
**Dependencies**: Sales, Accounting

---

## **OVERVIEW**

Customer relationship management:
- **Customer Database** - Contact info, history
- **Loyalty Program** - Points, tiers, rewards
- **Purchase History** - Analytics, preferences
- **Addresses** - Delivery management

---

## **ENTITIES**

```prisma
model Customer {
  id            String   @id @default(uuid())
  code          String   @unique
  
  // Basic info
  name          String
  nameAr        String?
  phone         String   @unique
  email         String?
  
  // Loyalty
  loyaltyPoints Decimal  @db.Decimal(10, 2) @default(0)
  tierId        String?
  tier          LoyaltyTier? @relation(fields: [tierId], references: [id])
  
  // Stats
  totalSpent    Decimal  @db.Decimal(10, 2) @default(0)
  orderCount    Int      @default(0)
  lastOrderAt   DateTime?
  
  // Preferences
  preferredLanguage String @default("en") // en, ar
  notes         String?
  
  // Related
  orders        Order[]
  addresses     CustomerAddress[]
  
  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  isActive      Boolean  @default(true)
  
  @@index([phone])
  @@index([tierId])
}

model CustomerAddress {
  id            String   @id @default(uuid())
  customerId    String
  customer      Customer @relation(fields: [customerId], references: [id])
  
  // Address
  label         String   // "Home", "Office"
  street        String
  building      String?
  floor         String?
  apartment     String?
  city          String
  district      String
  
  // Location
  latitude      Decimal? @db.Decimal(10, 8)
  longitude     Decimal? @db.Decimal(11, 8)
  
  // Delivery notes
  instructions  String?
  
  isDefault     Boolean  @default(false)
  
  @@index([customerId])
}

model LoyaltyTier {
  id            String   @id @default(uuid())
  name          String   // "Silver", "Gold", "Platinum"
  nameAr        String
  
  // Requirements
  minSpent      Decimal  @db.Decimal(10, 2)
  minOrders     Int
  
  // Benefits
  pointsMultiplier Decimal @db.Decimal(5, 2) // 1.5x, 2.0x
  discountPercent  Decimal @db.Decimal(5, 2) // 5%, 10%
  
  // Display
  color         String
  icon          String?
  
  // Related
  customers     Customer[]
  
  displayOrder  Int
  isActive      Boolean  @default(true)
  
  @@index([displayOrder])
}
```

---

## **SERVICE**

```typescript
// customers.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class CustomersService {
  constructor(
    private readonly customerRepo: CustomerRepository,
    private readonly tierRepo: LoyaltyTierRepository,
    private readonly eventBus: IEventBus
  ) {}

  async create(dto: CreateCustomerDto): Promise<Customer> {
    const code = await this.generateCustomerCode();

    const customer = await this.customerRepo.create({
      code,
      name: dto.name,
      nameAr: dto.nameAr,
      phone: dto.phone,
      email: dto.email,
      preferredLanguage: dto.preferredLanguage || 'en'
    });

    await this.eventBus.publish('CustomerCreated',
      new CustomerCreatedEvent(customer.id, customer.name)
    );

    return customer;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    return this.customerRepo.findByPhone(phone);
  }

  async addLoyaltyPoints(
    customerId: string,
    amount: Decimal,
    orderId: string
  ): Promise<void> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) return;

    // Get tier multiplier
    let multiplier = new Decimal(1);
    if (customer.tier) {
      multiplier = new Decimal(customer.tier.pointsMultiplier);
    }

    // Calculate points (1 SAR = 1 point * multiplier)
    const points = amount.times(multiplier);

    // Add points
    const newPoints = new Decimal(customer.loyaltyPoints).plus(points);

    await this.customerRepo.update(customerId, {
      loyaltyPoints: newPoints.toNumber()
    });

    await this.eventBus.publish('LoyaltyPointsAdded',
      new LoyaltyPointsAddedEvent(customerId, points, orderId)
    );

    // Check tier upgrade
    await this.checkTierUpgrade(customerId);
  }

  async redeemPoints(
    customerId: string,
    points: Decimal
  ): Promise<Decimal> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    const currentPoints = new Decimal(customer.loyaltyPoints);

    if (currentPoints.lessThan(points)) {
      throw new BadRequestException('Insufficient loyalty points');
    }

    // Points to SAR (1 point = 0.01 SAR)
    const discount = points.times(new Decimal('0.01'));

    // Deduct points
    const newPoints = currentPoints.minus(points);

    await this.customerRepo.update(customerId, {
      loyaltyPoints: newPoints.toNumber()
    });

    await this.eventBus.publish('LoyaltyPointsRedeemed',
      new LoyaltyPointsRedeemedEvent(customerId, points, discount)
    );

    return discount;
  }

  async updateStats(customerId: string, orderTotal: Decimal): Promise<void> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) return;

    const totalSpent = new Decimal(customer.totalSpent).plus(orderTotal);
    const orderCount = customer.orderCount + 1;

    await this.customerRepo.update(customerId, {
      totalSpent: totalSpent.toNumber(),
      orderCount,
      lastOrderAt: new Date()
    });

    // Check tier upgrade
    await this.checkTierUpgrade(customerId);
  }

  private async checkTierUpgrade(customerId: string): Promise<void> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) return;

    const tiers = await this.tierRepo.findAllActive();

    // Find highest qualifying tier
    let qualifyingTier: LoyaltyTier | null = null;

    for (const tier of tiers) {
      const totalSpent = new Decimal(customer.totalSpent);
      const meetsSpend = totalSpent.greaterThanOrEqualTo(tier.minSpent);
      const meetsOrders = customer.orderCount >= tier.minOrders;

      if (meetsSpend && meetsOrders) {
        if (!qualifyingTier || tier.minSpent > qualifyingTier.minSpent) {
          qualifyingTier = tier;
        }
      }
    }

    if (qualifyingTier && customer.tierId !== qualifyingTier.id) {
      await this.customerRepo.update(customerId, {
        tierId: qualifyingTier.id
      });

      await this.eventBus.publish('TierUpgraded',
        new TierUpgradedEvent(customerId, qualifyingTier.id, qualifyingTier.name)
      );
    }
  }

  async addAddress(dto: AddAddressDto): Promise<CustomerAddress> {
    const address = await this.customerRepo.addAddress({
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
      isDefault: dto.isDefault || false
    });

    return address;
  }

  private async generateCustomerCode(): Promise<string> {
    const date = new Date();
    const prefix = `CUS${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const count = await this.customerRepo.countByPrefix(prefix);
    return `${prefix}${(count + 1).toString().padStart(5, '0')}`;
  }
}
```

---

## **CONTROLLER**

```typescript
// customers.controller.ts
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get('phone/:phone')
  async findByPhone(@Param('phone') phone: string) {
    return this.customersService.findByPhone(phone);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Post(':id/addresses')
  async addAddress(
    @Param('id') id: string,
    @Body() dto: AddAddressDto
  ) {
    return this.customersService.addAddress({ ...dto, customerId: id });
  }

  @Get(':id/orders')
  async getOrderHistory(@Param('id') id: string) {
    return this.customersService.getOrderHistory(id);
  }

  @Post(':id/loyalty/redeem')
  async redeemPoints(
    @Param('id') id: string,
    @Body() dto: RedeemPointsDto
  ) {
    return this.customersService.redeemPoints(id, new Decimal(dto.points));
  }
}
```

---

## **DTOs**

```typescript
// dto/create-customer.dto.ts
export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(['en', 'ar'])
  preferredLanguage?: string;
}

// dto/add-address.dto.ts
export class AddAddressDto {
  @IsString()
  customerId: string;

  @IsString()
  label: string;

  @IsString()
  street: string;

  @IsOptional()
  @IsString()
  building?: string;

  @IsString()
  city: string;

  @IsString()
  district: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
```

---

## **KEY FEATURES**

1. **Loyalty Program** - Points, tiers, auto-upgrade
2. **Points Multiplier** - Higher tiers earn more
3. **Redemption** - Points to SAR discount
4. **Purchase Tracking** - Total spent, order count
5. **Multi-Address** - Multiple delivery addresses
6. **Language Preference** - EN/AR customer preference

---

## **NEXT**

- [10-MODULE-COMPLIANCE.md](10-MODULE-COMPLIANCE.md) - ZATCA & ETA
