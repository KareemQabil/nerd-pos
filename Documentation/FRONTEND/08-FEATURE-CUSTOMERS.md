# Customers Feature - Frontend

**Module**: Customer Management UI  
**Features**: Customer search, addresses, loyalty  

---

## **CUSTOMER SEARCH**

```tsx
// components/customers/CustomerSearch.tsx
export function CustomerSearch({ onSelect }) {
  const [phone, setPhone] = useState('');
  const { data: customer, refetch } = useCustomerByPhone(phone);

  return (
    <div>
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Phone number"
      />
      <Button onClick={() => refetch()}>Search</Button>
      
      {customer && (
        <CustomerCard customer={customer} onSelect={onSelect} />
      )}
    </div>
  );
}
```

---

## **LOYALTY DISPLAY**

```tsx
export function LoyaltyBadge({ customer }) {
  return (
    <div className="glass-card">
      <p>Points: {customer.loyaltyPoints}</p>
      {customer.tier && <Badge>{customer.tier.name}</Badge>}
    </div>
  );
}
```
