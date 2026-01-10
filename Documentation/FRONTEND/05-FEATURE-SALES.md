# Sales Feature - Frontend

**Module**: Orders & Sales UI  
**Features**: Order list, details, status tracking  

---

## **ORDER LIST**

```tsx
// app/orders/page.tsx
export default function OrdersPage() {
  const { data: orders } = useOrders();

  return (
    <div className="space-y-4">
      {orders?.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}
```

---

## **ORDER CARD**

```tsx
export function OrderCard({ order }) {
  return (
    <Card>
      <div className="flex justify-between">
        <div>
          <h3>{order.orderNumber}</h3>
          <Badge>{order.status}</Badge>
        </div>
        <PriceTag price={order.grandTotal} />
      </div>
    </Card>
  );
}
```
