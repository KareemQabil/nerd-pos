# Integration Workflow: Quick Sale (TAKEAWAY)

**Flow**: Product Selection → Calculate → Payment → Complete  
**Time**: 2-3 minutes per transaction  
**Modules**: Products, Sales, Payments, Inventory, Compliance

---

## **OVERVIEW**

Simplest sales flow for takeaway orders:
1. Select products
2. System calculates totals (7-step pipeline)
3. Accept payment
4. Generate invoice (ZATCA compliant)
5. Deduct inventory (FIFO)
6. Print receipt

---

## **FLOW DIAGRAM**

```
┌─────────────┐
│   Products  │ ← Select items
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Sales    │ ← Calculate (7 steps), Create order
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Payments   │ ← Process payment
└──────┬──────┘
       │
       ├─→ Inventory  (Deduct stock via OrderCreated event)
       ├─→ Compliance (Generate ZATCA invoice)
       └─→ Audit      (Log transaction)
```

---

## **STEP-BY-STEP IMPLEMENTATION**

### **STEP 1: Frontend - Product Selection**

```typescript
// Frontend: app/pos/quick-sale/page.tsx
'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';

export default function QuickSalePage() {
  const { products } = useProducts({ isActive: true });
  const { items, addItem, removeItem, clear, total } = useCart();

  const handleAddProduct = (product: Product) => {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1
    });
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Products grid */}
      <div className="col-span-2 grid grid-cols-4 gap-2">
        {products.map(product => (
          <button
            key={product.id}
            onClick={() => handleAddProduct(product)}
            className="p-4 bg-white rounded-lg shadow"
          >
            <div className="text-lg font-bold">{product.name}</div>
            <div className="text-sm text-gray-500">{product.price} SAR</div>
          </button>
        ))}
      </div>

      {/* Cart sidebar */}
      <div className="bg-white p-4 rounded-lg">
        <h2>Cart</h2>
        {items.map(item => (
          <div key={item.productId}>
            <span>{item.name} x{item.quantity}</span>
            <span>{item.price * item.quantity} SAR</span>
          </div>
        ))}
        <div className="font-bold mt-4">Total: {total} SAR</div>
        <button onClick={() => handleCheckout()}>
          Checkout
        </button>
      </div>
    </div>
  );
}
```

---

### **STEP 2: Backend - Create Order with Calculation**

```typescript
// Backend: POST /api/orders
// sales/sales.controller.ts

@Post()
async createOrder(@Body() dto: CreateOrderDto) {
  return this.salesService.createOrder(dto);
}

// sales/sales.service.ts
async createOrder(dto: CreateOrderDto): Promise<Order> {
  // 1. Build calculation context
  const context = new CalculationContext();
  context.items = dto.items.map(item => ({
    productId: item.productId,
    name: item.name,
    price: new Decimal(item.price),
    quantity: item.quantity
  }));
  context.orderType = 'TAKEAWAY';

  // 2. Execute 7-step calculation pipeline
  const calculated = await this.calculationPipeline.execute(context);

  // 3. Create order
  const order = await this.orderRepo.create({
    orderNumber: await this.generateOrderNumber(),
    type: 'TAKEAWAY',
    status: 'CONFIRMED',
    items: dto.items,
    itemSubtotal: calculated.itemSubtotal.toNumber(),
    serviceCharge: calculated.serviceCharge.toNumber(),
    deliveryCharge: calculated.deliveryCharge.toNumber(),
    subtotalBeforeTax: calculated.subtotalBeforeTax.toNumber(),
    taxAmount: calculated.taxAmount.toNumber(),
    taxPercent: calculated.taxPercent.toNumber(),
    discountAmount: calculated.discountAmount.toNumber(),
    grandTotal: calculated.grandTotal.toNumber(),
    createdBy: dto.userId
  });

  // 4. Publish OrderCreated event
  await this.eventBus.publish('OrderCreated', 
    new OrderCreatedEvent(
      order.id,
      order.items,
      null,  // No customer for quick sale
      new Decimal(order.grandTotal)
    )
  );

  return order;
}
```

