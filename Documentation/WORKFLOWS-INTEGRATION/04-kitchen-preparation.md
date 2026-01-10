# Kitchen Preparation Workflow

**Flow**: Order → Kitchen → Cooking → Ready → Served  
**System**: Kitchen Display System (KDS)  
**Priority**: FIFO + Table urgency  

---

## **WORKFLOW STEPS**

### **1. Order Sent to Kitchen**

```typescript
// After payment confirmation
await ordersService.sendToKitchen(orderId);

// Creates kitchen tickets per station
const tickets = await kitchenService.createTickets({
  orderId,
  items: orderItems,
  priority: order.type === 'DINE_IN' ? 'HIGH' : 'NORMAL',
});

// Event emitted
eventBus.emit(new OrderSentToKitchenEvent(orderId, tickets));
```

---

### **2. Kitchen Receives Ticket**

```typescript
// KDS displays ticket
const ticket = {
  ticketNumber: 'T-001',
  orderNumber: 'ORD-2026-000123',
  station: 'GRILL',
  priority: 'HIGH',
  tableNumber: '12',
  items: [
    { product: 'Ribeye Steak', quantity: 2, modifiers: ['Medium-rare'] },
    { product: 'French Fries', quantity: 2 },
  ],
  createdAt: new Date(),
  estimatedTime: 20, // minutes
};

// WebSocket notification to KDS screen
io.to('kitchen-station-grill').emit('new-ticket', ticket);
```

---

### **3. Chef Starts Cooking**

```typescript
// Chef taps "Start" button
await kitchenService.startTicket(ticketId);

// Updates ticket status
await prisma.kitchenTicket.update({
  where: { id: ticketId },
  data: {
    status: 'COOKING',
    startedAt: new Date(),
  },
});

// Timer starts on KDS
```

---

### **4. Item Completion (Bump)**

```typescript
// Chef marks item as ready
await kitchenService.bumpItem(ticketId, itemId);

// Check if all items ready
const ticket = await prisma.kitchenTicket.findUnique({
  where: { id: ticketId },
  include: { items: true },
});

const allReady = ticket.items.every(item => item.status === 'READY');

if (allReady) {
  await kitchenService.completeTicket(ticketId);
  
  // Notify server/expo
  io.to('expo-screen').emit('order-ready', {
    ticketNumber: ticket.ticketNumber,
    tableNumber: ticket.tableNumber,
  });
  
  // Play sound alert
  io.to('expo-screen').emit('play-sound', 'order-ready.mp3');
}
```

---

### **5. Expo/Runner Serves Order**

```typescript
// Expo marks order as served
await ordersService.markServed(orderId);

await prisma.order.update({
  where: { id: orderId },
  data: {
    status: 'SERVED',
    servedAt: new Date(),
  },
});

// Event for table management
eventBus.emit(new OrderServedEvent(orderId, tableId));
```

---

## **KDS SCREEN LAYOUT**

```tsx
// app/kitchen/page.tsx
'use client';

import { useActiveTickets } from '@/hooks/useKitchen';
import { KitchenTicket } from '@/components/organisms/KitchenTicket';

export default function KDSPage() {
  const { data: tickets } = useActiveTickets(stationId);

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-900 min-h-screen">
      {tickets?.map(ticket => (
        <KitchenTicket key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
```

---

## **TICKET CARD**

```tsx
export function KitchenTicket({ ticket }) {
  const { mutate: bumpItem } = useBumpItem();
  const elapsedMinutes = useElapsedTime(ticket.createdAt);

  const isUrgent = elapsedMinutes > ticket.estimatedTime;

  return (
    <div className={`glass-card ${isUrgent ? 'border-red-500' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold">{ticket.ticketNumber}</h2>
        <span className="text-2xl">{elapsedMinutes}m</span>
      </div>

      {ticket.tableNumber && (
        <Badge>Table {ticket.tableNumber}</Badge>
      )}

      <div className="space-y-3 mt-4">
        {ticket.items.map(item => (
          <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded">
            <div>
              <p className="font-bold text-lg">{item.quantity}x {item.product.name}</p>
              {item.modifiers && (
                <p className="text-sm text-gray-600">{item.modifiers.join(', ')}</p>
              )}
            </div>
            <button
              onClick={() => bumpItem(item.id)}
              className={`text-2xl ${item.status === 'READY' ? 'text-green-500' : ''}`}
            >
              {item.status === 'READY' ? '✓' : '○'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## **PRIORITY RULES**

1. **URGENT** (>20 min): Red border, top of queue
2. **DINE_IN**: Higher priority than takeaway
3. **VIP customers**: Flagged with star icon
4. **Modifiers**: "No onions", "Extra spicy" highlighted

---

**NEXT**: [05-session-management.md](05-session-management.md)
