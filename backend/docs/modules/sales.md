# Sales Module API

Order creation, management, and transaction processing.

---

## Order Management Endpoints

### POST /api/v1/sales

**Permission**: `SALES_CREATE` (Cashier+)  
**Description**: Creates a new sales order

**Request**:

```json
{
  "orderType": "DINE_IN",
  "tableId": "table-001",
  "items": [
    {
      "productId": "prod-burger-001",
      "quantity": 2,
      "price": 25.0,
      "modifiers": []
    }
  ]
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "order-dine-in-001",
    "orderNumber": "ORD20260100001",
    "orderType": "DINE_IN",
    "status": "PENDING",
    "subtotal": 50.0,
    "taxAmount": 7.5,
    "totalAmount": 57.5,
    "items": [
      {
        "id": "item_1",
        "productId": "prod-burger-001",
        "quantity": 2,
        "unitPrice": 25.0,
        "totalPrice": 50.0
      }
    ]
  },
  "error": null
}
```

---

### GET /api/v1/sales

**Permission**: `SALES_VIEW` (Cashier+)  
**Description**: Returns paginated list of orders

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Success Response (200)**:

```json
{
  "result": {
    "data": [
      {
        "id": "ord_123",
        "orderNumber": "ORD-001",
        "totalAmount": 57.5,
        "status": "COMPLETED"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 20
  },
  "error": null
}
```

---

### GET /api/v1/sales/:id

**Permission**: `SALES_VIEW` (Cashier+)  
**Description**: Returns order details by ID

**Success Response (200)**:

```json
{
  "result": {
    "id": "ord_123",
    "orderNumber": "ORD-001",
    "orderType": "DINE_IN",
    "status": "COMPLETED",
    "items": [],
    "totalAmount": 57.5
  },
  "error": null
}
```

---

### GET /api/v1/sales/number/:orderNumber

**Permission**: `SALES_VIEW` (Cashier+)  
**Description**: Returns order by order number

**Success Response (200)**:

```json
{
  "result": {
    "id": "ord_123",
    "orderNumber": "ORD-001",
    "totalAmount": 57.5
  },
  "error": null
}
```

---

### GET /api/v1/sales/session/:sessionId

**Permission**: `SALES_VIEW` (Cashier+)  
**Description**: Returns all orders for a session

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "ord_1",
      "orderNumber": "ORD-001",
      "totalAmount": 57.5
    }
  ],
  "error": null
}
```

---

### PUT /api/v1/sales/:id/status

**Permission**: `SALES_UPDATE` (Cashier+)  
**Description**: Updates order status

**Request**:

```json
{
  "status": "CONFIRMED"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "ord_123",
    "status": "CONFIRMED",
    "updatedAt": "2026-01-23T12:00:00Z"
  },
  "error": null
}
```

---

### POST /api/v1/sales/:id/items

**Permission**: `SALES_UPDATE` (Cashier+)  
**Description**: Adds item to existing order

**Request**:

```json
{
  "productId": "prod_789",
  "quantity": 1,
  "modifiers": []
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "item_new",
    "orderId": "ord_123",
    "productId": "prod_789",
    "quantity": 1,
    "totalPrice": 15.0
  },
  "error": null
}
```

---

### PUT /api/v1/sales/:orderId/items/:itemId

**Permission**: `SALES_UPDATE` (Cashier+)  
**Description**: Updates order item quantity

**Request**:

```json
{
  "quantity": 3
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "item_1",
    "quantity": 3,
    "totalPrice": 75.0
  },
  "error": null
}
```

---

### DELETE /api/v1/sales/:orderId/items/:itemId

**Permission**: `SALES_UPDATE` (Cashier+)  
**Description**: Removes item from order

**Success Response (200)**:

```json
{
  "result": {
    "message": "Item removed from order"
  },
  "error": null
}
```

---

### POST /api/v1/sales/:id/cancel

**Permission**: `SALES_CANCEL` (Manager only)  
**Description**: Cancels an order with reason

**Request**:

```json
{
  "reason": "Customer request"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "ord_123",
    "status": "CANCELLED",
    "cancellationReason": "Customer request"
  },
  "error": null
}
```

---

## Notes

- Order types: DINE_IN, TAKEAWAY, DELIVERY
- Order statuses: PENDING, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
- Order numbers auto-generated in format: ORD{YYYYMMDD}{sequence}
- Tax calculated automatically based on configured rate
- Items can be modified only when order status is PENDING or CONFIRMED
- Cancellation requires Manager permission
- Orders linked to sessions for cashier accountability
