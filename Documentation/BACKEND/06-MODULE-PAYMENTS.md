# Payments Module Implementation

**Module**: Payments, Payment Methods, Split Payments, Refunds  
**Priority**: Critical (Core business flow)  
**Dependencies**: Sales module

---

## **OVERVIEW**

Handles all payment operations:
- **Single Payments**: Cash, Card, Mada, Digital wallets
- **Split Payments**: Multiple payment methods for one order
- **Refunds**: Full/partial refunds
- **Tips**: Service tips handling

---

## **ENTITIES**

```prisma
model Payment {
  id            String   @id @default(uuid())
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id])
  
  // Payment details
  method        String   // CASH, CARD, MADA, WALLET
  amount        Decimal  @db.Decimal(10, 2)
  receivedAmount Decimal? @db.Decimal(10, 2) // For cash
  changeAmount  Decimal  @db.Decimal(10, 2) @default(0)
  
  // Card details (encrypted)
  cardLast4     String?
  cardType      String?  // VISA, MASTERCARD, MADA
  transactionId String?  @unique
  
  // Status
  status        String   @default("PENDING") // PENDING, COMPLETED, FAILED, REFUNDED
  
  // Refund tracking
  refundedAmount Decimal @db.Decimal(10, 2) @default(0)
  refunds       Refund[]
  
  // Tips
  tipAmount     Decimal  @db.Decimal(10, 2) @default(0)
  
  // Timestamps
  paidAt        DateTime?
  failedAt      DateTime?
  
  // Audit
  sessionId     String?
  createdBy     String
  createdAt     DateTime @default(now())
  
  @@index([orderId])
  @@index([transactionId])
  @@index([status])
}

model PaymentMethod {
  id          String   @id @default(uuid())
  name        String
  nameAr      String
  type        String   // CASH, CARD, MADA, WALLET
  
  // Integration
  provider    String?  // STRIPE, PAYFORT, HYPERPAY
  apiKey      String?  // Encrypted
  
  // Settings
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Refund {
  id          String   @id @default(uuid())
  paymentId   String
  payment     Payment  @relation(fields: [paymentId], references: [id])
  
  amount      Decimal  @db.Decimal(10, 2)
  reason      String
  notes       String?
  
  // Approval
  approvedBy  String?
  approvedAt  DateTime?
  
  status      String   @default("PENDING") // PENDING, APPROVED, COMPLETED, REJECTED
  
  createdBy   String
  createdAt   DateTime @default(now())
  
  @@index([paymentId])
}
```

---

## **SPLIT PAYMENT LOGIC**

