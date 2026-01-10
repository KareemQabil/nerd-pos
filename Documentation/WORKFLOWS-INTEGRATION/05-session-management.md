# Session Management Workflow

**Flow**: Open → Transactions → Blind Close → Reconciliation  
**Compliance**: ZATCA requires session tracking  
**Cash**: Physical count vs. system  

---

## **OPEN SESSION**

```typescript
// 1. Cashier opens register
const session = await sessionsService.openSession({
  cashierId: currentUser.id,
  registerId: 'REG-001',
  openingBalance: new Decimal('500.00'), // Starting cash
});

// Creates session record
await prisma.session.create({
  data: {
    sessionNumber: `SES-${new Date().getFullYear()}-${sequenceNumber}`,
    cashierId,
    registerId,
    openingBalance,
    status: 'OPEN',
    openedAt: new Date(),
  },
});

// Event emitted
eventBus.emit(new SessionOpenedEvent(session.id));
```

---

## **DURING SESSION**

```typescript
// All transactions linked to session
await prisma.payment.create({
  data: {
    sessionId: currentSession.id,
    orderId,
    method: 'CASH',
    amount,
  },
});

// Cash movements tracked
await prisma.cashMovement.create({
  data: {
    sessionId: currentSession.id,
    type: 'CASH_IN', // or CASH_OUT
    amount,
    reason: 'Safe drop',
  },
});
```

---

## **BLIND CLOSE (No Peeking)**

```typescript
// Step 1: Cashier counts physical cash
const cashCount = {
  coins: [
    { denomination: 0.01, quantity: 50 }, // 0.50
    { denomination: 0.05, quantity: 20 }, // 1.00
    // ...
  ],
  bills: [
    { denomination: 1, quantity: 100 },   // 100
    { denomination: 5, quantity: 50 },    // 250
    { denomination: 10, quantity: 30 },   // 300
    // ...
  ],
};

const physicalTotal = calculateTotal(cashCount); // e.g., 2,543.50

// Step 2: Submit count (BLIND - doesn't see expected)
await sessionsService.submitCashCount(sessionId, {
  physicalCash: physicalTotal,
  breakdown: cashCount,
});

// Step 3: System calculates expected
const expected = await sessionsService.calculateExpectedCash(sessionId);

// Step 4: Reveal discrepancy
const discrepancy = physicalTotal.minus(expected.amount);

// Step 5: Manager approval if discrepancy > threshold
if (discrepancy.abs().greaterThan(5)) {
  await sessionsService.requestApproval(sessionId, {
    discrepancy,
    reason: 'Awaiting manager approval',
  });
}
```

---

## **CALCULATE EXPECTED CASH**

```typescript
async calculateExpectedCash(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      payments: true,
      cashMovements: true,
    },
  });

  // Start with opening balance
  let expected = new Decimal(session.openingBalance);

  // Add cash payments
  const cashPayments = session.payments.filter(p => p.method === 'CASH');
  for (const payment of cashPayments) {
    expected = expected.plus(payment.amount);
  }

  // Subtract cash refunds
  const cashRefunds = session.payments.filter(p => p.method === 'CASH' && p.amount < 0);
  for (const refund of cashRefunds) {
    expected = expected.plus(refund.amount); // Negative, so subtracts
  }

  // Apply cash movements (safe drops, payouts)
  for (const movement of session.cashMovements) {
    if (movement.type === 'CASH_OUT') {
      expected = expected.minus(movement.amount);
    } else {
      expected = expected.plus(movement.amount);
    }
  }

  return { amount: expected, breakdown: { /* details */ } };
}
```

---

## **CLOSE SESSION**

```typescript
// After reconciliation
await sessionsService.closeSession(sessionId, {
  closingBalance: physicalTotal,
  discrepancy,
  managerApprovalId: approvalId,
});

await prisma.session.update({
  where: { id: sessionId },
  data: {
    status: 'CLOSED',
    closingBalance: physicalTotal,
    expectedBalance: expected.amount,
    discrepancy,
    closedAt: new Date(),
  },
});

// Generate session report
const report = await sessionsService.generateReport(sessionId);

// Event emitted
eventBus.emit(new SessionClosedEvent(sessionId, report));
```

---

## **SESSION REPORT**

```typescript
interface SessionReport {
  sessionNumber: string;
  cashier: string;
  openedAt: Date;
  closedAt: Date;
  
  openingBalance: Decimal;
  closingBalance: Decimal;
  expectedBalance: Decimal;
  discrepancy: Decimal;
  
  transactions: {
    totalOrders: number;
    totalSales: Decimal;
    cashSales: Decimal;
    cardSales: Decimal;
    refunds: Decimal;
  };
  
  cashMovements: {
    safeDrops: Decimal;
    payouts: Decimal;
  };
  
  breakdown: {
    coins: CoinBreakdown[];
    bills: BillBreakdown[];
  };
}
```

---

## **FRONTEND - OPEN SESSION**

```tsx
export function OpenSessionModal() {
  const [openingBalance, setOpeningBalance] = useState(500);
  const { mutate: openSession } = useOpenSession();

  const handleSubmit = () => {
    openSession({
      openingBalance,
      registerId: currentRegister.id,
    });
  };

  return (
    <Modal>
      <h2>Open Session</h2>
      <Input
        label="Opening Balance (SAR)"
        type="number"
        value={openingBalance}
        onChange={(e) => setOpeningBalance(parseFloat(e.target.value))}
      />
      <Button onClick={handleSubmit}>Open Session</Button>
    </Modal>
  );
}
```

---

## **FRONTEND - CLOSE SESSION**

```tsx
export function CloseSessionModal({ session }) {
  const [cashCount, setCashCount] = useState(initialCashCount);
  const { mutate: closeSession } = useCloseSession();

  const physicalTotal = useMemo(() => {
    return calculateCashTotal(cashCount);
  }, [cashCount]);

  return (
    <Modal>
      <h2>Close Session - {session.sessionNumber}</h2>
      
      <CashCountForm cashCount={cashCount} onChange={setCashCount} />
      
      <div className="text-2xl font-bold mt-4">
        Total: {physicalTotal.toFixed(2)} SAR
      </div>
      
      <Button onClick={() => closeSession({ sessionId: session.id, physicalTotal })}>
        Submit Count
      </Button>
    </Modal>
  );
}
```

---

**NEXT**: [06-inventory-adjustment.md](06-inventory-adjustment.md)
