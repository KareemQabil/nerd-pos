# Integration Workflow: Complete POS Screen

**⚠️ BUILD THIS LAST** - After ALL 8 core modules are complete  
**Complexity**: Very High  
**Time**: 2-3 weeks  
**Combines**: Products, Inventory, Sales, Payments, Sessions, Kitchen, Customers, Settings

---

## **PREREQUISITES (MUST BE COMPLETE)**

This workflow CANNOT be built until these are 100% done:

✅ **Products Module** - Categories, products, modifiers  
✅ **Inventory Module** - Warehouses, FIFO, stock tracking  
✅ **Sales Module** - Orders, 7-step calculation pipeline  
✅ **Payments Module** - Cash, card, split payments, refunds  
✅ **Sessions Module** - Open/close, blind close, denomination count  
✅ **Kitchen Module** - KDS integration, ticket routing  
✅ **Customers Module** - Customer lookup, loyalty points  
✅ **Settings Module** - Store settings, tax config, POS config

**If ANY module above is incomplete, STOP. Do not proceed.**

---

## **OVERVIEW**

The POS screen is the **FINAL INTEGRATION** that combines ALL workflows:
- Product selection with modifiers
- Real-time inventory checking
- Order creation with 7-step calculation
- Split payments across methods
- Kitchen ticket routing
- Customer loyalty integration
- Session management
- Offline-first synchronization
- ZATCA compliance
- Receipt printing

---

## **ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────┐
│                    POS SCREEN (UI)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Categories  │  │     Cart     │  │   Payment    │ │
│  │  & Products  │  │   Manager    │  │    Panel     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────┬──────────────┬──────────────┬──────────┘
                │              │              │
        ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
        │   Products   │ │  Sales   │ │  Payments   │
        └───────┬──────┘ └────┬─────┘ └──────┬──────┘
                │              │              │
        ┌───────▼──────────────▼──────────────▼──────┐
        │            EVENT BUS (Orchestration)        │
        └───┬────────┬─────────┬─────────┬────────┬──┘
            │        │         │         │        │
    ┌───────▼───┐ ┌─▼──────┐ ┌▼────────┐ ┌▼──────▼─┐
    │ Inventory │ │ Kitchen│ │Customers│ │Sessions │
    └───────────┘ └────────┘ └─────────┘ └─────────┘
                      │                       │
                ┌─────▼──────┐          ┌────▼────┐
                │ Compliance │          │  Audit  │
                └────────────┘          └─────────┘
```

---

## **FRONTEND STRUCTURE**

```typescript
// app/pos/page.tsx - Main POS Screen
'use client';

import { POSLayout } from '@/components/pos/POSLayout';
import { CategoryGrid } from '@/components/pos/CategoryGrid';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { CartManager } from '@/components/pos/CartManager';
import { PaymentPanel } from '@/components/pos/PaymentPanel';
import { SessionManager } from '@/components/pos/SessionManager';

