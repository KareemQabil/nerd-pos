# Tables Module Implementation

**Module**: Floor Plans, Tables, Sections  
**Priority**: High (Restaurant operations)  
**Dependencies**: Sales

---

## **OVERVIEW**

Table and floor management for dine-in service:
- **Floor Plans** - Multiple floors/areas
- **Tables** - Table configuration with capacity
- **Sections** - Indoor, Outdoor, VIP assignment
- **Table Status** - Available, Occupied, Reserved

---

## **ENTITIES**

```prisma
model Floor {
  id            String   @id @default(uuid())
  name          String
  nameAr        String
  
  // Display
  displayOrder  Int      @default(0)
  isActive      Boolean  @default(true)
  
  // Related
  tables        Table[]
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([displayOrder])
}

model Table {
  id            String   @id @default(uuid())
  number        String
  floorId       String
  floor         Floor    @relation(fields: [floorId], references: [id])
  
  // Configuration
  capacity      Int
  section       String   // INDOOR, OUTDOOR, VIP
  shape         String   @default("SQUARE") // SQUARE, ROUND, RECTANGLE
  
  // Position (for floor plan UI)
  positionX     Int?
  positionY     Int?
  
  // Status
  status        String   @default("AVAILABLE") // AVAILABLE, OCCUPIED, RESERVED, DIRTY
  
  // Current order
  currentOrderId String? @unique
  currentOrder  Order?   @relation(fields: [currentOrderId], references: [id])
  
  // Assigned waiter
  waiterId      String?
  
  isActive      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([floorId, number])
  @@index([floorId])
  @@index([status])
  @@index([waiterId])
}

model TableReservation {
  id            String   @id @default(uuid())
  tableId       String
  table         Table    @relation(fields: [tableId], references: [id])
  
  // Customer
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  customerName  String
  customerPhone String
  
  // Reservation
  reservedFor   DateTime
  partySize     Int
  duration      Int      @default(120) // minutes
  
  // Notes
  specialRequests String?
  
  // Status
  status        String   @default("PENDING") // PENDING, CONFIRMED, SEATED, CANCELLED, NO_SHOW
  
  createdBy     String
  createdAt     DateTime @default(now())
  
  @@index([tableId])
  @@index([reservedFor])
  @@index([status])
}
```

---

## **SERVICE**

```typescript
// tables.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class TablesService {
  constructor(
    private readonly tableRepo: TableRepository,
    private readonly floorRepo: FloorRepository,
    private readonly eventBus: IEventBus
  ) {}

  async assignOrderToTable(tableId: string, orderId: string): Promise<Table> {
    const table = await this.tableRepo.findById(tableId);
    if (!table) {
      throw new NotFoundException(`Table ${tableId} not found`);
    }

    if (table.status !== 'AVAILABLE') {
      throw new BadRequestException(
        `Table ${table.number} is not available (status: ${table.status})`
      );
    }

    const updatedTable = await this.tableRepo.update(tableId, {
      status: 'OCCUPIED',
      currentOrderId: orderId
    });

    await this.eventBus.publish('TableOccupied',
      new TableOccupiedEvent(tableId, orderId, table.number)
    );

    return updatedTable;
  }

  async releaseTable(tableId: string): Promise<Table> {
    const table = await this.tableRepo.update(tableId, {
      status: 'DIRTY',
      currentOrderId: null
    });

    await this.eventBus.publish('TableReleased',
      new TableReleasedEvent(tableId, table.number)
    );

    return table;
  }

  async markTableClean(tableId: string): Promise<Table> {
    return this.tableRepo.update(tableId, {
      status: 'AVAILABLE'
    });
  }

  async transferTable(
    fromTableId: string,
    toTableId: string,
    orderId: string
  ): Promise<void> {
    const fromTable = await this.tableRepo.findById(fromTableId);
    const toTable = await this.tableRepo.findById(toTableId);

    if (!fromTable || !toTable) {
      throw new NotFoundException('Table not found');
    }

    if (toTable.status !== 'AVAILABLE') {
      throw new BadRequestException(
        `Target table ${toTable.number} is not available`
      );
    }

    // Release source table
    await this.tableRepo.update(fromTableId, {
      status: 'AVAILABLE',
      currentOrderId: null
    });

    // Assign to target table
    await this.tableRepo.update(toTableId, {
      status: 'OCCUPIED',
      currentOrderId: orderId
    });

    await this.eventBus.publish('TableTransferred',
      new TableTransferredEvent(fromTableId, toTableId, orderId)
    );
  }

  async getAvailableTables(floorId?: string): Promise<Table[]> {
    return this.tableRepo.findAvailable(floorId);
  }

  async getOccupiedTables(floorId?: string): Promise<Table[]> {
    return this.tableRepo.findOccupied(floorId);
  }

  async createReservation(dto: CreateReservationDto): Promise<TableReservation> {
    // Check table availability
    const conflicts = await this.tableRepo.findReservationConflicts(
      dto.tableId,
      dto.reservedFor,
      dto.duration
    );

    if (conflicts.length > 0) {
      throw new BadRequestException('Table already reserved for this time');
    }

    const reservation = await this.tableRepo.createReservation({
      tableId: dto.tableId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      reservedFor: dto.reservedFor,
      partySize: dto.partySize,
      duration: dto.duration,
      specialRequests: dto.specialRequests,
      status: 'PENDING',
      createdBy: dto.userId
    });

    await this.eventBus.publish('ReservationCreated',
      new ReservationCreatedEvent(reservation.id, dto.tableId, dto.reservedFor)
    );

    return reservation;
  }
}
```

