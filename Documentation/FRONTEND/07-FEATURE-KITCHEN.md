# Kitchen Feature - Frontend

**Module**: Kitchen Display System  
**Features**: Ticket display, bump bar, station views  

---

## **KDS SCREEN**

```tsx
// app/kitchen/page.tsx
export default function KitchenPage() {
  const { data: tickets } = useActiveTickets(stationId);

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
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

  return (
    <Card className="glass-card">
      <h3 className="text-2xl font-bold">{ticket.ticketNumber}</h3>
      <div className="space-y-2 mt-4">
        {ticket.items.map(item => (
          <div key={item.id} className="flex justify-between">
            <span>{item.quantity}x {item.product.name}</span>
            <button onClick={() => bumpItem(item.id)}>✓</button>
          </div>
        ))}
      </div>
    </Card>
  );
}
```
