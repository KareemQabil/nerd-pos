# Integration Workflow: Dine-In Order

**Flow**: Complete dine-in restaurant order  
**Time**: 3-5 minutes per order  
**Modules**: Products, Sales, Payments, Kitchen, Sessions  

---

## **FLOW OVERVIEW**

```
1. Open Table → 2. Select Products → 3. Modify Order → 
4. Route to Kitchen → 5. Payment → 6. Close Table
```

---

## **STEP 1: Open Table**

### **Backend**
```typescript
// POST /api/tables/:id/open
const table = await tablesService.openTable(tableId, {
  serverId: currentUser.id,
  guestCount: 4
});

// Response
{
  id: "table-123",
  number: "T05",
  status: "OCCUPIED",
  serverId: "user-456",
  guestCount: 4,
  openedAt: "2024-01-15T19:30:00Z"
}
```

### **Frontend**
```tsx
// components/tables/TableButton.tsx
const { mutate: openTable } = useOpenTable();

const handleOpenTable = () => {
  openTable({
    tableId: table.id,
    serverId: currentUser.id,
    guestCount: guestCountDialog.value
  });
  
  // Navigate to order screen
  router.push(`/pos/dine-in?table=${table.id}`);
};
```

---

## **STEP 2: Create Order**

### **Backend**
```typescript
// POST /api/orders
const order = await ordersService.create({
  type: 'DINE_IN',
  tableId: 'table-123',
  items: [],
  sessionId: currentSession.id
});

// Response
{
  id: "order-789",
  orderNumber: "ORD202401150042",
  type: "DINE_IN",
  tableId: "table-123",
  status: "DRAFT",
  items: [],
  subtotal: 0,
  totalTax: 0,
  grandTotal: 0
}
```

### **Frontend**
```tsx
// Store order in Zustand
const orderStore = useOrderStore();

useEffect(() => {
  if (tableId && !orderStore.currentOrder) {
    createOrder({
      type: 'DINE_IN',
      tableId,
      sessionId: currentSession.id
    }).then(order => {
      orderStore.setCurrentOrder(order);
    });
  }
}, [tableId]);
```

---

## **STEP 3: Add Items**

### **Backend**
```typescript
// POST /api/orders/:id/items
const updatedOrder = await ordersService.addItem(orderId, {
  productId: 'prod-111',
  quantity: 2,
  modifiers: [
    { id: 'mod-222', name: 'Extra Cheese', price: 5 }
  ],
  notes: 'No onions'
});

// 7-step calculation pipeline runs
1. Calculate base: 50.00 × 2 = 100.00
2. Add modifiers: 100.00 + (5.00 × 2) = 110.00
3. Item discounts: 0
4. Item subtotal: 110.00
5. Calculate tax: 110.00 × 15% = 16.50
6. Order discounts: 0
7. Grand total: 126.50
```

### **Frontend**
```tsx
// components/pos/ProductGrid.tsx
const { mutate: addItem } = useAddOrderItem();

const handleSelectProduct = (product: Product) => {
  // Check if product has modifiers
  if (product.modifiers && product.modifiers.length > 0) {
    setModifierModal({
      open: true,
      product
    });
  } else {
    // Add directly
    addItem({
      orderId: currentOrder.id,
      productId: product.id,
      quantity: 1
    });
  }
};

// After adding
const cart = useCartStore();
cart.addItem({
  productId: product.id,
  name: product.name,
  price: product.price,
  quantity: 1
});
```

---

## **STEP 4: Route to Kitchen**

### **Backend**
```typescript
// Triggered automatically when order submitted
await kitchenService.routeOrder(orderId);

// Creates tickets by station:
{
  grillStation: {
    ticketNumber: "KT20240115001",
    items: [
      { productId: "burger", quantity: 2, notes: "Medium rare" }
    ]
  },
  drinksStation: {
    ticketNumber: "KT20240115002",
    items: [
      { productId: "cola", quantity: 2 }
    ]
  }
}

// WebSocket emits to KDS screens
websocket.emit('station:grill', 'newTicket', grillTicket);
websocket.emit('station:drinks', 'newTicket', drinksTicket);
```

### **Frontend (KDS)**
```tsx
// app/kitchen/page.tsx
const socket = useWebSocket('/kitchen');

socket.on('newTicket', (ticket) => {
  // Play notification sound
  playSound('/sounds/new-order.mp3');
  
  // Add to ticket list
  setTickets(prev => [ticket, ...prev]);
  
  // Flash screen
  flashScreen();
});
```

---

## **STEP 5: Payment**

