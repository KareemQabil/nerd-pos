# Inventory Feature - Frontend

**Module**: Stock Management UI  
**Features**: Stock levels, adjustments, FIFO tracking  

---

## **STOCK DISPLAY**

```tsx
// components/inventory/StockBadge.tsx
export function StockBadge({ quantity, threshold }) {
  if (quantity === 0) {
    return <Badge variant="danger">Out of Stock</Badge>;
  }
  if (quantity <= threshold) {
    return <Badge variant="warning">Low Stock ({quantity})</Badge>;
  }
  return <Badge variant="success">In Stock ({quantity})</Badge>;
}
```

---

## **ADJUSTMENT FORM**

```tsx
// app/inventory/adjust/page.tsx
export default function AdjustInventoryPage() {
  const { mutate: adjustStock } = useAdjustStock();

  return (
    <form onSubmit={handleSubmit}>
      <Select name="type" options={['ADD', 'REMOVE', 'SET']} />
      <Input name="quantity" type="number" />
      <TextArea name="reason" />
      <Button type="submit">Adjust Stock</Button>
    </form>
  );
}
```