```typescript
// payments.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepo: PaymentRepository,
    private readonly orderRepo: OrderRepository,
    private readonly eventBus: IEventBus
  ) {}

  async processSplitPayment(dto: SplitPaymentDto): Promise<Payment[]> {
    const order = await this.orderRepo.findById(dto.orderId);
    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    // Validate total matches order total
    const totalPaid = dto.payments.reduce(
      (sum, p) => sum.plus(new Decimal(p.amount)),
      new Decimal(0)
    );

    const orderTotal = new Decimal(order.grandTotal);
    
    if (!totalPaid.equals(orderTotal)) {
      throw new BadRequestException(
        `Payment total ${totalPaid} does not match order total ${orderTotal}`
      );
    }

    // Create payment records
    const payments: Payment[] = [];
    
    for (const paymentDto of dto.payments) {
      const payment = await this.createPayment({
        orderId: dto.orderId,
        method: paymentDto.method,
        amount: paymentDto.amount,
        receivedAmount: paymentDto.receivedAmount,
        cardLast4: paymentDto.cardLast4,
        transactionId: paymentDto.transactionId,
        createdBy: dto.userId
      });
      
      payments.push(payment);
    }

    // Update order paid amount
    await this.orderRepo.update(dto.orderId, {
      paidAmount: totalPaid.toNumber(),
      status: 'PAID'
    });

    // Publish event
    await this.eventBus.publish('PaymentCompleted',
      new PaymentCompletedEvent(dto.orderId, totalPaid, payments.length)
    );

    return payments;
  }

  async createPayment(dto: CreatePaymentDto): Promise<Payment> {
    const amount = new Decimal(dto.amount);
    let changeAmount = new Decimal(0);

    // Calculate change for cash payments
    if (dto.method === 'CASH' && dto.receivedAmount) {
      const received = new Decimal(dto.receivedAmount);
      changeAmount = received.minus(amount);
      
      if (changeAmount.lessThan(0)) {
        throw new BadRequestException('Insufficient cash received');
      }
    }

    const payment = await this.paymentRepo.create({
      orderId: dto.orderId,
      method: dto.method,
      amount: amount.toNumber(),
      receivedAmount: dto.receivedAmount ? new Decimal(dto.receivedAmount).toNumber() : null,
      changeAmount: changeAmount.toNumber(),
      cardLast4: dto.cardLast4,
      transactionId: dto.transactionId || uuidv4(),
      status: 'COMPLETED',
      paidAt: new Date(),
      createdBy: dto.createdBy
    });

    return payment;
  }

  async processRefund(dto: CreateRefundDto): Promise<Refund> {
    const payment = await this.paymentRepo.findById(dto.paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${dto.paymentId} not found`);
    }

    const refundAmount = new Decimal(dto.amount);
    const alreadyRefunded = new Decimal(payment.refundedAmount);
    const paymentAmount = new Decimal(payment.amount);

    // Validate refund amount
    if (alreadyRefunded.plus(refundAmount).greaterThan(paymentAmount)) {
      throw new BadRequestException(
        `Refund amount exceeds payment amount. Max refundable: ${paymentAmount.minus(alreadyRefunded)}`
      );
    }

    // Create refund record
    const refund = await this.refundRepo.create({
      paymentId: dto.paymentId,
      amount: refundAmount.toNumber(),
      reason: dto.reason,
      notes: dto.notes,
      status: 'PENDING',
      createdBy: dto.userId
    });

    // If auto-approve (under threshold), approve immediately
    const autoApproveThreshold = new Decimal(100); // 100 SAR
    if (refundAmount.lessThanOrEqualTo(autoApproveThreshold)) {
      await this.approveRefund(refund.id, dto.userId);
    }

    return refund;
  }

  async approveRefund(refundId: string, userId: string): Promise<Refund> {
    const refund = await this.refundRepo.findById(refundId);
    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    // Update refund status
    const updatedRefund = await this.refundRepo.update(refundId, {
      status: 'APPROVED',
      approvedBy: userId,
      approvedAt: new Date()
    });

    // Process refund with payment gateway
    if (refund.payment.method !== 'CASH') {
      await this.processGatewayRefund(refund);
    }

    // Update payment refunded amount
    const newRefundedAmount = new Decimal(refund.payment.refundedAmount)
      .plus(refund.amount)
      .toNumber();

    await this.paymentRepo.update(refund.paymentId, {
      refundedAmount: newRefundedAmount,
      status: newRefundedAmount >= refund.payment.amount ? 'REFUNDED' : 'COMPLETED'
    });

    // Publish event
    await this.eventBus.publish('RefundProcessed',
      new RefundProcessedEvent(refund.id, refund.paymentId, new Decimal(refund.amount))
    );

    return updatedRefund;
  }

  private async processGatewayRefund(refund: Refund): Promise<void> {
    // Integration with payment gateway
    // Implementation depends on provider (Stripe, PayFort, etc.)
  }
}
```

---

## **CONTROLLER**

```typescript
// payments.controller.ts
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('split')
  async processSplitPayment(@Body() dto: SplitPaymentDto) {
    return this.paymentsService.processSplitPayment(dto);
  }

  @Post()
  async createPayment(@Body() dto: CreatePaymentDto) {
    return this.paymentsService.createPayment(dto);
  }

  @Post('refunds')
  async createRefund(@Body() dto: CreateRefundDto) {
    return this.paymentsService.processRefund(dto);
  }

  @Put('refunds/:id/approve')
  @UseGuards(ManagerGuard) // Requires manager approval
  async approveRefund(@Param('id') id: string, @Request() req) {
    return this.paymentsService.approveRefund(id, req.user.id);
  }

  @Get('order/:orderId')
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.findByOrder(orderId);
  }
}
```

---

## **DTOs**

```typescript
// dto/split-payment.dto.ts
export class PaymentItemDto {
  @IsString()
  method: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsNumber()
  receivedAmount?: number;

  @IsOptional()
  @IsString()
  cardLast4?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;
}

export class SplitPaymentDto {
  @IsUUID()
  orderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentItemDto)
  payments: PaymentItemDto[];

  @IsString()
  userId: string;
}

// dto/create-refund.dto.ts
export class CreateRefundDto {
  @IsUUID()
  paymentId: string;

  @IsNumber()
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsString()
  userId: string;
}
```

---

## **KEY FEATURES**

1. **Split Payments** - Multiple methods for one order
2. **Decimal.js** - Precise money calculations
3. **Change Calculation** - Automatic for cash
4. **Refund Management** - Full/partial with approval
5. **Auto-approve** - Small refunds (< 100 SAR)
6. **Gateway Integration** - Ready for Stripe/PayFort
7. **Event-Driven** - PaymentCompleted, RefundProcessed

---

## **NEXT**

- [07-MODULE-SESSIONS.md](07-MODULE-SESSIONS.md) - Register session management