### **Backend**
```typescript
// POST /api/orders/:id/submit
const submittedOrder = await ordersService.submit(orderId);
// Status: DRAFT → PENDING

// POST /api/payments
const payment = await paymentsService.create({
  orderId: submittedOrder.id,
  method: 'CASH',
  amount: 200.00, // Customer pays
  sessionId: currentSession.id
});

// Calculate change
const change = new Decimal(payment.amount)
  .minus(submittedOrder.grandTotal);
// Change: 200.00 - 126.50 = 73.50

// Complete order
await ordersService.complete(orderId);
// Status: PENDING → COMPLETED
```

### **Frontend**
```tsx
// components/payment/PaymentModal.tsx
const { mutate: processPayment } = useCreatePayment();

const handlePayment = () => {
  // Submit order first
  submitOrder(currentOrder.id);
  
  // Then process payment
  processPayment({
    orderId: currentOrder.id,
    method: selectedMethod, // 'CASH', 'CARD', etc.
    amount: paymentAmount,
    sessionId: currentSession.id
  }, {
    onSuccess: (payment) => {
      // Show change if cash
      if (payment.method === 'CASH') {
        const change = new Decimal(payment.amount)
          .minus(currentOrder.grandTotal);
        
        showChangeModal(change);
      }
      
      // Print receipt
      printReceipt(currentOrder);
      
      // Clear cart
      cart.clear();
      
      // Navigate back
      router.push('/tables');
    }
  });
};
```

---

## **STEP 6: Close Table**

### **Backend**
```typescript
// PUT /api/tables/:id/close
const closedTable = await tablesService.closeTable(tableId);

// Response
{
  id: "table-123",
  number: "T05",
  status: "AVAILABLE",
  lastOrderId: "order-789",
  closedAt: "2024-01-15T20:15:00Z"
}
```

### **Frontend**
```tsx
// Automatic after payment
useEffect(() => {
  if (paymentComplete && currentOrder.tableId) {
    closeTable(currentOrder.tableId);
  }
}, [paymentComplete]);
```

---

## **EVENTS EMITTED**

```typescript
1. TableOpened(tableId, serverId)
2. OrderCreated(orderId, type: DINE_IN)
3. OrderItemAdded(orderId, itemId)
4. OrderSubmitted(orderId)
5. TicketCreated(ticketId, stationId)
6. PaymentCreated(paymentId, orderId)
7. OrderCompleted(orderId)
8. TableClosed(tableId)
```

---

## **DATABASE CHANGES**

```sql
-- Table status
UPDATE tables 
SET status = 'OCCUPIED', opened_at = NOW()
WHERE id = 'table-123';

-- New order
INSERT INTO orders (id, order_number, type, table_id, status)
VALUES ('order-789', 'ORD202401150042', 'DINE_IN', 'table-123', 'DRAFT');

-- Add items
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES ('order-789', 'prod-111', 2, 50.00);

-- Submit order
UPDATE orders SET status = 'PENDING' WHERE id = 'order-789';

-- Kitchen tickets
INSERT INTO kitchen_tickets (ticket_number, order_id, station_id)
VALUES ('KT20240115001', 'order-789', 'grill');

-- Payment
INSERT INTO payments (order_id, method, amount, status)
VALUES ('order-789', 'CASH', 200.00, 'COMPLETED');

-- Complete order
UPDATE orders SET status = 'COMPLETED', completed_at = NOW()
WHERE id = 'order-789';

-- Close table
UPDATE tables SET status = 'AVAILABLE', closed_at = NOW()
WHERE id = 'table-123';
```

---

## **ERROR HANDLING**

```typescript
// Table already occupied
if (table.status === 'OCCUPIED') {
  throw new BadRequestException('Table is already occupied');
}

// Insufficient payment
const grandTotal = new Decimal(order.grandTotal);
const paymentAmount = new Decimal(dto.amount);

if (paymentAmount.lessThan(grandTotal)) {
  throw new BadRequestException(
    `Insufficient payment. Required: ${grandTotal}, Provided: ${paymentAmount}`
  );
}

// Order already completed
if (order.status === 'COMPLETED') {
  throw new BadRequestException('Order already completed');
}
```

---

## **TIMING**

- Open table: < 1 second
- Add items: < 500ms per item
- Submit + kitchen routing: < 2 seconds
- Payment processing: < 1 second
- **Total: ~1-2 minutes** for typical order

---

## **NEXT FLOWS**

- [03-delivery-order.md](03-delivery-order.md)
- [04-kitchen-preparation.md](04-kitchen-preparation.md)
