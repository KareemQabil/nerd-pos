# Customers Module API

Customer management, addresses, and loyalty program.

---

## Customer Endpoints

### POST /api/v1/customers

**Permission**: `CUSTOMERS_CREATE` (Cashier+)  
**Description**: Creates a new customer record

**Request**:

```json
{
  "nameEn": "Ahmed Mohamed",
  "nameAr": "أحمد محمد",
  "phone": "+966501234567",
  "email": "ahmed@example.com",
  "preferredLanguage": "ar",
  "notes": "VIP customer"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "cust_123456789",
    "code": "CUS20260100001",
    "nameEn": "Ahmed Mohamed",
    "nameAr": "أحمد محمد",
    "phone": "+966501234567",
    "email": "ahmed@example.com",
    "preferredLanguage": "ar",
    "notes": "VIP customer",
    "loyaltyPoints": 0,
    "tier": "BRONZE"
  },
  "error": null
}
```

---

### GET /api/v1/customers/search

**Permission**: `CUSTOMERS_VIEW` (Cashier+)  
**Description**: Searches customers by name, phone, or email

**Query Parameters**:

- `q` (optional): Search query string
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Success Response (200)**:

```json
{
  "result": {
    "data": [
      {
        "id": "cust_123",
        "nameEn": "Ahmed Mohamed",
        "nameAr": "أحمد محمد",
        "phone": "+966501234567",
        "tier": "GOLD"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  },
  "error": null
}
```

---

### GET /api/v1/customers/phone/:phone

**Permission**: `CUSTOMERS_VIEW` (Cashier+)  
**Description**: Looks up customer by phone number

**Success Response (200)**:

```json
{
  "result": {
    "id": "cust_123",
    "nameEn": "Ahmed Mohamed",
    "nameAr": "أحمد محمد",
    "phone": "+966501234567"
  },
  "error": null
}
```

---

### GET /api/v1/customers/:id

**Permission**: `CUSTOMERS_VIEW` (Cashier+)  
**Description**: Returns customer details by ID

**Success Response (200)**:

```json
{
  "result": {
    "id": "cust_123",
    "code": "CUS20260100001",
    "nameEn": "Ahmed Mohamed",
    "nameAr": "أحمد محمد",
    "phone": "+966501234567",
    "email": "ahmed@example.com",
    "loyaltyPoints": 1500,
    "tier": "GOLD"
  },
  "error": null
}
```

---

### GET /api/v1/customers/:id/details

**Permission**: `CUSTOMERS_VIEW` (Cashier+)  
**Description**: Returns customer with loyalty tier information

**Success Response (200)**:

```json
{
  "result": {
    "id": "cust_123",
    "nameEn": "Ahmed Mohamed",
    "nameAr": "أحمد محمد",
    "tier": "GOLD",
    "tierProgress": 75,
    "nextTier": "PLATINUM",
    "pointsToNextTier": 250
  },
  "error": null
}
```

---

### PUT /api/v1/customers/:id

**Permission**: `CUSTOMERS_UPDATE` (Cashier+)  
**Description**: Updates customer information

**Request**:

```json
{
  "nameEn": "Ahmed M. Updated",
  "email": "newemail@example.com",
  "preferredLanguage": "en"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "cust_123",
    "nameEn": "Ahmed M. Updated",
    "email": "newemail@example.com",
    "preferredLanguage": "en"
  },
  "error": null
}
```

---

## Address Endpoints

### POST /api/v1/customers/:id/addresses

**Permission**: `CUSTOMERS_UPDATE` (Cashier+)  
**Description**: Adds a delivery address for customer

**Request**:

```json
{
  "type": "HOME",
  "street": "King Fahd Road",
  "city": "Riyadh",
  "district": "Al Malqa",
  "postalCode": "12345",
  "buildingNumber": "1234",
  "additionalInfo": "Apartment 5A"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "addr_123",
    "customerId": "cust_123",
    "type": "HOME",
    "street": "King Fahd Road",
    "city": "Riyadh"
  },
  "error": null
}
```

---

### GET /api/v1/customers/:id/addresses

**Permission**: `CUSTOMERS_VIEW` (Cashier+)  
**Description**: Returns all addresses for customer

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "addr_123",
      "type": "HOME",
      "street": "King Fahd Road",
      "city": "Riyadh",
      "isDefault": true
    },
    {
      "id": "addr_124",
      "type": "WORK",
      "street": "Olaya Street",
      "city": "Riyadh",
      "isDefault": false
    }
  ],
  "error": null
}
```

---

## Loyalty Endpoints

### GET /api/v1/customers/tiers

**Permission**: `CUSTOMERS_LOYALTY_VIEW` (Cashier+)  
**Description**: Returns all loyalty tier configurations

**Success Response (200)**:

```json
{
  "result": [
    {
      "name": "BRONZE",
      "minPoints": 0,
      "multiplier": 1.0
    },
    {
      "name": "SILVER",
      "minPoints": 1000,
      "multiplier": 1.2
    },
    {
      "name": "GOLD",
      "minPoints": 5000,
      "multiplier": 1.5
    }
  ],
  "error": null
}
```

---

### POST /api/v1/customers/tiers

**Permission**: `SETTINGS_UPDATE` (Admin only)  
**Description**: Creates a new loyalty tier

**Request**:

```json
{
  "name": "PLATINUM",
  "minPoints": 10000,
  "multiplier": 2.0,
  "benefits": "Free delivery, priority support"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "tier_4",
    "name": "PLATINUM",
    "minPoints": 10000,
    "multiplier": 2.0
  },
  "error": null
}
```

---

### PUT /api/v1/customers/tiers/:id

**Permission**: `SETTINGS_UPDATE` (Admin only)  
**Description**: Updates loyalty tier configuration

**Request**:

```json
{
  "multiplier": 2.5,
  "benefits": "Updated benefits"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "tier_4",
    "name": "PLATINUM",
    "multiplier": 2.5
  },
  "error": null
}
```

---

### POST /api/v1/customers/:id/loyalty/redeem

**Permission**: `CUSTOMERS_LOYALTY_ADJUST` (Manager only)  
**Description**: Redeems customer loyalty points

**Request**:

```json
{
  "points": 100
}
```

**Success Response (200)**:

```json
{
  "result": {
    "remainingPoints": 150,
    "redeemedPoints": 100,
    "redeemedValue": 10.0
  },
  "error": null
}
```

---

## Notes

- Customer code is auto-generated in format: `CUS{YYYYMMDD}{sequence}`
- Phone number must be unique per customer
- Loyalty points earned automatically on purchases (configured per product/category)
- Tier progression is automatic based on points threshold
- Address types: HOME, WORK, OTHER
- Points redemption value configurable in settings (default: 10 points = 1 SAR)
