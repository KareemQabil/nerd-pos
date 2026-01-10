# Integration Workflow: Delivery Order

**Flow**: Complete delivery order with driver assignment  
**Time**: 5-8 minutes per order  
**Modules**: Products, Sales, Payments, Customers, Delivery  

---

## **FLOW OVERVIEW**

```
1. Customer Selection → 2. Address Selection → 3. Add Products → 
4. Set Delivery Time → 5. Calculate Fees → 6. Payment → 7. Assign Driver
```

---

## **STEP 1: Customer Selection**

### **Backend**
```typescript
// GET /api/customers/phone/:phone
const customer = await customersService.findByPhone('0501234567');

// If not exists, create
if (!customer) {
  customer = await customersService.create({
    name: 'John Doe',
    phone: '0501234567',
    preferredLanguage: 'en'
  });
}
```

### **Frontend**
```tsx
// components/delivery/CustomerSearch.tsx
const [phone, setPhone] = useState('');
const { data: customer, refetch } = useCustomer(phone);

const handleSearch = () => {
  if (phone.length >= 10) {
    refetch();
  }
};

// If not found, show create modal
if (!customer && phone.length === 10) {
  setShowCreateCustomer(true);
}
```

---

## **STEP 2: Address Selection**

### **Backend**
```typescript
// GET /api/customers/:id/addresses
const addresses = await customersService.getAddresses(customerId);

// Response
[
  {
    id: "addr-123",
    label: "Home",
    street: "King Fahd Road",
    building: "Tower 5",
    floor: "12",
    apartment: "1205",
    city: "Riyadh",
    district: "Al Olaya",
    instructions: "Call when you arrive",
    latitude: 24.7136,
    longitude: 46.6753,
    isDefault: true
  }
]
```

### **Frontend**
```tsx
// Show address list or map picker
const { data: addresses } = useCustomerAddresses(customer.id);

// Calculate delivery zone & fee
const selectedAddress = addresses.find(a => a.id === selectedAddressId);
const zone = calculateZone(selectedAddress.latitude, selectedAddress.longitude);
const deliveryFee = zone.fee; // Based on distance
```

---

## **STEP 3: Create Order**

### **Backend**
```typescript
// POST /api/orders
const order = await ordersService.create({
  type: 'DELIVERY',
  customerId: customer.id,
  addressId: selectedAddress.id,
  items: [],
  sessionId: currentSession.id,
  deliveryTargetTime: targetTime,
  deliveryFee: deliveryFee
});

// Response
{
  id: "order-456",
  orderNumber: "ORD202401150043",
  type: "DELIVERY",
  customerId: "customer-789",
  addressId: "addr-123",
  status: "DRAFT",
  deliveryTargetTime: "2024-01-15T20:00:00Z",
  deliveryFee: 15.00,
  subtotal: 0,
  grandTotal: 0
}
```

---

## **STEP 4: Add Items & Calculate**

### **Backend**
```typescript
// Add items same as dine-in
await ordersService.addItem(orderId, {
  productId: 'prod-111',
  quantity: 2
});

// 7-step calculation
const calculation = await calculationService.calculateOrder({
  items: order.items,
  deliveryFee: order.deliveryFee // Added to grand total
});

// Update order
await ordersService.update(orderId, {
  subtotal: calculation.subtotal,
  totalTax: calculation.totalTax,
  grandTotal: calculation.grandTotal // Includes delivery fee
});
```

---

## **STEP 5: Delivery Time & Zone**

### **Backend**
```typescript
// Calculate estimated delivery time
function calculateDeliveryTime(
  distanceKm: number,
  currentOrders: number
): Date {
  // Base prep time: 20 minutes
  const prepTime = 20;
  
  // Drive time: 5 min per km
  const driveTime = distanceKm * 5;
  
  // Queue time: 10 min per order
  const queueTime = currentOrders * 10;
  
  const totalMinutes = prepTime + driveTime + queueTime;
  
  return addMinutes(new Date(), totalMinutes);
}

// Calculate delivery fee by zone
function calculateDeliveryFee(distanceKm: number): Decimal {
  if (distanceKm <= 5) {
    return new Decimal(10); // 10 SAR within 5km
  } else if (distanceKm <= 10) {
    return new Decimal(15); // 15 SAR within 10km
  } else {
    return new Decimal(20); // 20 SAR beyond 10km
  }
}
```

---

## **STEP 6: Payment**

### **Backend**
```typescript
// Submit order
await ordersService.submit(orderId);
// Status: DRAFT → PENDING

// Create payment
const payment = await paymentsService.create({
  orderId,
  method: 'CARD', // Pre-paid delivery
  amount: order.grandTotal,
  sessionId: currentSession.id
});

// Complete order
await ordersService.complete(orderId);
// Status: PENDING → COMPLETED
```

---

## **STEP 7: Assign Driver**

### **Backend**
```typescript
// Find available driver
const driver = await driversService.findAvailable({
  currentLocation: storeLocation,
  maxDistanceKm: 5
});

if (!driver) {
  // Add to driver queue
  await deliveryQueue.add({
    orderId,
    priority: order.deliveryTargetTime
  });
} else {
  // Assign driver
  await deliveryService.assignDriver({
    orderId,
    driverId: driver.id
  });

  // Emit event
  await eventBus.publish('DriverAssigned', {
    orderId,
    driverId: driver.id
  });
}
```