---

### **STEP 3: Backend - Event Handlers (Automatic)**

**Inventory Handler** (Deduct stock via FIFO):

```typescript
// inventory/handlers/order-created.handler.ts
@Injectable()
@EventHandler('OrderCreated')
export class InventoryDeductionHandler {
  constructor(private inventoryService: InventoryService) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    for (const item of event.items) {
      // FIFO deduction from oldest batches
      await this.inventoryService.deductStock(
        item.productId,
        'main',  // Main warehouse
        item.quantity,
        'ORDER',
        event.orderId
      );
    }
  }
}
```

**Compliance Handler** (Generate ZATCA invoice):

```typescript
// compliance/handlers/order-created.handler.ts
@Injectable()
@EventHandler('OrderCreated')
export class ComplianceInvoiceHandler {
  constructor(private zatcaService: ZATCAService) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    // Generate ZATCA-compliant simplified invoice
    const invoice = await this.zatcaService.generateSimplifiedInvoice({
      orderId: event.orderId,
      items: event.items,
      total: event.total
    });

    // Calculate hash chain
    const previousHash = await this.zatcaService.getLastHash();
    const currentHash = SHA256(previousHash + invoice.xml);

    // Store invoice with hash
    await this.zatcaService.storeInvoice({
      orderId: event.orderId,
      xml: invoice.xml,
      hash: currentHash,
      previousHash,
      qrCode: invoice.qrCode
    });
  }
}
```

**Audit Handler** (Log transaction):

```typescript
// audit/handlers/order-created.handler.ts
@Injectable()
@EventHandler('OrderCreated')
export class AuditLogHandler {
  constructor(private auditService: AuditService) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    await this.auditService.log({
      action: 'ORDER_CREATED',
      entityType: 'ORDER',
      entityId: event.orderId,
      userId: event.userId,
      metadata: {
        total: event.total.toFixed(2),
        itemCount: event.items.length
      }
    });
  }
}
```

---

### **STEP 4: Frontend - Payment Processing**

```typescript
// Frontend: app/pos/payment/page.tsx
'use client';

import { useState } from 'react';
import { usePayment } from '@/hooks/usePayment';

export default function PaymentPage({ orderId, total }) {
  const { processPayment, isProcessing } = usePayment();
  const [method, setMethod] = useState('CASH');

  const handlePay = async () => {
    const payment = await processPayment({
      orderId,
      method,
      amount: total,
      receivedAmount: method === 'CASH' ? cashReceived : total
    });

    if (payment.success) {
      // Navigate to receipt
      router.push(`/pos/receipt/${orderId}`);
    }
  };

  return (
    <div className="payment-screen">
      <h1>Payment: {total} SAR</h1>
      
      <div className="payment-methods">
        <button onClick={() => setMethod('CASH')}>Cash</button>
        <button onClick={() => setMethod('CARD')}>Card</button>
        <button onClick={() => setMethod('MADA')}>Mada</button>
      </div>

      {method === 'CASH' && (
        <div>
          <input 
            type="number" 
            value={cashReceived}
            onChange={(e) => setCashReceived(e.target.value)}
            placeholder="Cash received"
          />
          <div>Change: {cashReceived - total} SAR</div>
        </div>
      )}

      <button onClick={handlePay} disabled={isProcessing}>
        Complete Payment
      </button>
    </div>
  );
}
```

---

### **STEP 5: Backend - Process Payment**