export default function POSScreen() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [session, setSession] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [paymentMode, setPaymentMode] = useState(false);

  // ✅ Products Module Integration
  const { categories } = useCategories();
  const { products } = useProducts({ categoryId: selectedCategory });

  // ✅ Sales Module Integration
  const { createOrder, calculateTotals } = useSales();

  // ✅ Payments Module Integration
  const { processPayment, splitPayment } = usePayments();

  // ✅ Sessions Module Integration
  const { openSession, closeSession, currentSession } = useSessions();

  // ✅ Customers Module Integration
  const { searchCustomers, applyLoyalty } = useCustomers();

  // ✅ Inventory Module Integration (real-time stock)
  const { checkStock } = useInventory();

  // ✅ Settings Module Integration
  const { settings } = useSettings();

  return (
    <POSLayout session={currentSession}>
      {/* Left: Categories & Products */}
      <div className="col-span-2">
        <CategoryGrid 
          categories={categories}
          onSelect={setSelectedCategory}
        />
        <ProductGrid 
          products={products}
          onAddToCart={handleAddToCart}
          checkStock={checkStock}  // Real-time inventory
        />
      </div>

      {/* Right: Cart & Payment */}
      <div className="col-span-1">
        {!paymentMode ? (
          <CartManager 
            items={cart}
            customer={customer}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
            onCheckout={() => setPaymentMode(true)}
            calculateTotals={calculateTotals}  // 7-step pipeline
          />
        ) : (
          <PaymentPanel
            order={order}
            onPaymentComplete={handlePaymentComplete}
            onCancel={() => setPaymentMode(false)}
            splitPayment={splitPayment}
          />
        )}
      </div>
    </POSLayout>
  );
}
```

---

## **STEP 1: Product Selection with Modifiers**

```typescript
// components/pos/ProductGrid.tsx
export function ProductGrid({ products, onAddToCart, checkStock }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modifiers, setModifiers] = useState([]);
  const [showModifierModal, setShowModifierModal] = useState(false);

  const handleProductClick = async (product) => {
    // ✅ Check stock in real-time (Inventory Module)
    const stock = await checkStock(product.id);
    if (stock <= 0) {
      toast.error('Out of stock');
      return;
    }

    // If product has modifiers, show modal
    if (product.modifiers && product.modifiers.length > 0) {
      setSelectedProduct(product);
      setShowModifierModal(true);
    } else {
      onAddToCart({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        modifiers: []
      });
    }
  };

  const handleModifierConfirm = () => {
    // Calculate price with modifiers
    const modifierTotal = modifiers.reduce((sum, mod) => 
      sum + mod.price, 0
    );

    onAddToCart({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price + modifierTotal,
      quantity: 1,
      modifiers
    });

    setShowModifierModal(false);
  };

  return (
    <>
      <div className="grid grid-cols-4 gap-2">
        {products.map(product => (
          <button
            key={product.id}
            onClick={() => handleProductClick(product)}
            className="product-card"
          >
            <div className="name">{product.name}</div>
            <div className="price">{product.price} SAR</div>
            {product.currentStock <= 5 && (
              <div className="badge-warning">Low Stock</div>
            )}
          </button>
        ))}
      </div>

      {/* Modifier Modal */}
      {showModifierModal && (
        <ModifierModal
          product={selectedProduct}
          selectedModifiers={modifiers}
          onModifierChange={setModifiers}
          onConfirm={handleModifierConfirm}
          onCancel={() => setShowModifierModal(false)}
        />
      )}
    </>
  );
}
```

---

## **STEP 2: Cart with 7-Step Calculation**

```typescript
// components/pos/CartManager.tsx
export function CartManager({ items, customer, onCheckout, calculateTotals }) {
  const [totals, setTotals] = useState(null);
  const [discountCode, setDiscountCode] = useState('');

  useEffect(() => {
    // ✅ Calculate using Sales Module's 7-step pipeline
    const calculate = async () => {
      const result = await calculateTotals({
        items,
        orderType: 'TAKEAWAY',
        customerId: customer?.id,
        discountCode
      });
      setTotals(result);
    };

    if (items.length > 0) {
      calculate();
    }
  }, [items, customer, discountCode]);

  return (
    <div className="cart-container">
      <h2>Cart</h2>

      {/* Customer Selection */}
      <CustomerSelector 
        selected={customer}
        onChange={setCustomer}
      />

      {/* Items */}
      <div className="cart-items">
        {items.map((item, idx) => (
          <CartItem
            key={idx}
            item={item}
            onQuantityChange={(qty) => onUpdateItem(idx, { quantity: qty })}
            onRemove={() => onRemoveItem(idx)}
          />
        ))}
      </div>

      {/* Discount */}
      <input
        type="text"
        placeholder="Discount code"
        value={discountCode}
        onChange={(e) => setDiscountCode(e.target.value)}
      />

      {/* Totals (from 7-step calculation) */}
      {totals && (
        <div className="totals">
          <div>Subtotal: {totals.itemSubtotal} SAR</div>
          {totals.serviceCharge > 0 && (
            <div>Service Charge ({totals.serviceChargePercent}%): {totals.serviceCharge} SAR</div>
          )}
          {totals.deliveryCharge > 0 && (
            <div>Delivery: {totals.deliveryCharge} SAR</div>
          )}
          <div>Subtotal Before Tax: {totals.subtotalBeforeTax} SAR</div>
          <div>Tax ({totals.taxPercent}%): {totals.taxAmount} SAR</div>
          {totals.discountAmount > 0 && (
            <div className="text-green">Discount: -{totals.discountAmount} SAR</div>
          )}
          <div className="grand-total">
            TOTAL: {totals.grandTotal} SAR
          </div>
        </div>
      )}

      <button 
        onClick={onCheckout}
        disabled={items.length === 0}
        className="btn-primary"
      >
        Proceed to Payment
      </button>
    </div>
  );
}
```

---

## **STEP 3: Split Payment Panel**

```typescript
// components/pos/PaymentPanel.tsx
export function PaymentPanel({ order, onPaymentComplete, splitPayment }) {
  const [payments, setPayments] = useState([]);
  const [remaining, setRemaining] = useState(order.grandTotal);

  const addPayment = (method, amount) => {
    const newPayment = { method, amount };
    const newPayments = [...payments, newPayment];
    setPayments(newPayments);

    const total = newPayments.reduce((sum, p) => sum + p.amount, 0);
    setRemaining(order.grandTotal - total);
  };

  const handleComplete = async () => {
    if (remaining > 0) {
      toast.error('Payment incomplete');
      return;
    }

    // ✅ Process split payment (Payments Module)
    const result = await splitPayment({
      orderId: order.id,
      payments
    });

    if (result.success) {
      onPaymentComplete(result);
    }
  };

  return (
    <div className="payment-panel">
      <h2>Payment: {order.grandTotal} SAR</h2>

      {/* Payment Methods */}
      <div className="payment-methods">
        <button onClick={() => setSelectedMethod('CASH')}>
          Cash
        </button>
        <button onClick={() => setSelectedMethod('CARD')}>
          Card
        </button>
        <button onClick={() => setSelectedMethod('MADA')}>
          Mada
        </button>
      </div>

      {/* Amount Input */}
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(parseFloat(e.target.value))}
      />

      <button onClick={() => addPayment(selectedMethod, amount)}>
        Add Payment
      </button>

      {/* Payment List */}
      <div className="payment-list">
        {payments.map((payment, idx) => (
          <div key={idx}>
            {payment.method}: {payment.amount} SAR
          </div>
        ))}
      </div>

      {/* Remaining */}
      <div className="remaining">
        Remaining: {remaining} SAR
      </div>

      <button 
        onClick={handleComplete}
        disabled={remaining !== 0}
        className="btn-success"
      >
        Complete Payment
      </button>
    </div>
  );
}
```

---

## **STEP 4: Session Management**

```typescript
// components/pos/SessionManager.tsx
export function SessionManager() {
  const { currentSession, openSession, closeSession } = useSessions();
  const [openingBalance, setOpeningBalance] = useState(0);
  const [denominations, setDenominations] = useState({});

  const handleOpenSession = async () => {
    // ✅ Open session (Sessions Module)
    const session = await openSession({
      openingBalance,
      userId: currentUser.id
    });

    toast.success('Session opened');
  };

  const handleCloseSession = async () => {
    // ✅ Close session with blind close (Sessions Module)
    const result = await closeSession({
      sessionId: currentSession.id,
      declaredBalance: calculateDeclaredBalance(denominations)
    });

    // Show variance report
    if (result.variance !== 0) {
      toast.warning(`Variance: ${result.variance} SAR`);
    }

    toast.success('Session closed');
  };

  return (
    <div className="session-manager">
      {!currentSession ? (
        <div className="open-session">
          <h2>Open Session</h2>
          <input
            type="number"
            placeholder="Opening balance"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(parseFloat(e.target.value))}
          />
          <button onClick={handleOpenSession}>
            Open Session
          </button>
        </div>
      ) : (
        <div className="current-session">
          <h3>Session: {currentSession.id}</h3>
          <div>Opened: {currentSession.openedAt}</div>
          <div>Opening Balance: {currentSession.openingBalance} SAR</div>
          <button onClick={handleCloseSession}>
            Close Session
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## **STEP 5: Kitchen Integration**

```typescript
// After order is confirmed, send to kitchen
// This happens automatically via OrderCreated event

// kitchen/handlers/order-created.handler.ts
@Injectable()
@EventHandler('OrderCreated')
export class KitchenTicketHandler {
  constructor(private kitchenService: KitchenService) {}

  async handle(event: OrderCreatedEvent): Promise<void> {
    if (event.orderType === 'DINE_IN') {
      // ✅ Create kitchen ticket (Kitchen Module)
      await this.kitchenService.createTicket({
        orderId: event.orderId,
        items: event.items,
        tableNumber: event.tableNumber,
        priority: 'NORMAL'
      });

      // Route to correct station
      for (const item of event.items) {
        const station = await this.kitchenService.getStationForProduct(
          item.productId
        );
        await this.kitchenService.routeToStation(station.id, item);
      }
    }
  }
}
```

---

## **STEP 6: Offline Sync Strategy**

```typescript
// lib/offline-sync.ts
import { openDB } from 'idb';

export class OfflineSync {
  private db: IDBDatabase;

  async init() {
    this.db = await openDB('nerdpos-offline', 1, {
      upgrade(db) {
        // Queued orders
        db.createObjectStore('orders', { keyPath: 'id' });
        
        // Queued payments
        db.createObjectStore('payments', { keyPath: 'id' });
        
        // Sync status
        db.createObjectStore('sync-status');
      }
    });
  }

  async queueOrder(order) {
    // Store order locally
    await this.db.put('orders', {
      ...order,
      syncStrategy: 'APPEND_ONLY',
      syncStatus: 'PENDING'
    });
  }

  async syncWhenOnline() {
    if (!navigator.onLine) return;

    // Get pending orders
    const pendingOrders = await this.db.getAll('orders');

    for (const order of pendingOrders) {
      try {
        // POST to server
        await fetch('/api/orders', {
          method: 'POST',
          body: JSON.stringify(order)
        });

        // Mark as synced
        await this.db.delete('orders', order.id);
      } catch (error) {
        console.error('Sync failed:', error);
      }
    }
  }
}

// Auto-sync when online
window.addEventListener('online', () => {
  offlineSync.syncWhenOnline();
});
```

---

## **INTEGRATION CHECKLIST**

Before launching POS screen:

### **Module Integration**
- [ ] Products: Categories, products, modifiers loading
- [ ] Inventory: Real-time stock checking via API
- [ ] Sales: 7-step calculation pipeline functional
- [ ] Payments: Single & split payments working
- [ ] Sessions: Open/close with blind close
- [ ] Kitchen: Tickets routing to stations
- [ ] Customers: Lookup and loyalty points
- [ ] Settings: Store config, tax rates loaded

### **Event Handlers**
- [ ] OrderCreated → InventoryDeductionHandler
- [ ] OrderCreated → KitchenTicketHandler
- [ ] OrderCreated → ComplianceInvoiceHandler
- [ ] OrderCreated → AuditLogHandler
- [ ] PaymentCompleted → OrderCompletionHandler

### **Offline Features**
- [ ] Orders queued in IndexedDB
- [ ] Auto-sync when online
- [ ] Conflict resolution strategy

### **Compliance**
- [ ] ZATCA hash chain maintained
- [ ] QR code generation
- [ ] Invoice XML stored
- [ ] Receipt printing

### **UI/UX**
- [ ] Responsive layout (1024x768 min)
- [ ] Touch-friendly buttons (min 44x44px)
- [ ] Keyboard shortcuts
- [ ] RTL support for Arabic
- [ ] Theme switching (Light/Dark/Luxury)

---

## **TESTING COMPLETE FLOW**

```bash
# 1. Open session
POST /api/sessions/open
{ "openingBalance": 1000, "userId": "user-1" }

# 2. Create order with modifiers
POST /api/orders
{
  "type": "DINE_IN",
  "tableId": "table-5",
  "items": [
    {
      "productId": "prod-coffee",
      "price": 15,
      "quantity": 2,
      "modifiers": [
        { "modifierId": "mod-size", "optionId": "opt-large", "price": 5 }
      ]
    }
  ],
  "customerId": "cust-123",
  "discountCode": "SAVE10"
}

# Expected calculation:
# Item: 15 * 2 = 30
# Modifier: 5 * 2 = 10
# Subtotal: 40
# Service charge (12%): 4.80
# Subtotal before tax: 44.80
# Tax (15%): 6.72
# Discount (10%): -5.15
# Grand total: 46.37 SAR

# 3. Process split payment
POST /api/payments/split
{
  "orderId": "ord-123",
  "payments": [
    { "method": "CASH", "amount": 20 },
    { "method": "CARD", "amount": 26.37 }
  ]
}

# 4. Verify kitchen ticket created
GET /api/kitchen/tickets
# Should show ticket for table-5

# 5. Verify inventory deducted
GET /api/inventory/stock/prod-coffee
# Stock should be reduced by 2

# 6. Verify ZATCA invoice
GET /api/compliance/invoices/order/ord-123
# Should return XML with QR code

# 7. Close session
POST /api/sessions/close
{
  "sessionId": "session-1",
  "denominations": { "200": 5, "100": 10, "50": 20, ... }
}
```

---

## **PERFORMANCE CONSIDERATIONS**

- **Category/Product Load**: < 500ms
- **Cart Calculation**: < 100ms (7 steps)
- **Payment Processing**: < 2s
- **Receipt Generation**: < 1s
- **Offline Queue**: Max 100 orders
- **Sync Batch**: 10 orders at a time

---

## **CRITICAL REMINDERS**

⚠️ **DO NOT BUILD THIS UNTIL ALL MODULES ARE COMPLETE**  
⚠️ **Test each module independently first**  
⚠️ **Test event handlers in isolation**  
⚠️ **Test offline sync thoroughly**  
⚠️ **Test ZATCA hash chain integrity**  
⚠️ **Load test with 100 concurrent orders**

---

**This is the FINAL integration. Everything comes together here. 🚀**
