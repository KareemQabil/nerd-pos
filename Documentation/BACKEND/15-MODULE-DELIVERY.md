# Delivery Module Implementation

**Module**: Delivery Zones, Drivers, Tracking  
**Priority**: Medium (Delivery operations)  
**Dependencies**: Sales, Customers

---

## **OVERVIEW**

Delivery management system:
- **Delivery Zones** - Geographic areas with pricing
- **Drivers** - Driver accounts and assignments
- **Order Tracking** - Real-time delivery status
- **Route Optimization** - Efficient delivery planning

---

## **ENTITIES**

```prisma
model DeliveryZone {
  id            String   @id @default(uuid())
  name          String
  nameAr        String
  
  // Coverage
  districts     String[] // List of districts covered
  
  // Pricing
  deliveryFee   Decimal  @db.Decimal(10, 2)
  minOrderAmount Decimal? @db.Decimal(10, 2)
  freeDeliveryThreshold Decimal? @db.Decimal(10, 2)
  
  // Time
  estimatedTime Int      // minutes
  
  // Coordinates (polygon for map)
  coordinates   Json?    // GeoJSON polygon
  
  isActive      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([isActive])
}

model Driver {
  id            String   @id @default(uuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  
  // Profile
  licenseNumber String   @unique
  vehicleType   String   // BIKE, SCOOTER, CAR
  vehiclePlate  String
  
  // Contact
  phone         String
  
  // Status
  status        String   @default("OFFLINE") // OFFLINE, AVAILABLE, BUSY
  
  // Current location
  latitude      Decimal? @db.Decimal(10, 8)
  longitude     Decimal? @db.Decimal(11, 8)
  lastLocationUpdate DateTime?
  
  // Deliveries
  deliveries    Delivery[]
  
  // Stats
  totalDeliveries Int    @default(0)
  rating        Decimal? @db.Decimal(3, 2) // 0.00-5.00
  
  isActive      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([status])
}

model Delivery {
  id            String   @id @default(uuid())
  orderId       String   @unique
  order         Order    @relation(fields: [orderId], references: [id])
  
  // Customer address
  addressId     String
  address       CustomerAddress @relation(fields: [addressId], references: [id])
  
  // Zone
  zoneId        String?
  zone          DeliveryZone? @relation(fields: [zoneId], references: [id])
  
  // Driver assignment
  driverId      String?
  driver        Driver?  @relation(fields: [driverId], references: [id])
  
  // Fee
  deliveryFee   Decimal  @db.Decimal(10, 2)
  
  // Timing
  scheduledFor  DateTime?
  pickedUpAt    DateTime?
  deliveredAt   DateTime?
  
  // Status
  status        String   @default("PENDING") // PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
  
  // Tracking
  estimatedTime Int?     // minutes
  trackingNotes String?
  
  // Customer rating
  customerRating Int?    // 1-5
  customerFeedback String?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([status])
  @@index([driverId])
  @@index([scheduledFor])
}
```

---

## **SERVICE**

