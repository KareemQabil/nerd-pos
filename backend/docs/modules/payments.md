# Payments Module API

Payment processing, refunds, and payment method management.

---

## Payment Processing Endpoints

### POST /api/v1/payments

**Permission**: `PAYMENTS_CREATE` (Cashier+)  
**Description**: Processes a payment for an order

**Request**:

```json
{
  "orderId": "order-dine-in-001",
  "paymentMethodId": "pm-cash-001",
  "amount": 115.0,
  "receivedAmount": 120.0
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "payment-001",
    "orderId": "order-dine-in-001",
    "paymentMethod": "CASH",
    "amount": 115.0,
    "receivedAmount": 120.0,
    "change": 5.0,
    "status": "COMPLETED"
  },
  "error": null
}
```

---

### POST /api/v1/payments/split

**Permission**: `PAYMENTS_SPLIT` (Cashier+)  
**Description**: Processes multiple payment methods for one order

**Request**:

```json
{
  "orderId": "ord_123",
  "payments": [
    {
      "paymentMethodId": "pm_cash",
      "amount": 50.0
    },
    {
      "paymentMethodId": "pm_card",
      "amount": 65.0
    }
  ]
}
```

**Success Response (201)**:

```json
{
  "result": {
    "orderId": "ord_123",
    "totalAmount": 115.0,
    "payments": [
      {
        "id": "pay_1",
        "method": "CASH",
        "amount": 50.0
      },
      {
        "id": "pay_2",
        "method": "CARD",
        "amount": 65.0
      }
    ],
    "status": "COMPLETED"
  },
  "error": null
}
```

---

### GET /api/v1/payments/:id

**Permission**: `PAYMENTS_VIEW` (Cashier+)  
**Description**: Returns payment details by ID

**Success Response (200)**:

```json
{
  "result": {
    "id": "pay_123",
    "amount": 50.0,
    "method": "CARD",
    "status": "COMPLETED"
  },
  "error": null
}
```

---

### GET /api/v1/payments/order/:orderId

**Permission**: `PAYMENTS_VIEW` (Cashier+)  
**Description**: Returns all payments for an order

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "pay_123",
      "amount": 50.0,
      "method": "CASH",
      "status": "COMPLETED"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/payments/session/:sessionId

**Permission**: `PAYMENTS_VIEW_ALL` (Manager+)  
**Description**: Returns all payments for a session

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "pay_1",
      "orderId": "ord_1",
      "amount": 115.0,
      "method": "CASH"
    },
    {
      "id": "pay_2",
      "orderId": "ord_2",
      "amount": 50.0,
      "method": "CARD"
    }
  ],
  "error": null
}
```

---

## Payment Method Endpoints

### GET /api/v1/payments/methods

**Permission**: `PAYMENTS_VIEW` (Cashier+)  
**Description**: Returns all available payment methods

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "pm_1",
      "nameEn": "Cash",
      "nameAr": "نقدي",
      "type": "CASH",
      "active": true
    }
  ],
  "error": null
}
```

---

### POST /api/v1/payments/methods

**Permission**: `SETTINGS_UPDATE` (Admin only)  
**Description**: Creates new payment method

**Request**:

```json
{
  "nameEn": "Mobile Wallet",
  "nameAr": "محفظة إلكترونية",
  "type": "DIGITAL",
  "active": true
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "pm_3",
    "nameEn": "Mobile Wallet",
    "type": "DIGITAL",
    "active": true
  },
  "error": null
}
```

---

### PUT /api/v1/payments/methods/:id

**Permission**: `SETTINGS_UPDATE` (Admin only)  
**Description**: Updates payment method

**Request**:

```json
{
  "active": false
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "pm_3",
    "active": false
  },
  "error": null
}
```

---

## Refund Endpoints

### POST /api/v1/payments/refunds

**Permission**: `PAYMENTS_CREATE` (Cashier+)  
**Description**: Creates a refund request for approval

**Request**:

```json
{
  "paymentId": "pay_123",
  "amount": 50.0,
  "reason": "Customer complaint"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "ref_123",
    "paymentId": "pay_123",
    "amount": 50.0,
    "status": "PENDING",
    "reason": "Customer complaint"
  },
  "error": null
}
```

---

### GET /api/v1/payments/refunds/pending

**Permission**: `PAYMENTS_APPROVE_REFUND` (Manager only)  
**Description**: Returns refunds awaiting approval

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "ref_123",
      "paymentId": "pay_123",
      "amount": 50.0,
      "reason": "Customer complaint",
      "requestedAt": "2026-01-23T12:00:00Z"
    }
  ],
  "error": null
}
```

---

### PUT /api/v1/payments/refunds/:id/approve

**Permission**: `PAYMENTS_APPROVE_REFUND` (Manager only)  
**Description**: Approves a pending refund

**Request**:

```json
{
  "userId": "usr_manager"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "ref_123",
    "status": "APPROVED",
    "approvedBy": "usr_manager",
    "approvedAt": "2026-01-23T12:15:00Z"
  },
  "error": null
}
```

---

### PUT /api/v1/payments/refunds/:id/reject

**Permission**: `PAYMENTS_APPROVE_REFUND` (Manager only)  
**Description**: Rejects a pending refund with reason

**Request**:

```json
{
  "userId": "usr_manager",
  "reason": "Insufficient evidence"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "ref_123",
    "status": "REJECTED",
    "rejectedBy": "usr_manager",
    "rejectionReason": "Insufficient evidence"
  },
  "error": null
}
```

---

## Notes

- Payment statuses: PENDING, COMPLETED, FAILED, REFUNDED
- Split payments allow multiple payment methods per order
- Refund workflow: Create request → Manager approval → Process refund
- Payment types: CASH, CARD, DIGITAL, LOYALTY_POINTS
- Change calculation automatic for cash payments
- All payments linked to register sessions for reconciliation