---

## **CONTROLLER**

```typescript
// tables.controller.ts
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  async create(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto);
  }

  @Get('available')
  async getAvailable(@Query('floorId') floorId?: string) {
    return this.tablesService.getAvailableTables(floorId);
  }

  @Get('occupied')
  async getOccupied(@Query('floorId') floorId?: string) {
    return this.tablesService.getOccupiedTables(floorId);
  }

  @Post(':id/assign')
  async assignOrder(
    @Param('id') id: string,
    @Body() dto: { orderId: string }
  ) {
    return this.tablesService.assignOrderToTable(id, dto.orderId);
  }

  @Post(':id/release')
  async release(@Param('id') id: string) {
    return this.tablesService.releaseTable(id);
  }

  @Post(':id/clean')
  async markClean(@Param('id') id: string) {
    return this.tablesService.markTableClean(id);
  }

  @Post('transfer')
  async transfer(@Body() dto: TransferTableDto) {
    return this.tablesService.transferTable(
      dto.fromTableId,
      dto.toTableId,
      dto.orderId
    );
  }

  @Post('reservations')
  async createReservation(@Body() dto: CreateReservationDto) {
    return this.tablesService.createReservation(dto);
  }

  @Get('reservations/today')
  async getTodayReservations() {
    return this.tablesService.getTodayReservations();
  }
}
```

---

## **DTOs**

```typescript
// dto/create-table.dto.ts
export class CreateTableDto {
  @IsString()
  number: string;

  @IsUUID()
  floorId: string;

  @IsNumber()
  capacity: number;

  @IsIn(['INDOOR', 'OUTDOOR', 'VIP'])
  section: string;

  @IsOptional()
  @IsIn(['SQUARE', 'ROUND', 'RECTANGLE'])
  shape?: string;

  @IsOptional()
  @IsNumber()
  positionX?: number;

  @IsOptional()
  @IsNumber()
  positionY?: number;
}

// dto/create-reservation.dto.ts
export class CreateReservationDto {
  @IsUUID()
  tableId: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  customerName: string;

  @IsString()
  customerPhone: string;

  @IsDate()
  @Type(() => Date)
  reservedFor: Date;

  @IsNumber()
  partySize: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsString()
  userId: string;
}

// dto/transfer-table.dto.ts
export class TransferTableDto {
  @IsUUID()
  fromTableId: string;

  @IsUUID()
  toTableId: string;

  @IsUUID()
  orderId: string;
}
```

---

## **KEY FEATURES**

1. **Floor Management** - Multiple floors/areas
2. **Table Status** - Real-time availability tracking
3. **Table Assignment** - Assign orders to tables
4. **Table Transfer** - Move orders between tables
5. **Reservations** - Book tables in advance
6. **Section Management** - Indoor/Outdoor/VIP
7. **Waiter Assignment** - Assign tables to waiters
8. **Visual Floor Plan** - Position tracking for UI

---

## **NEXT**

- [13-MODULE-DISCOUNTS.md](13-MODULE-DISCOUNTS.md) - Discount system