```typescript
// delivery.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly deliveryRepo: DeliveryRepository,
    private readonly zoneRepo: DeliveryZoneRepository,
    private readonly driverRepo: DriverRepository,
    private readonly eventBus: IEventBus
  ) {}

  async calculateDeliveryFee(
    addressId: string,
    orderTotal: Decimal
  ): Promise<{ fee: Decimal; zone: DeliveryZone | null; estimate: number }> {
    // Find zone for address
    const address = await this.deliveryRepo.findAddressById(addressId);
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    const zone = await this.zoneRepo.findByDistrict(address.district);
    if (!zone) {
      throw new BadRequestException(
        `No delivery zone found for district ${address.district}`
      );
    }

    let fee = new Decimal(zone.deliveryFee);

    // Check free delivery threshold
    if (zone.freeDeliveryThreshold) {
      const threshold = new Decimal(zone.freeDeliveryThreshold);
      if (orderTotal.greaterThanOrEqualTo(threshold)) {
        fee = new Decimal(0);
      }
    }

    return {
      fee,
      zone,
      estimate: zone.estimatedTime
    };
  }

  async createDelivery(dto: CreateDeliveryDto): Promise<Delivery> {
    const { fee, zone } = await this.calculateDeliveryFee(
      dto.addressId,
      new Decimal(dto.orderTotal)
    );

    const delivery = await this.deliveryRepo.create({
      orderId: dto.orderId,
      addressId: dto.addressId,
      zoneId: zone?.id,
      deliveryFee: fee.toNumber(),
      scheduledFor: dto.scheduledFor,
      estimatedTime: zone?.estimatedTime,
      status: 'PENDING'
    });

    await this.eventBus.publish('DeliveryCreated',
      new DeliveryCreatedEvent(delivery.id, dto.orderId)
    );

    return delivery;
  }

  async assignDriver(deliveryId: string, driverId: string): Promise<Delivery> {
    const driver = await this.driverRepo.findById(driverId);
    if (!driver || driver.status !== 'AVAILABLE') {
      throw new BadRequestException('Driver not available');
    }

    const delivery = await this.deliveryRepo.update(deliveryId, {
      driverId,
      status: 'ASSIGNED'
    });

    await this.driverRepo.update(driverId, {
      status: 'BUSY'
    });

    await this.eventBus.publish('DriverAssigned',
      new DriverAssignedEvent(deliveryId, driverId)
    );

    return delivery;
  }

  async updateStatus(
    deliveryId: string,
    status: string,
    driverId?: string
  ): Promise<Delivery> {
    const timestamps: any = {};

    if (status === 'PICKED_UP') {
      timestamps.pickedUpAt = new Date();
    } else if (status === 'DELIVERED') {
      timestamps.deliveredAt = new Date();
      
      // Make driver available again
      if (driverId) {
        await this.driverRepo.update(driverId, {
          status: 'AVAILABLE',
          totalDeliveries: { increment: 1 }
        });
      }
    }

    const delivery = await this.deliveryRepo.update(deliveryId, {
      status,
      ...timestamps
    });

    await this.eventBus.publish('DeliveryStatusUpdated',
      new DeliveryStatusUpdatedEvent(deliveryId, status)
    );

    return delivery;
  }

  async updateDriverLocation(
    driverId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    await this.driverRepo.update(driverId, {
      latitude,
      longitude,
      lastLocationUpdate: new Date()
    });
  }

  async getActiveDeliveries(driverId?: string): Promise<Delivery[]> {
    return this.deliveryRepo.findActive(driverId);
  }
}
```

---

## **CONTROLLER**

```typescript
// delivery.controller.ts
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('calculate-fee')
  async calculateFee(@Body() dto: { addressId: string; orderTotal: number }) {
    return this.deliveryService.calculateDeliveryFee(
      dto.addressId,
      new Decimal(dto.orderTotal)
    );
  }

  @Post()
  async create(@Body() dto: CreateDeliveryDto) {
    return this.deliveryService.createDelivery(dto);
  }

  @Post(':id/assign')
  async assignDriver(
    @Param('id') id: string,
    @Body() dto: { driverId: string }
  ) {
    return this.deliveryService.assignDriver(id, dto.driverId);
  }

  @Put(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: string; driverId?: string }
  ) {
    return this.deliveryService.updateStatus(id, dto.status, dto.driverId);
  }

  @Get('active')
  async getActive(@Query('driverId') driverId?: string) {
    return this.deliveryService.getActiveDeliveries(driverId);
  }

  @Put('drivers/:id/location')
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: { latitude: number; longitude: number }
  ) {
    return this.deliveryService.updateDriverLocation(
      id,
      dto.latitude,
      dto.longitude
    );
  }
}
```

---

## **DTOs**

```typescript
export class CreateDeliveryDto {
  @IsUUID()
  orderId: string;

  @IsUUID()
  addressId: string;

  @IsNumber()
  orderTotal: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledFor?: Date;
}
```

---

## **KEY FEATURES**

1. **Zone-Based Pricing** - Different fees per zone
2. **Free Delivery Threshold** - Waive fee for large orders
3. **Driver Assignment** - Auto or manual assignment
4. **Real-Time Tracking** - GPS location updates
5. **Status Workflow** - PENDING → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
6. **Customer Feedback** - Rating and feedback
7. **Driver Management** - Availability, stats, ratings

---

## **NEXT**

- [16-MODULE-REPORTS.md](16-MODULE-REPORTS.md) - Reporting system
