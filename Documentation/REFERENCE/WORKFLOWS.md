# NerdPOS Complete Workflow Scenarios

## End-to-End Business Process Workflows

---

## **TABLE OF CONTENTS**

1. [Overview](#overview)
2. [Core Sales Workflows](#core-sales-workflows)
3. [Restaurant-Specific Workflows](#restaurant-specific-workflows)
4. [Inventory Management Workflows](#inventory-management-workflows)
5. [Session Management Workflows](#session-management-workflows)
6. [Payment Processing Workflows](#payment-processing-workflows)
7. [Kitchen Operations Workflows](#kitchen-operations-workflows)
8. [Customer Management Workflows](#customer-management-workflows)
9. [Reporting Workflows](#reporting-workflows)
10. [Compliance Workflows](#compliance-workflows)
11. [Error Recovery Workflows](#error-recovery-workflows)

---

## **OVERVIEW**

This document provides complete, step-by-step workflows for all major business processes in NerdPOS. Each workflow includes:
- **Actors**: Who performs the workflow
- **Preconditions**: Required state before starting
- **Steps**: Detailed actions
- **Success Criteria**: What defines success
- **Error Scenarios**: What can go wrong and how to handle it
- **Database Changes**: Tables affected
- **UI Flow**: Screen-by-screen navigation

---

## **CORE SALES WORKFLOWS**

### **Workflow 1: Quick Sale (Cash, No Table)**

**Scenario**: Customer walks in, orders, pays cash, and leaves

**Actors**: Cashier

**Preconditions**:
- Session is open
- Products exist in inventory
- Sufficient stock available

**Steps**:

1. **Navigate to POS Screen**
   - UI: Click "نقطة البيع" in sidebar
   - Screen loads with product grid and empty cart

2. **Add Products to Cart**
   - UI: Click product cards to add items
   - Cart panel updates in real-time
   - Quantity increments if product already in cart
   
   ```typescript
   // Frontend
   cartStore.addItem(product, 1);
   
   // Backend (not called yet, cart is local)
   ```

3. **Modify Quantity (Optional)**
   - UI: Click +/- buttons on cart items
   - Or: Click quantity number to enter manually
   
   ```typescript
   cartStore.updateQuantity(product_id, newQuantity);
   ```

4. **Add Notes to Item (Optional)**
   - UI: Click item, modal opens
   - Enter notes (e.g., "بدون بصل" - "No onions")
   
   ```typescript
   cartStore.updateNotes(product_id, "بدون بصل");
   ```

5. **Apply Discount (Optional)**
   - UI: Click "خصم" button
   - Enter discount percentage or fixed amount
   - Requires manager authorization if > threshold
   
   ```typescript
   cartStore.setDiscount(10); // 10%
   ```

6. **Click Checkout**
   - UI: Click large "الدفع" button in cart panel
   - Payment modal opens
   
   ```typescript
   // Validation
   if (cartStore.items.length === 0) {
     toast.error("السلة فارغة");
     return;
   }
   
   if (!sessionStore.isOpen) {
     toast.error("الجلسة غير مفتوحة");
     return;
   }
   ```

7. **Select Payment Method**
   - UI: Click "نقدي" (Cash) button
   - Display shows amount required
   
8. **Enter Amount Paid**
   - UI: Type amount in input field
   - System calculates change
   - If change < 0, show error
   
   ```typescript
   const change = amountPaid.minus(grandTotal);
   if (change.lessThan(0)) {
     // Insufficient amount
   }
   ```

9. **Confirm Payment**
   - UI: Click "تأكيد الدفع" button
   - API call to create order + payment
   
   ```typescript
   // API: POST /api/sales/orders/create-and-checkout
   {
     order_type: "DINE_IN",
     terminal_id: "terminal-1",
     warehouse_id: "warehouse-1",
     items: [
       { product_id: "p1", quantity: 2, unit_price: 50 },
       { product_id: "p2", quantity: 1, unit_price: 30 }
     ],
     payments: [
       { method: "CASH", amount: 130 }
     ]
   }
   ```

10. **Backend Processing**
    - Validate session is open
    - Check inventory availability (all items)
    - Calculate totals (7-step pipeline)
    - Generate order number (sequence)
    - **Transaction Start**
      - Create `sales_order` record (status: COMPLETED)
      - Create `order_item` records
      - Create `payment` record
      - Deduct inventory (FIFO)
      - Update session totals
    - **Transaction Commit**
    - Generate receipt data

11. **Print Receipt**
    - UI: Receipt automatically sent to printer
    - Show success message: "تم إنشاء الطلب بنجاح"
    - Receipt includes QR code (ZATCA compliance)

12. **Clear Cart**
    - Cart automatically empties
    - Ready for next order

**Success Criteria**:
- Order created with status COMPLETED
- Payment recorded
- Inventory deducted
- Session totals updated
- Receipt printed

**Error Scenarios**:

| Error | Cause | Recovery |
|-------|-------|----------|
| INV_002 | Insufficient stock | Remove item or reduce quantity |
| PAY_001 | Session not open | Open session first |
| PAY_003 | Payment mismatch | Re-enter correct amount |
| Network error | Offline | Queue in IndexedDB, sync later |

**Database Changes**:
```sql
-- sales_orders
INSERT: 1 row

-- order_items
INSERT: N rows (one per cart item)

-- payments
INSERT: 1 row

-- inventory_batches
UPDATE: Quantity decremented (FIFO)

-- stock_movements
INSERT: N rows (one per item)

-- sessions
UPDATE: total_sales, total_tax, transaction_count incremented

-- audit_logs
INSERT: 1 row (action: CREATE_ORDER)
```

---

### **Workflow 2: Dine-In Order with Table**

**Scenario**: Customer is seated, waiter takes order, saves check, later processes payment

**Actors**: Waiter (order), Cashier (payment)

**Preconditions**:
- Session open
- Table available
- Floor plan configured

**Steps**:

1. **Navigate to Tables Screen**
   - UI: Click "الطاولات" in sidebar
   - Select floor (if multiple floors)

2. **Select Empty Table**
   - UI: Click table card (status: AVAILABLE)
   - Table modal opens

3. **Assign Table to Order**
   - UI: Click "بدء طلب جديد"
   - Redirected to POS screen
   - Table number shown in cart panel header

4. **Add Items to Cart**
   - Same as Quick Sale workflow (steps 2-4)

5. **Send to Kitchen (Fire Order)**
   - UI: Click "إرسال للمطبخ" button
   - Order saved with status: CONFIRMED
   - Items sent to kitchen display
   
   ```typescript
   // API: POST /api/sales/orders/create
   {
     order_type: "DINE_IN",
     table_id: "table-5",
     items: [...],
     status: "CONFIRMED" // Not paid yet
   }
   ```

6. **Backend Processing**
   - Create order (status: CONFIRMED)
   - **Reserve** inventory (don't deduct yet)
   - Create `kitchen_order_item` records
   - WebSocket broadcast to kitchen display

7. **Kitchen Receives Order**
   - Kitchen Display Screen updates
   - Items appear by station (Grill, Fryer, etc.)
   - Timer starts

8. **Chef Prepares Food**
   - UI: Chef clicks "بدء التحضير"
   - Status: PENDING → PREPARING
   - Timer shows elapsed time
   
   ```typescript
   // API: POST /api/kitchen/items/:id/start
   {
     started_at: new Date()
   }
   ```

9. **Chef Completes Item**
   - UI: Chef clicks "جاهز"
   - Status: PREPARING → READY
   - Notification sent to waiter's device

10. **Waiter Serves Food**
    - UI: Waiter marks items as SERVED (optional)
    - Or: Proceeds directly to payment

11. **Customer Requests Bill**
    - Waiter navigates back to table
    - UI: Click "طباعة الفاتورة" (optional pre-bill)
    - Or: Click "الدفع" to process payment

12. **Process Payment**
    - Payment modal opens (same as Quick Sale, step 7)
    - Select payment method
    - Confirm payment

13. **Backend Updates**
    - **Transaction Start**
      - Update order status: CONFIRMED → COMPLETED
      - **Deduct** inventory (FIFO) - was reserved, now consumed
      - Create payment records
      - Update session totals
      - Update table status: OCCUPIED → AVAILABLE
    - **Transaction Commit**

14. **Print Final Receipt**
    - Receipt includes all items
    - QR code for ZATCA
    - Thank you message

**Success Criteria**:
- Order created and confirmed
- Items sent to kitchen
- Food prepared
- Payment processed
- Table freed

**Unique Features**:
- **Save Check**: Order exists but not paid (reserved stock)
- **Transfer Table**: Move order to different table
- **Split Check**: Divide items across multiple bills
- **Add Items Later**: Edit order before payment

---

### **Workflow 3: Takeout/Delivery Order**

**Scenario**: Customer orders for takeout or delivery

**Actors**: Cashier

**Preconditions**:
- Session open
- Delivery zones configured (if delivery)

**Steps**:

1. **Select Order Type**
   - UI: Toggle between "TAKEOUT" or "DELIVERY"
   
2. **If Delivery: Select Customer**
   - UI: Search customer by phone
   - Or: Create new customer
   
   ```typescript
   // API: GET /api/customers/search?phone=0551234567
   // If not found: POST /api/customers/create
   ```

3. **If Delivery: Confirm Address**
   - UI: Show customer's saved address
   - Or: Enter new address
   - System auto-detects delivery zone

4. **Add Items to Cart**
   - Same as Quick Sale

5. **Apply Service Charge (Optional)**
   - Restaurant setting: 10% service charge
   - Automatically added to total

6. **Calculate Delivery Fee**
   - Backend: Fetch zone pricing
   
   ```typescript
   // Delivery fee formula
   const fee = 50 + (20 * (zoneIndex - 1));
   // Zone 1: 50 SAR
   // Zone 2: 70 SAR
   // Zone 3: 90 SAR
   ```

7. **Display Total**
   - Subtotal + Service Charge + Delivery Fee + Tax
   
   ```typescript
   const subtotal = cartStore.getSubtotal();
   const serviceCharge = subtotal.times(0.10);
   const deliveryFee = new Decimal(70); // Zone 2
   const beforeTax = subtotal.plus(serviceCharge).plus(deliveryFee);
   const tax = beforeTax.times(0.15);
   const grandTotal = beforeTax.plus(tax);
   ```

8. **Checkout & Payment**
   - Same as Quick Sale (steps 6-11)

9. **Print Receipt + Kitchen Ticket**
   - Receipt for customer
   - Kitchen ticket with delivery address
   - Estimated preparation time

**Success Criteria**:
- Order created
- Delivery fee calculated correctly
- Customer info saved
- Kitchen notified

---

## **INVENTORY MANAGEMENT WORKFLOWS**

### **Workflow 4: Receive Stock (Purchase)**

**Scenario**: Supplier delivers products, staff receives and updates inventory

**Actors**: Inventory Manager

**Preconditions**:
- Products exist in system
- Warehouse exists
- Optional: Purchase Order (PO) created

**Steps**:

1. **Navigate to Inventory Screen**
   - UI: Click "المخزون" in sidebar
   - Click "استلام بضاعة" button

2. **Create New Receipt (GRN - Goods Received Note)**
   - UI: Modal opens
   - Enter supplier details (optional)
   - Select warehouse

3. **Add Products to Receipt**
   - UI: Search and select products
   - For each product:
     - Enter quantity received
     - Enter unit cost
     - Enter batch number (optional)
     - Enter expiry date (optional for perishables)

4. **Review Summary**
   - UI: Show list of products with totals
   - Total quantity
   - Total cost (quantity × unit_cost)

5. **Submit Receipt**
   - API: POST /api/inventory/receive
   
   ```typescript
   {
     warehouse_id: "w1",
     supplier_id: "s1",
     items: [
       {
         product_id: "p1",
         quantity: 100,
         unit_cost: 25.50,
         batch_number: "BATCH-001",
         expiry_date: "2025-12-31"
       }
     ]
   }
   ```

6. **Backend Processing**
   - Generate GRN number (sequence)
   - **Transaction Start**
     - Create `purchase_receipt` record
     - For each item:
       - Create `inventory_batch` (FIFO layer)
       - Create `stock_movement` (type: IN)
       - Update product `current_stock` (denormalized)
     - If PO exists: update PO status
   - **Transaction Commit**

7. **Print GRN Report**
   - Document with all received items
   - Signature lines for receiver and supplier

**Success Criteria**:
- Stock increased
- Batches created with costs
- Audit trail logged

**Database Changes**:
```sql
-- inventory_batches
INSERT: N rows (one per item)

-- stock_movements
INSERT: N rows (type: IN)

-- products (denormalized stock)
UPDATE: current_stock += quantity

-- purchase_receipt
INSERT: 1 row (if tracking GRNs)
```

---

### **Workflow 5: Stock Adjustment**

**Scenario**: Physical count reveals discrepancy, need to adjust

**Actors**: Manager

**Preconditions**:
- Manager role
- Reason required

**Steps**:

1. **Navigate to Inventory → Adjustments**
   - UI: Click "تعديل المخزون"

2. **Select Product & Warehouse**
   - Search and select product
   - Select warehouse
   - System shows current stock level

3. **Enter New Quantity**
   - Current: 50 units
   - Physical count: 48 units
   - Difference: -2 units (shortage)

4. **Enter Reason**
   - UI: Dropdown or text field
   - Options: "Damage", "Theft", "Expired", "Count Error"

5. **Require Manager Authorization**
   - UI: Prompt for manager PIN
   - Validate PIN against database

6. **Submit Adjustment**
   - API: POST /api/inventory/adjust
   
   ```typescript
   {
     product_id: "p1",
     warehouse_id: "w1",
     adjustment_quantity: -2, // Negative for decrease
     reason: "DAMAGE",
     manager_pin: "1234"
   }
   ```

7. **Backend Processing**
   - Verify manager PIN
   - **Transaction Start**
     - If increase: Create new batch
     - If decrease: Deduct from oldest batch (FIFO)
     - Create `stock_movement` (type: ADJUSTMENT)
     - Update product stock
     - Log audit with manager ID
   - **Transaction Commit**

**Success Criteria**:
- Stock corrected
- Reason documented
- Manager approval logged

---

## **SESSION MANAGEMENT WORKFLOWS**

### **Workflow 6: Open Session**

**Scenario**: Cashier starts shift, opens session

**Actors**: Cashier, Manager

**Preconditions**:
- Terminal exists
- No open session on this terminal (unless multi-session enabled)

**Steps**:

1. **Login to System**
   - UI: Enter username & password
   - System authenticates

2. **Navigate to Sessions**
   - UI: Redirected to "Open Session" screen
   - Or: Click "فتح جلسة" button

3. **Select Terminal**
   - UI: Dropdown shows available terminals
   - Auto-select if only one terminal

4. **Enter Opening Balance (Cash)**
   - UI: Input field for starting cash in drawer
   - Example: 500.00 SAR
   
   ```typescript
   const openingBalance = new Decimal(500);
   ```

5. **Confirm Opening**
   - UI: Click "فتح الجلسة"
   - API: POST /api/sessions/open
   
   ```typescript
   {
     terminal_id: "terminal-1",
     opening_balance: 500.00
   }
   ```

6. **Backend Processing**
   - Generate session number (sequence)
   - Create `session` record
     - status: OPEN
     - opened_at: now
     - opening_balance: 500.00
     - user_id: current user
   - Lock terminal (no other session can open)

7. **Success**
   - UI: Redirect to POS screen
   - Show session info in header (session #, time)
   - Enable transaction buttons

**Success Criteria**:
- Session created (status: OPEN)
- Terminal locked
- User can process transactions

**Database Changes**:
```sql
-- sessions
INSERT: 1 row (status: OPEN)

-- terminals
UPDATE: current_session_id = new session
```

---

### **Workflow 7: Close Session (Standard)**

**Scenario**: End of shift, cashier counts cash and closes session

**Actors**: Cashier, Manager (if discrepancy)

**Preconditions**:
- Session is open
- All orders paid (or saved)

**Steps**:

1. **Click "إغلاق الجلسة"**
   - UI: Button in header or sessions screen

2. **System Calculates Expected Amounts**
   - Backend query:
     - Total cash payments in this session
     - Total card payments in this session
     - Total transactions
     - Total sales
     - Total tax collected
   
   ```typescript
   // API: GET /api/sessions/:id/summary
   {
     expected_cash: 3450.00,
     expected_card: 2100.00,
     transaction_count: 42,
     total_sales: 5550.00,
     total_tax: 832.50
   }
   ```

3. **Display Summary to User**
   - UI: Modal shows:
     - Expected cash: 3,450.00 SAR
     - Opening balance: 500.00 SAR
     - Expected in drawer: 3,950.00 SAR

4. **User Counts Physical Cash**
   - UI: Input field "المبلغ الفعلي"
   - Enter counted amount: 3,930.00 SAR

5. **System Calculates Discrepancy**
   - Expected: 3,950.00
   - Actual: 3,930.00
   - Discrepancy: -20.00 SAR (shortage)
   
   ```typescript
   const discrepancy = actualCash.minus(expectedCash);
   const threshold = new Decimal(50); // From settings
   
   if (discrepancy.abs().greaterThan(threshold)) {
     // Requires manager approval
   }
   ```

6. **If Discrepancy > Threshold: Manager Override**
   - UI: Prompt for manager PIN
   - Enter reason for discrepancy
   - Manager PIN validated

7. **Confirm Close**
   - UI: Click "تأكيد الإغلاق"
   - API: POST /api/sessions/:id/close
   
   ```typescript
   {
     actual_cash: 3930.00,
     actual_card: 2100.00, // Usually matches expected
     manager_pin: "1234", // If required
     notes: "عجز بسيط - فكة للعميل" // "Small shortage - change"
   }
   ```

8. **Backend Processing**
   - Update `session` record:
     - status: OPEN → CLOSED
     - closed_at: now
     - actual_cash, actual_card
   - Create `session_payment_summary` records
   - Post accounting entry for discrepancy (if any)
     - Dr: Cash Shortage Expense (5300)
     - Cr: Cash on Hand (1101)
   - Generate Z-Report data
   - Log audit

9. **Print Z-Report**
   - Session summary
   - Expected vs actual
   - Transaction breakdown
   - Payment method totals

10. **Logout or Open New Session**
    - UI: Options to logout or open new session

**Success Criteria**:
- Session closed
- Discrepancy reconciled
- Z-Report generated
- Terminal freed

**Database Changes**:
```sql
-- sessions
UPDATE: status = CLOSED, closed_at, actual_cash, actual_card

-- session_payment_summaries
INSERT: N rows (one per payment method)

-- accounting_entries (if discrepancy)
INSERT: 2 rows (Dr Cash Shortage, Cr Cash)

-- audit_logs
INSERT: 1 row
```

---

### **Workflow 8: Blind Close**

**Scenario**: Close session without showing expected amounts (blind counting)

**Difference from Standard Close**:
- Step 3: **Don't** show expected amounts
- User counts cash without knowing what to expect
- More honest, prevents "fudging" numbers

**Steps**:
1-2. Same as standard close
3. **User Counts Cash** (without seeing expected)
4. Click "إغلاق أعمى"
5. System calculates discrepancy after submission
6-10. Same as standard close

---

## **PAYMENT PROCESSING WORKFLOWS**

### **Workflow 9: Split Payment**

**Scenario**: Customer wants to pay with cash + card

**Actors**: Cashier

**Example**: Total is 150 SAR, customer pays 100 cash + 50 MADA

**Steps**:

1. **Cart Total: 150 SAR**

2. **Click Checkout**
   - Payment modal opens

3. **Click "تقسيم الدفع" (Split Payment)**
   - UI: Split payment interface appears

4. **Add First Payment**
   - Select method: CASH
   - Enter amount: 100.00
   - Click "إضافة"
   
5. **Add Second Payment**
   - Select method: MADA
   - Enter amount: 50.00
   - Click "إضافة"

6. **Validate Total**
   - System checks: 100 + 50 = 150 ✓
   - If mismatch, show error
   
   ```typescript
   const paymentTotal = payments.reduce(
     (sum, p) => sum.plus(p.amount),
     new Decimal(0)
   );
   
   if (!paymentTotal.equals(grandTotal)) {
     throw new PaymentMismatchException();
   }
   ```

7. **Process Card Payment**
   - If card payment included:
     - Integrate with payment terminal
     - Wait for approval
     - Store card_last4, reference_number

8. **Confirm Payment**
   - API: POST /api/sales/orders/create-and-checkout
   
   ```typescript
   {
     items: [...],
     payments: [
       { method: "CASH", amount: 100 },
       { method: "MADA", amount: 50, card_last4: "1234", reference: "REF123" }
     ]
   }
   ```

9. **Backend Processing**
   - **Transaction Start**
     - Create order
     - Create multiple `payment` records
     - Post accounting entries for each method
       - CASH: Dr 1101 (Cash), Cr 4100 (Revenue)
       - MADA: Dr 1102 (Clearing), Cr 4100 (Revenue)
     - Deduct inventory
     - Update session (both methods counted)
   - **Transaction Commit**

**Success Criteria**:
- Multiple payment records created
- Total matches order total
- Session totals correct per method

---

## **KITCHEN OPERATIONS WORKFLOWS**

### **Workflow 10: Kitchen Display System (KDS)**

**Scenario**: Orders flow to kitchen, chefs update status

**Actors**: Kitchen Staff

**Preconditions**:
- Kitchen stations configured
- Products assigned to stations
- KDS screen open

**Steps**:

1. **Order Created at POS**
   - Waiter/cashier creates order
   - Items sent to kitchen (status: PENDING)

2. **Backend Routes Items to Stations**
   - Product "برجر" → Grill Station
   - Product "بطاطس" → Fryer Station
   - Create `kitchen_order_item` records
   
   ```typescript
   // For each order item
   {
     order_id: "order-123",
     order_item_id: "item-456",
     kitchen_station_id: "grill",
     status: "PENDING",
     fired_at: new Date()
   }
   ```

3. **WebSocket Broadcast**
   - Backend emits event:
   
   ```typescript
   io.to('kitchen').emit('new_order', {
     order_number: "ORD-001",
     items: [...]
   });
   ```

4. **KDS Updates in Real-Time**
   - Kitchen Display Screen shows new order
   - Items grouped by station
   - Sorted by: PENDING → PREPARING → READY

5. **Chef Selects Station Tab**
   - UI: Tabs for each station (Grill, Fryer, Drinks, etc.)
   - Click "Grill" tab

6. **Chef Sees Pending Items**
   - Order cards show:
     - Order number
     - Table number
     - Item name (quantity)
     - Notes ("بدون بصل")
     - Timer (elapsed time)
     - Priority (VIP orders in red)

7. **Chef Starts Preparing**
   - UI: Click "بدء" button on order card
   - API: POST /api/kitchen/items/:id/start
   - Status: PENDING → PREPARING
   - Timer continues (shows prep time)

8. **Chef Completes Item**
   - UI: Click "جاهز" button
   - API: POST /api/kitchen/items/:id/complete
   - Status: PREPARING → READY
   - Notification sent to waiter's device

9. **Waiter Collects Food**
   - UI: Waiter app shows "جاهز" orders
   - Click "تم التسليم"
   - Status: READY → SERVED

10. **Order Fully Served**
    - When all items SERVED
    - Order card disappears from KDS
    - Ready for payment

**Success Criteria**:
- Orders appear in real-time
- Status updates synced
- Timers accurate
- No orders missed

**UI Features**:
- **Color Coding**:
  - Green: On time
  - Yellow: Nearing target time
  - Red: Overdue
- **Sound Alerts**: New order chime
- **Filters**: Show only PENDING, hide READY

---

## **COMPLIANCE WORKFLOWS**

### **Workflow 11: ZATCA E-Invoicing (Saudi Arabia)**

**Scenario**: Generate compliant invoice with QR code

**Actors**: System (automated)

**Preconditions**:
- ZATCA enabled in settings
- VAT number configured
- Hash chain initialized

**Steps**:

1. **Order Completed (Payment Received)**
   - Trigger: Order status → COMPLETED

2. **Generate Invoice Data**
   - Collect:
     - Seller info (restaurant name, VAT number)
     - Customer info (if B2B)
     - Line items (description, qty, price, tax)
     - Totals (subtotal, tax, grand total)
     - Timestamp

3. **Calculate Hash Chain**
   - Retrieve previous invoice hash from DB
   - Generate current invoice XML (simplified TLV)
   
   ```typescript
   const previousHash = await getLastInvoiceHash();
   const invoiceXML = generateInvoiceXML(order);
   const currentHash = crypto
     .createHash('sha256')
     .update(previousHash + invoiceXML)
     .digest('hex');
   ```

4. **Generate QR Code (TLV Format)**
   - Tag-Length-Value encoding:
   
   ```typescript
   const qrData = encodeTLV([
     { tag: 1, value: sellerName },
     { tag: 2, value: vatNumber },
     { tag: 3, value: timestamp },
     { tag: 4, value: grandTotal.toString() },
     { tag: 5, value: taxAmount.toString() }
   ]);
   
   const qrCodeBase64 = await QRCode.toDataURL(qrData);
   ```

5. **Store Invoice**
   - Create `invoice` record:
   
   ```sql
   INSERT INTO invoices (
     order_id,
     invoice_number,
     previous_invoice_hash,
     hash,
     qr_code,
     zatca_status
   ) VALUES (
     'order-123',
     'INV-001',
     '0x00...prev',
     '0xabc...current',
     '<qr_base64>',
     'PENDING' -- Phase 2: Will submit to ZATCA API
   )
   ```

6. **Print Receipt with QR Code**
   - ESC/POS commands to print QR as image
   
   ```javascript
   const qrImage = Buffer.from(qrCodeBase64, 'base64');
   printer.printImage(qrImage);
   ```

7. **Phase 2 (Future): Submit to ZATCA API**
   - POST invoice XML to ZATCA clearance endpoint
   - Receive clearance UUID
   - Store UUID in database
   - Update zatca_status: PENDING → CLEARED

**Success Criteria**:
- Hash chain maintained
- QR code valid
- Invoice stored
- Receipt printed

**Critical**: Hash chain must **NEVER** break (sequential invoices)

---

## **ERROR RECOVERY WORKFLOWS**

### **Workflow 12: Offline Mode → Online Sync**

**Scenario**: Internet drops, orders queued, connection restored

**Steps**:

1. **Internet Connection Lost**
   - Axios interceptor detects network error
   - UI: Show "Offline" badge in header
   
   ```typescript
   axiosInstance.interceptors.response.use(
     (response) => response,
     (error) => {
       if (!error.response) {
         // Network error
         offlineStore.setOffline(true);
         toast.warning("لا يوجد اتصال - الحفظ محلياً");
       }
       return Promise.reject(error);
     }
   );
   ```

2. **User Creates Order While Offline**
   - Cart operates normally (Zustand store)
   - Click "الدفع" (Checkout)

3. **API Call Fails**
   - Axios throws network error
   - Catch block:
   
   ```typescript
   try {
     await createOrder(orderData);
   } catch (error) {
     if (error.isNetworkError) {
       // Queue for sync
       await syncQueueService.queueOrder(orderData);
       toast.success("تم الحفظ محلياً - سيتم المزامنة عند الاتصال");
       clearCart();
     }
   }
   ```

4. **Order Saved to IndexedDB**
   ```typescript
   await db.offline_orders.add({
     id: uuid(),
     data: orderData,
     created_at: Date.now(),
     synced: false
   });
   ```

5. **User Continues Working Offline**
   - Multiple orders queued in IndexedDB
   - UI: Show pending count badge

6. **Connection Restored**
   - Network detector triggers:
   
   ```typescript
   window.addEventListener('online', async () => {
     offlineStore.setOffline(false);
     toast.success("تم استعادة الاتصال - جارٍ المزامنة");
     await syncQueueService.syncAll();
   });
   ```

7. **Sync All Pending Orders**
   ```typescript
   const pendingOrders = await db.offline_orders
     .where('synced')
     .equals(false)
     .toArray();
   
   for (const order of pendingOrders) {
     try {
       await api.createOrder(order.data);
       await db.offline_orders.update(order.id, { synced: true });
       console.log(`✅ Synced order ${order.id}`);
     } catch (error) {
       console.error(`❌ Failed to sync order ${order.id}`);
       // Keep in queue, retry later
     }
   }
   ```

8. **Success**
   - UI: "تمت المزامنة بنجاح"
   - Badge shows 0 pending
   - Orders now in server database

**Success Criteria**:
- No data loss
- Orders synced in correct order
- Inventory eventually consistent

---

### **Workflow 13: Void Order After Kitchen Start**

**Scenario**: Customer changes mind after food started cooking

**Actors**: Manager (authorization required)

**Steps**:

1. **Identify Order**
   - Navigate to Sales or Tables screen
   - Find order (status: PREPARING)

2. **Attempt to Void**
   - UI: Click "إلغاء الطلب" button
   - System checks order status

3. **Status Check**
   - If PENDING: Allow void immediately
   - If PREPARING/READY: Require manager approval
   
   ```typescript
   if (order.status !== 'PENDING') {
     // Require manager PIN
     const isAuthorized = await promptManagerPIN();
     if (!isAuthorized) throw new UnauthorizedException();
   }
   ```

4. **Manager Authorization**
   - UI: Modal prompts for manager PIN
   - Enter reason for void
   - Examples: "Customer left", "Wrong order"

5. **Void Order**
   - API: POST /api/sales/orders/:id/void
   
   ```typescript
   {
     reason: "عميل غادر",
     manager_pin: "1234"
   }
   ```

6. **Backend Processing**
   - Verify manager PIN
   - **Transaction Start**
     - Update order status: PREPARING → VOIDED
     - **Return inventory** (reverse FIFO)
     - Create refund/credit note (if already paid)
     - Update session totals (subtract voided amount)
     - Notify kitchen (remove from KDS)
     - Log audit (manager ID + reason)
   - **Transaction Commit**

7. **Inventory Reversal**
   - Add back quantities to batches
   
   ```typescript
   // Original deduction (FIFO)
   Batch A: -5 units
   Batch B: -3 units
   
   // Reversal (LIFO - reverse order)
   Batch B: +3 units
   Batch A: +5 units
   ```

**Success Criteria**:
- Order voided
- Inventory restored
- Manager approval logged
- Kitchen notified

**Database Changes**:
```sql
-- sales_orders
UPDATE: status = VOIDED

-- order_items
UPDATE: status = VOIDED

-- inventory_batches
UPDATE: quantity += returned_amount (reverse order)

-- stock_movements
INSERT: N rows (type: RETURN)

-- sessions
UPDATE: total_sales -= voided_amount

-- audit_logs
INSERT: 1 row (manager_id, reason)
```

---

## **ADVANCED WORKFLOWS**

### **Workflow 14: Table Transfer**

**Scenario**: Move order from Table 5 to Table 8

**Steps**:
1. Navigate to Tables screen
2. Click Table 5 (has active order)
3. Click "نقل الطاولة" button
4. Select destination Table 8
5. Confirm transfer
6. API: POST /api/tables/transfer
7. Backend updates: order.table_id = table-8
8. Update both tables' status
9. Success message shown

---

### **Workflow 15: Split Check**

**Scenario**: Divide order items across 2 bills

**Steps**:
1. Load order from table
2. Click "تقسيم الفاتورة"
3. UI shows drag-and-drop interface
4. Drag Item 1, Item 2 → Bill A
5. Drag Item 3, Item 4 → Bill B
6. System validates: All items assigned
7. Click "تقسيم"
8. Backend creates 2 new orders from original
9. Original order marked as SPLIT (audit)
10. Process payment for each bill separately

---

### **Workflow 16: Daily Sales Report**

**Scenario**: Manager generates end-of-day report

**Steps**:
1. Navigate to Reports screen
2. Select "تقرير المبيعات اليومية"
3. Pick date (default: today)
4. Click "إنشاء التقرير"
5. Backend aggregates:
   - Total sales by payment method
   - Transaction count
   - Average transaction value
   - Top selling products
   - Hourly breakdown
   - Tax collected
6. Display in table/chart format
7. Option to export PDF or Excel

---

## **SUMMARY TABLE: All Workflows**

| # | Workflow | Actors | Duration | Complexity |
|---|----------|--------|----------|------------|
| 1 | Quick Sale | Cashier | 2-3 min | Low |
| 2 | Dine-In with Table | Waiter, Cashier | 30-60 min | Medium |
| 3 | Takeout/Delivery | Cashier | 3-5 min | Medium |
| 4 | Receive Stock | Inventory Mgr | 10-15 min | Medium |
| 5 | Stock Adjustment | Manager | 2-3 min | Low |
| 6 | Open Session | Cashier | 1 min | Low |
| 7 | Close Session | Cashier, Manager | 5-10 min | Medium |
| 8 | Blind Close | Cashier | 5-10 min | Medium |
| 9 | Split Payment | Cashier | 3-4 min | Low |
| 10 | Kitchen Display | Kitchen Staff | Ongoing | Medium |
| 11 | ZATCA E-Invoicing | System | <1 sec | High (Technical) |
| 12 | Offline Sync | System | Automatic | High (Technical) |
| 13 | Void After Kitchen | Manager | 2-3 min | Medium |
| 14 | Table Transfer | Waiter | 1 min | Low |
| 15 | Split Check | Waiter | 3-5 min | Medium |
| 16 | Daily Sales Report | Manager | 1-2 min | Low |

---

**This document is the operational bible for NerdPOS. Train staff using these workflows!** 📖✅