```typescript
// payments/payments.service.ts
async processPayment(dto: ProcessPaymentDto): Promise<Payment> {
  const payment = await this.paymentRepo.create({
    orderId: dto.orderId,
    method: dto.method,
    amount: new Decimal(dto.amount).toNumber(),
    receivedAmount: new Decimal(dto.receivedAmount).toNumber(),
    changeAmount: new Decimal(dto.receivedAmount)
      .minus(dto.amount)
      .toNumber(),
    status: 'COMPLETED',
    transactionId: uuidv4()
  });

  // Update order paid amount
  await this.orderRepo.update(dto.orderId, {
    paidAmount: payment.amount,
    changeAmount: payment.changeAmount
  });

  // Publish event
  await this.eventBus.publish('PaymentCompleted',
    new PaymentCompletedEvent(payment.id, dto.orderId, new Decimal(payment.amount))
  );

  return payment;
}
```

---

### **STEP 6: Backend - Complete Order**

```typescript
// sales/handlers/payment-completed.handler.ts
@Injectable()
@EventHandler('PaymentCompleted')
export class OrderCompletionHandler {
  constructor(private salesService: SalesService) {}

  async handle(event: PaymentCompletedEvent): Promise<void> {
    await this.salesService.completeOrder(event.orderId);
  }
}

// sales/sales.service.ts
async completeOrder(orderId: string): Promise<Order> {
  const order = await this.orderRepo.update(orderId, {
    status: 'COMPLETED',
    completedAt: new Date()
  });

  await this.eventBus.publish('OrderCompleted',
    new OrderCompletedEvent(order.id, new Decimal(order.grandTotal))
  );

  return order;
}
```

---

## **DATA FLOW SUMMARY**

```
1. Frontend POST /api/orders
   ├─ Body: { items: [...], type: 'TAKEAWAY', userId: '...' }
   └─ Response: { id, orderNumber, grandTotal, ... }

2. Backend creates order (7-step calculation)
   └─ Publishes OrderCreated event

3. Event handlers execute (parallel):
   ├─ InventoryDeductionHandler: Deducts stock (FIFO)
   ├─ ComplianceInvoiceHandler: Generates ZATCA invoice
   └─ AuditLogHandler: Logs transaction

4. Frontend POST /api/payments
   ├─ Body: { orderId, method: 'CASH', amount, receivedAmount }
   └─ Response: { id, changeAmount, ... }

5. Backend processes payment
   └─ Publishes PaymentCompleted event

6. OrderCompletionHandler marks order COMPLETED

7. Frontend displays receipt with QR code
```

---

## **TESTING**

```bash
# 1. Select products
POST /api/orders
{
  "type": "TAKEAWAY",
  "items": [
    { "productId": "prod-1", "name": "Coffee", "price": 15, "quantity": 2 },
    { "productId": "prod-2", "name": "Cake", "price": 25, "quantity": 1 }
  ],
  "userId": "user-1"
}

# Response: 
# grandTotal = 15*2 + 25 = 55
# tax = 55 * 0.15 = 8.25
# total = 63.25 SAR

# 2. Process payment
POST /api/payments
{
  "orderId": "ord-123",
  "method": "CASH",
  "amount": 63.25,
  "receivedAmount": 100
}

# Response:
# changeAmount = 36.75 SAR

# 3. Verify inventory deducted
GET /api/inventory/stock/prod-1
# currentStock should be reduced by 2

# 4. Verify invoice generated
GET /api/compliance/invoices/order/ord-123
# Should return ZATCA XML with QR code
```

---

## **KEY POINTS**

✅ **Decimal.js** used throughout calculations  
✅ **7-step pipeline** calculates totals  
✅ **Event-driven** - Inventory/Compliance auto-triggered  
✅ **FIFO** - Oldest stock deducted first  
✅ **ZATCA** - Hash chain maintained  
✅ **Offline-ready** - APPEND_ONLY sync strategy

---

## **NEXT WORKFLOWS**

- [02-dine-in-order.md](02-dine-in-order.md) - With table management
- [03-delivery-order.md](03-delivery-order.md) - With zones and drivers
- [09-pos-screen.md](09-pos-screen.md) - ⚠️ **FINAL** integration (build LAST)