### **Driver App Integration**
```typescript
// WebSocket notification to driver
websocket.emit(`driver:${driver.id}`, 'newOrder', {
  orderId,
  orderNumber: order.orderNumber,
  customerName: customer.name,
  customerPhone: customer.phone,
  address: selectedAddress,
  items: order.items,
  deliveryFee: order.deliveryFee,
  targetTime: order.deliveryTargetTime,
  distance: calculateDistance(storeLocation, addressLocation)
});

// Driver accepts
await deliveryService.acceptOrder(orderId, driverId);
// Status: PENDING_DRIVER → ACCEPTED

// Driver picks up
await deliveryService.pickupOrder(orderId);
// Status: ACCEPTED → IN_TRANSIT

// Driver delivers
await deliveryService.deliverOrder(orderId);
// Status: IN_TRANSIT → DELIVERED
```

---

## **FRONTEND: Delivery Screen**

```tsx
// app/delivery/page.tsx
export default function DeliveryPage() {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const cart = useCartStore();
  const { mutate: createOrder } = useCreateOrder();
  const { mutate: assignDriver } = useAssignDriver();

  const handleComplete = async () => {
    // 1. Create order
    const newOrder = await createOrder({
      type: 'DELIVERY',
      customerId: customer.id,
      addressId: address.id,
      items: cart.items,
      deliveryFee: calculateDeliveryFee(address)
    });

    // 2. Process payment
    await processPayment(newOrder.id);

    // 3. Assign driver
    await assignDriver(newOrder.id);

    // 4. Show success
    toast.success('Order placed! Driver will be assigned shortly.');

    // 5. Clear cart
    cart.clear();

    // 6. Navigate to orders
    router.push('/orders');
  };

  return (
    <div className="container mx-auto p-4">
      {/* Step indicator */}
      <StepIndicator currentStep={step} />

      {/* Step 1: Customer */}
      {step === 1 && (
        <CustomerSearch
          onSelect={(c) => {
            setCustomer(c);
            setStep(2);
          }}
        />
      )}

      {/* Step 2: Address */}
      {step === 2 && (
        <AddressSelection
          customerId={customer.id}
          onSelect={(a) => {
            setAddress(a);
            setStep(3);
          }}
        />
      )}

      {/* Step 3: Products */}
      {step === 3 && (
        <ProductGrid onSelectProduct={(p) => cart.addItem(p)} />
      )}

      {/* Cart & Complete */}
      <DeliveryCart
        items={cart.items}
        address={address}
        onComplete={handleComplete}
      />
    </div>
  );
}
```

---

## **EVENTS EMITTED**

```typescript
1. CustomerCreated(customerId, name)
2. OrderCreated(orderId, type: DELIVERY)
3. OrderItemAdded(orderId, itemId)
4. OrderSubmitted(orderId)
5. PaymentCreated(paymentId, orderId)
6. OrderCompleted(orderId)
7. DriverAssigned(orderId, driverId)
8. OrderPickedUp(orderId, driverId)
9. OrderDelivered(orderId, driverId)
```

---

## **DATABASE CHANGES**

```sql
-- Create customer
INSERT INTO customers (id, name, phone, code)
VALUES ('customer-789', 'John Doe', '0501234567', 'CUS202401000123');

-- Create address
INSERT INTO customer_addresses (id, customer_id, street, city, latitude, longitude)
VALUES ('addr-123', 'customer-789', 'King Fahd Road', 'Riyadh', 24.7136, 46.6753);

-- Create order
INSERT INTO orders (id, order_number, type, customer_id, address_id, delivery_fee, delivery_target_time)
VALUES ('order-456', 'ORD202401150043', 'DELIVERY', 'customer-789', 'addr-123', 15.00, '2024-01-15 20:00:00');

-- Assign driver
UPDATE orders SET driver_id = 'driver-999', status = 'ACCEPTED'
WHERE id = 'order-456';

-- Track delivery
INSERT INTO delivery_tracking (order_id, status, timestamp, latitude, longitude)
VALUES ('order-456', 'IN_TRANSIT', NOW(), 24.7136, 46.6753);
```

---

## **DRIVER TRACKING**

```typescript
// Real-time location updates
setInterval(async () => {
  const location = await getCurrentLocation();
  
  await deliveryService.updateDriverLocation({
    orderId,
    driverId,
    latitude: location.latitude,
    longitude: location.longitude
  });
  
  // Emit to customer app
  websocket.emit(`customer:${customerId}`, 'driverLocation', {
    latitude: location.latitude,
    longitude: location.longitude,
    distance: calculateDistance(location, customerAddress)
  });
}, 10000); // Every 10 seconds
```

---

## **ERROR HANDLING**

```typescript
// No driver available
if (!driver) {
  // Notify customer
  await notificationService.send({
    customerId,
    type: 'SMS',
    message: 'Your order is being prepared. Driver will be assigned soon.'
  });
  
  // Add to queue with priority
  await deliveryQueue.add({
    orderId,
    priority: order.deliveryTargetTime,
    maxWaitMinutes: 15
  });
}

// Driver cancels
if (driverCancels) {
  // Find another driver
  const newDriver = await driversService.findAvailable();
  
  if (newDriver) {
    await deliveryService.reassignDriver(orderId, newDriver.id);
  } else {
    // Refund customer
    await paymentsService.refund(order.paymentId, 'Driver unavailable');
    await ordersService.cancel(orderId);
  }
}
```

---

## **TIMING**

- Customer search: < 1 second
- Address selection: < 2 seconds
- Add items: < 500ms per item
- Payment: < 2 seconds
- Driver assignment: < 5 seconds
- **Total: ~2-3 minutes** for typical order

---

**NEXT**: [04-kitchen-preparation.md](04-kitchen-preparation.md)
