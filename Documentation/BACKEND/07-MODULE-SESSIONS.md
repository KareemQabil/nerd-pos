# Sessions Module Implementation

**Module**: Register Sessions, Open/Close, Blind Close  
**Priority**: High (Accounting control)  
**Dependencies**: Payments, Sales

---

## **OVERVIEW**

Register session management:
- **Open Session**: Start shift with opening balance
- **Close Session**: End shift with blind close
- **Denomination Count**: Cash drawer count
- **Variance Tracking**: Expected vs actual cash

---

## **ENTITIES**

```prisma
model Session {
  id              String   @id @default(uuid())
  sessionNumber   String   @unique
  
  // User
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  // Cash management
  openingBalance  Decimal  @db.Decimal(10, 2)
  closingBalance  Decimal? @db.Decimal(10, 2)
  expectedBalance Decimal? @db.Decimal(10, 2)
  variance        Decimal? @db.Decimal(10, 2)
  
  // Sales summary
  totalSales      Decimal  @db.Decimal(10, 2) @default(0)
  totalCash       Decimal  @db.Decimal(10, 2) @default(0)
  totalCard       Decimal  @db.Decimal(10, 2) @default(0)
  totalRefunds    Decimal  @db.Decimal(10, 2) @default(0)
  orderCount      Int      @default(0)
  
  // Timestamps
  openedAt        DateTime @default(now())
  closedAt        DateTime?
  
  // Related
  orders          Order[]
  payments        Payment[]
  denominations   Denomination[]
  
  status          String   @default("OPEN") // OPEN, CLOSED
  
  @@index([userId])
  @@index([status])
}

model Denomination {
  id          String  @id @default(uuid())
  sessionId   String
  session     Session @relation(fields: [sessionId], references: [id])
  
  // Denomination (200, 100, 50, 20, 10, 5, 1, 0.5, 0.25, 0.10, 0.05)
  value       Decimal @db.Decimal(10, 2)
  count       Int
  total       Decimal @db.Decimal(10, 2)
  
  @@index([sessionId])
}
```

---

## **SERVICE**

```typescript
// sessions.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class SessionsService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly orderRepo: OrderRepository,
    private readonly paymentRepo: PaymentRepository,
    private readonly eventBus: IEventBus
  ) {}

  async openSession(dto: OpenSessionDto): Promise<Session> {
    // Check for existing open session
    const existingSession = await this.sessionRepo.findOpenSession(dto.userId);
    if (existingSession) {
      throw new BadRequestException(
        `User already has an open session: ${existingSession.sessionNumber}`
      );
    }

    const sessionNumber = await this.generateSessionNumber();
    const openingBalance = new Decimal(dto.openingBalance);

    const session = await this.sessionRepo.create({
      sessionNumber,
      userId: dto.userId,
      openingBalance: openingBalance.toNumber(),
      status: 'OPEN',
      openedAt: new Date()
    });

    await this.eventBus.publish('SessionOpened',
      new SessionOpenedEvent(session.id, session.userId, openingBalance)
    );

    return session;
  }

  async closeSession(dto: CloseSessionDto): Promise<Session> {
    const session = await this.sessionRepo.findById(dto.sessionId);
    if (!session) {
      throw new NotFoundException(`Session ${dto.sessionId} not found`);
    }

    if (session.status === 'CLOSED') {
      throw new BadRequestException('Session already closed');
    }

    // Calculate expected balance
    const cashPayments = await this.paymentRepo.findCashBySession(session.id);
    const cashRefunds = await this.paymentRepo.findCashRefundsBySession(session.id);

    const totalCashSales = cashPayments.reduce(
      (sum, p) => sum.plus(new Decimal(p.amount)),
      new Decimal(0)
    );

    const totalCashRefunds = cashRefunds.reduce(
      (sum, r) => sum.plus(new Decimal(r.amount)),
      new Decimal(0)
    );

    const expectedBalance = new Decimal(session.openingBalance)
      .plus(totalCashSales)
      .minus(totalCashRefunds);

    // Process denomination count
    const declaredBalance = await this.processDenominations(
      session.id,
      dto.denominations
    );

    // Calculate variance
    const variance = declaredBalance.minus(expectedBalance);

    // Get all session stats
    const orders = await this.orderRepo.findBySession(session.id);
    const allPayments = await this.paymentRepo.findBySession(session.id);

    const totalSales = orders.reduce(
      (sum, o) => sum.plus(new Decimal(o.grandTotal)),
      new Decimal(0)
    );

    const totalCard = allPayments
      .filter(p => p.method !== 'CASH')
      .reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0));

    // Update session
    const closedSession = await this.sessionRepo.update(session.id, {
      status: 'CLOSED',
      closedAt: new Date(),
      closingBalance: declaredBalance.toNumber(),
      expectedBalance: expectedBalance.toNumber(),
      variance: variance.toNumber(),
      totalSales: totalSales.toNumber(),
      totalCash: totalCashSales.toNumber(),
      totalCard: totalCard.toNumber(),
      totalRefunds: totalCashRefunds.toNumber(),
      orderCount: orders.length
    });

    await this.eventBus.publish('SessionClosed',
      new SessionClosedEvent(session.id, variance, declaredBalance)
    );

    return closedSession;
  }

  private async processDenominations(
    sessionId: string,
    denominations: DenominationDto[]
  ): Promise<Decimal> {
    let total = new Decimal(0);

    for (const denom of denominations) {
      const value = new Decimal(denom.value);
      const count = denom.count;
      const denominationTotal = value.times(count);

      await this.denominationRepo.create({
        sessionId,
        value: value.toNumber(),
        count,
        total: denominationTotal.toNumber()
      });

      total = total.plus(denominationTotal);
    }

    return total;
  }

  private async generateSessionNumber(): Promise<string> {
    const date = new Date();
    const prefix = `SES${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const count = await this.sessionRepo.countByPrefix(prefix);
    return `${prefix}${(count + 1).toString().padStart(4, '0')}`;
  }

  async getCurrentSession(userId: string): Promise<Session | null> {
    return this.sessionRepo.findOpenSession(userId);
  }
}
```

---

## **CONTROLLER**

```typescript
// sessions.controller.ts
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('open')
  async openSession(@Body() dto: OpenSessionDto) {
    return this.sessionsService.openSession(dto);
  }

  @Post('close')
  async closeSession(@Body() dto: CloseSessionDto) {
    return this.sessionsService.closeSession(dto);
  }

  @Get('current/:userId')
  async getCurrentSession(@Param('userId') userId: string) {
    return this.sessionsService.getCurrentSession(userId);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.sessionsService.findById(id);
  }
}
```

---

## **DTOs**

```typescript
// dto/open-session.dto.ts
export class OpenSessionDto {
  @IsString()
  userId: string;

  @IsNumber()
  openingBalance: number;
}

// dto/close-session.dto.ts
export class DenominationDto {
  @IsNumber()
  value: number; // 200, 100, 50, 20, 10, 5, 1, 0.5, etc.

  @IsNumber()
  count: number;
}

export class CloseSessionDto {
  @IsUUID()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DenominationDto)
  denominations: DenominationDto[];
}
```

---

## **KEY FEATURES**

1. **Blind Close** - Count cash without seeing expected
2. **Variance Tracking** - Expected vs actual
3. **Denomination Count** - Detailed cash breakdown
4. **One Session Per User** - Prevents conflicts
5. **Auto-calculation** - Sales totals from orders
6. **Event-Driven** - SessionOpened, SessionClosed

---

## **NEXT**

- [08-MODULE-KITCHEN.md](08-MODULE-KITCHEN.md) - Kitchen Display System
