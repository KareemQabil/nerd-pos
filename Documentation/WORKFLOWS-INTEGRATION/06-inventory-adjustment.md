# Inventory Adjustment Workflow

**Types**: Receive, Transfer, Waste, Count  
**Method**: FIFO (First-In-First-Out)  
**Audit**: Full tracking of movements  

---

## **RECEIVE STOCK (Purchase Order)**

```typescript
// Step 1: Create purchase order
const po = await inventoryService.createPurchaseOrder({
  supplierId: 'sup-123',
  items: [
    { productId: 'prod-1', quantity: 100, unitCost: 5.00 },
    { productId: 'prod-2', quantity: 50, unitCost: 10.00 },
  ],
});

// Step 2: Receive shipment
await inventoryService.receiveShipment({
  purchaseOrderId: po.id,
  warehouseId: 'wh-main',
  receivedItems: [
    { productId: 'prod-1', quantity: 95, batchNumber: 'BATCH-001', expiryDate: '2027-01-01' },
    { productId: 'prod-2', quantity: 50, batchNumber: 'BATCH-002' },
  ],
});

// Creates inventory batches (FIFO)
await prisma.inventoryBatch.createMany({
  data: [
    {
      productId: 'prod-1',
      warehouseId: 'wh-main',
      quantity: 95,
      remainingQuantity: 95,
      batchNumber: 'BATCH-001',
      unitCost: new Decimal('5.00'),
      expiryDate: new Date('2027-01-01'),
      receivedAt: new Date(),
    },
  ],
});

// Event emitted
eventBus.emit(new StockReceivedEvent(po.id, receivedItems));
```

---

## **TRANSFER BETWEEN WAREHOUSES**

```typescript
// Transfer from main warehouse to retail location
const transfer = await inventoryService.createTransfer({
  fromWarehouseId: 'wh-main',
  toWarehouseId: 'wh-retail-1',
  items: [
    { productId: 'prod-1', quantity: 20 },
  ],
  reason: 'Stock replenishment',
});

// FIFO: Select oldest batches first
const batches = await prisma.inventoryBatch.findMany({
  where: {
    productId: 'prod-1',
    warehouseId: 'wh-main',
    remainingQuantity: { gt: 0 },
  },
  orderBy: { receivedAt: 'asc' }, // FIFO
});

let remaining = 20;
for (const batch of batches) {
  const toTransfer = Math.min(batch.remainingQuantity, remaining);
  
  // Decrease source
  await prisma.inventoryBatch.update({
    where: { id: batch.id },
    data: { remainingQuantity: { decrement: toTransfer } },
  });
  
  // Create in destination
  await prisma.inventoryBatch.create({
    data: {
      productId: batch.productId,
      warehouseId: 'wh-retail-1',
      quantity: toTransfer,
      remainingQuantity: toTransfer,
      batchNumber: batch.batchNumber,
      unitCost: batch.unitCost,
      expiryDate: batch.expiryDate,
      receivedAt: new Date(),
    },
  });
  
  remaining -= toTransfer;
  if (remaining === 0) break;
}

// Log transfer
await prisma.inventoryTransfer.create({
  data: {
    fromWarehouseId: 'wh-main',
    toWarehouseId: 'wh-retail-1',
    productId: 'prod-1',
    quantity: 20,
    status: 'COMPLETED',
  },
});
```

---

## **WASTE/SPOILAGE**

```typescript
// Mark items as wasted
await inventoryService.recordWaste({
  warehouseId: 'wh-main',
  items: [
    { productId: 'prod-1', quantity: 5, reason: 'Expired', batchNumber: 'BATCH-001' },
  ],
});

// Decrease inventory
const batch = await prisma.inventoryBatch.findFirst({
  where: {
    productId: 'prod-1',
    batchNumber: 'BATCH-001',
  },
});

await prisma.inventoryBatch.update({
  where: { id: batch.id },
  data: { remainingQuantity: { decrement: 5 } },
});

// Log waste
await prisma.inventoryAdjustment.create({
  data: {
    productId: 'prod-1',
    warehouseId: 'wh-main',
    quantity: -5,
    type: 'WASTE',
    reason: 'Expired',
    batchNumber: 'BATCH-001',
  },
});

// Event emitted
eventBus.emit(new InventoryWastedEvent('prod-1', 5, 'Expired'));
```

---

## **STOCK COUNT (Physical Inventory)**

```typescript
// Step 1: Start stock count
const count = await inventoryService.startStockCount({
  warehouseId: 'wh-main',
  type: 'FULL', // or 'CYCLE'
});

// Step 2: Count products
await inventoryService.submitCount(count.id, {
  productCounts: [
    { productId: 'prod-1', physicalCount: 90 },
    { productId: 'prod-2', physicalCount: 48 },
  ],
});

// Step 3: Compare with system
const systemCount = await inventoryService.getSystemCount('wh-main');

// Step 4: Create adjustments
for (const counted of productCounts) {
  const systemQty = systemCount[counted.productId] || 0;
  const difference = counted.physicalCount - systemQty;
  
  if (difference !== 0) {
    await inventoryService.adjustStock({
      productId: counted.productId,
      warehouseId: 'wh-main',
      quantity: difference,
      type: 'COUNT_ADJUSTMENT',
      reason: `Stock count variance: ${difference}`,
    });
  }
}

// Step 5: Finalize count
await prisma.stockCount.update({
  where: { id: count.id },
  data: {
    status: 'COMPLETED',
    completedAt: new Date(),
  },
});
```

---

## **MANUAL ADJUSTMENT**

```typescript
// For corrections, damaged goods, etc.
await inventoryService.manualAdjust({
  productId: 'prod-1',
  warehouseId: 'wh-main',
  quantity: -3, // Negative for decrease
  type: 'MANUAL',
  reason: 'Damaged during handling',
  approvedBy: 'manager-123',
});

// Always requires manager approval
if (!approvedBy) {
  throw new Error('Manual adjustments require manager approval');
}

// Log adjustment
await prisma.inventoryAdjustment.create({
  data: {
    productId,
    warehouseId,
    quantity,
    type,
    reason,
    approvedBy,
    createdAt: new Date(),
  },
});
```

---

## **FRONTEND - RECEIVE STOCK**

```tsx
export function ReceiveStockForm({ purchaseOrder }) {
  const [receivedItems, setReceivedItems] = useState([]);
  const { mutate: receiveStock } = useReceiveStock();

  return (
    <form>
      <h2>Receive PO: {purchaseOrder.poNumber}</h2>
      
      {purchaseOrder.items.map(item => (
        <div key={item.id}>
          <span>{item.product.name}</span>
          <span>Ordered: {item.quantity}</span>
          <Input
            label="Received"
            type="number"
            max={item.quantity}
            onChange={(e) => updateReceivedQty(item.id, e.target.value)}
          />
          <Input label="Batch Number" />
          <Input label="Expiry Date" type="date" />
        </div>
      ))}
      
      <Button onClick={() => receiveStock({ poId: purchaseOrder.id, receivedItems })}>
        Complete Receipt
      </Button>
    </form>
  );
}
```

---

**NEXT**: [07-compliance-submission.md](07-compliance-submission.md)
