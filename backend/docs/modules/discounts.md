# Discounts Module API

Discount code management and validation.

---

## Discount Management Endpoints

### POST /api/v1/discounts

**Permission**: `DISCOUNTS_CREATE` (Manager+)  
**Description**: Creates a new discount rule

**Request**:

```json
{
  "code": "SUMMER2026",
  "type": "PERCENTAGE",
  "value": 10.0,
  "startDate": "2026-06-01",
  "endDate": "2026-08-31",
  "minOrderAmount": 50.0,
  "usageLimit": 1000
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "disc_123",
    "code": "SUMMER2026",
    "type": "PERCENTAGE",
    "value": 10.0,
    "status": "ACTIVE"
  },
  "error": null
}
```

---

### GET /api/v1/discounts

**Permission**: `DISCOUNTS_VIEW` (Cashier+)  
**Description**: Returns paginated active discounts

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Success Response (200)**:

```json
{
  "result": {
    "data": [
      {
        "id": "disc_123",
        "code": "SUMMER2026",
        "description": "Summer Sale 10% Off",
        "value": 10.0,
        "type": "PERCENTAGE"
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  },
  "error": null
}
```

---

### GET /api/v1/discounts/:id

**Permission**: `DISCOUNTS_VIEW` (Cashier+)  
**Description**: Returns discount details by ID

**Success Response (200)**:

```json
{
  "result": {
    "id": "disc_123",
    "code": "SUMMER2026",
    "startDate": "2026-06-01",
    "endDate": "2026-08-31",
    "usageLimit": 1000,
    "usageCount": 45
  },
  "error": null
}
```

---

### PUT /api/v1/discounts/:id

**Permission**: `DISCOUNTS_UPDATE` (Manager+)  
**Description**: Updates discount rules

**Request**:

```json
{
  "value": 15.0,
  "usageLimit": 2000
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "disc_123",
    "code": "SUMMER2026",
    "value": 15.0,
    "usageLimit": 2000
  },
  "error": null
}
```

---

## Discount Application Endpoints

### POST /api/v1/discounts/validate

**Permission**: `DISCOUNTS_APPLY` (Cashier+)  
**Description**: Validates discount code and calculates savings

**Request**:

```json
{
  "code": "SUMMER2026",
  "orderTotal": 155.0,
  "customerId": "cust_123"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "code": "SUMMER2026",
    "isValid": true,
    "discountAmount": 15.5,
    "finalTotal": 139.5
  },
  "error": null
}
```

---

### POST /api/v1/discounts/apply

**Permission**: `DISCOUNTS_APPLY` (Cashier+)  
**Description**: Applies validated discount to order

**Request**:

```json
{
  "orderId": "ord_123",
  "discountCode": "SUMMER2026"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "orderId": "ord_123",
    "discountId": "disc_123",
    "appliedAmount": 15.5
  },
  "error": null
}
```

---

### GET /api/v1/discounts/valid

**Permission**: `DISCOUNTS_VIEW` (Cashier+)  
**Description**: Returns discounts applicable to order total

**Query Parameters**:

- `orderTotal` (required): Order total amount
- `customerId` (optional): Customer UUID for tier-based discounts

**Success Response (200)**:

```json
{
  "result": [
    {
      "code": "BULK10",
      "description": "10% off orders over 500 SAR",
      "minOrderAmount": 500
    }
  ],
  "error": null
}
```

---

## Notes

- Discount types: PERCENTAGE, FIXED_AMOUNT
- Validation checks: date range, usage limits, minimum order amount, customer tier
- Codes are case-insensitive
- One discount per order (configurable)
- Usage count incremented on order completion, not validation
- Expired or depleted discounts automatically excluded from active lists
