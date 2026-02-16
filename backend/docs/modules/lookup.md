# Lookup Module API

Reference data endpoints for dropdowns and selectors.

---

## Entity Lookup Endpoints

### GET /api/v1/lookup/categories

**Permission**: Authenticated users  
**Description**: Returns all active categories for dropdown

**Query Parameters**:

- `search` (optional): Search term

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "cat_123",
      "nameEn": "Hot Beverages",
      "nameAr": "مشروبات ساخنة"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/products

**Permission**: Authenticated users  
**Description**: Returns products for dropdown

**Query Parameters**:

- `parentId` (optional): Category ID to filter by
- `search` (optional): Search term

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "prod_456",
      "nameEn": "Latte",
      "nameAr": "لاتيه"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/tables

**Permission**: Authenticated users  
**Description**: Returns tables for dropdown

**Query Parameters**:

- `parentId` (optional): Floor ID to filter by

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "tbl_789",
      "nameEn": "Table 1",
      "nameAr": "طاولة 1"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/floors

**Permission**: Authenticated users  
**Description**: Returns floors for dropdown

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "flr_101",
      "nameEn": "Ground Floor",
      "nameAr": "الطابق الأرضي"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/users

**Permission**: Authenticated users  
**Description**: Returns users for dropdown

**Query Parameters**:

- `search` (optional): Search term (filter by role, e.g., CASHIER)

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "usr_123",
      "nameEn": "Ahmed Ali",
      "nameAr": "أحمد علي"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/customers

**Permission**: Authenticated users  
**Description**: Search customers by phone or name

**Query Parameters**:

- `search` (optional): Search term

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "cust_999",
      "nameEn": "Mohamed Hassan",
      "nameAr": "محمد حسن"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/kitchen-stations

**Permission**: Authenticated users  
**Description**: Returns kitchen stations for dropdown

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "st_1",
      "nameEn": "Grill Station",
      "nameAr": "محطة الشواء"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/modifier-groups

**Permission**: Authenticated users  
**Description**: Returns modifier groups for dropdown

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "mg_1",
      "nameEn": "Size",
      "nameAr": "الحجم"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/warehouses

**Permission**: Authenticated users  
**Description**: Returns warehouses for dropdown

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "wh_1",
      "nameEn": "Main Warehouse",
      "nameAr": "المخزن الرئيسي"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/delivery-zones

**Permission**: Authenticated users  
**Description**: Returns delivery zones for dropdown

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "zone_1",
      "nameEn": "Downtown",
      "nameAr": "وسط المدينة"
    }
  ],
  "error": null
}
```

---

## Static Enum Lookup Endpoints

### GET /api/v1/lookup/payment-methods

**Permission**: Authenticated users  
**Description**: Returns available payment methods

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "CASH",
      "nameEn": "Cash",
      "nameAr": "نقدي"
    },
    {
      "id": "CARD",
      "nameEn": "Card",
      "nameAr": "بطاقة"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/order-types

**Permission**: Authenticated users  
**Description**: Returns available order types

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "DINE_IN",
      "nameEn": "Dine In",
      "nameAr": "داخل المطعم"
    },
    {
      "id": "TAKEAWAY",
      "nameEn": "Takeaway",
      "nameAr": "سفري"
    },
    {
      "id": "DELIVERY",
      "nameEn": "Delivery",
      "nameAr": "توصيل"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/order-statuses

**Permission**: Authenticated users  
**Description**: Returns all order statuses

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "PENDING",
      "nameEn": "Pending",
      "nameAr": "قيد الانتظار"
    },
    {
      "id": "CONFIRMED",
      "nameEn": "Confirmed",
      "nameAr": "مؤكد"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/table-statuses

**Permission**: Authenticated users  
**Description**: Returns all table statuses

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "AVAILABLE",
      "nameEn": "Available",
      "nameAr": "متاح"
    },
    {
      "id": "OCCUPIED",
      "nameEn": "Occupied",
      "nameAr": "مشغول"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/lookup/discount-types

**Permission**: Authenticated users  
**Description**: Returns discount types

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "PERCENTAGE",
      "nameEn": "Percentage",
      "nameAr": "نسبة مئوية"
    },
    {
      "id": "FIXED_AMOUNT",
      "nameEn": "Fixed Amount",
      "nameAr": "مبلغ ثابت"
    }
  ],
  "error": null
}
```

---

## Notes

- All lookup endpoints return standardized format: `{ id, nameEn, nameAr }`
- Entity lookups filter only active records
- Search parameter supports fuzzy matching
- ParentId parameter enables cascading dropdowns (e.g., categories → products)
- Static enums are bilingual and hardcoded in the system
- Lookups are cached for performance
