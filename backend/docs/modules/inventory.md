# Inventory Module API

Stock management, warehouses, and recipe management.

---

## Warehouse Endpoints

### POST /api/v1/inventory/warehouses

**Permission**: `SETTINGS_UPDATE` (Admin only)  
**Description**: Creates a new warehouse location

**Request**:

```json
{
  "name": "Main Warehouse",
  "code": "MWH-01",
  "address": "Riyadh Industrial City",
  "isDefault": true
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "wh_123",
    "name": "Main Warehouse",
    "code": "MWH-01",
    "address": "Riyadh Industrial City",
    "isActive": true
  },
  "error": null
}
```

---

### GET /api/v1/inventory/warehouses

**Permission**: `INVENTORY_VIEW` (All roles)  
**Description**: Returns list of all warehouses

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "wh_123",
      "name": "Main Warehouse",
      "code": "MWH-01",
      "isDefault": true
    }
  ],
  "error": null
}
```

---

### GET /api/v1/inventory/warehouses/default

**Permission**: `INVENTORY_VIEW` (All roles)  
**Description**: Returns the default warehouse

**Success Response (200)**:

```json
{
  "result": {
    "id": "wh_123",
    "name": "Main Warehouse",
    "isDefault": true
  },
  "error": null
}
```

---

## Stock Management Endpoints

### POST /api/v1/inventory/receive

**Permission**: `INVENTORY_RECEIVE` (Cashier+)  
**Description**: Records stock received from supplier

**Request**:

```json
{
  "warehouseId": "warehouse-main-1",
  "supplierId": "supplier-001",
  "items": [
    {
      "productId": "prod-latte-001",
      "quantity": 100,
      "unitCost": 25.5,
      "batchNumber": "BATCH-2025-001",
      "expiryDate": "2025-12-31"
    }
  ]
}
```

**Success Response (201)**:

```json
{
  "result": {
    "productId": "prod-latte-001",
    "productNameEn": "Latte",
    "warehouseId": "warehouse-main-1",
    "quantityOnHand": 85,
    "quantityReserved": 5,
    "availableForSale": 80,
    "unitCost": 25.5,
    "value": 2167.5
  },
  "error": null
}
```

---

### POST /api/v1/inventory/adjust

**Permission**: `INVENTORY_ADJUST` (Manager only)  
**Description**: Adjusts stock quantity with reason

**Request**:

```json
{
  "productId": "prod-123",
  "warehouseId": "wh-123",
  "quantity": -5,
  "reason": "DAMAGED"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "mv_124",
    "productId": "prod_123",
    "warehouseId": "wh_123",
    "quantity": -5,
    "type": "OUT",
    "reason": "DAMAGED"
  },
  "error": null
}
```

---

### POST /api/v1/inventory/transfer

**Permission**: `INVENTORY_TRANSFER` (Cashier+)  
**Description**: Transfers stock between warehouses

**Request**:

```json
{
  "productId": "prod-123",
  "fromWarehouseId": "wh-1",
  "toWarehouseId": "wh-2",
  "quantity": 50
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "tx_123",
    "productId": "prod_123",
    "fromWarehouseId": "wh_1",
    "toWarehouseId": "wh_2",
    "quantity": 50
  },
  "error": null
}
```

---

### GET /api/v1/inventory/stock/:productId/:warehouseId

**Permission**: `INVENTORY_VIEW` (All roles)  
**Description**: Returns stock level for product in warehouse

**Success Response (200)**:

```json
{
  "result": {
    "productId": "prod_123",
    "warehouseId": "wh_123",
    "quantity": 150,
    "reserved": 10,
    "available": 140
  },
  "error": null
}
```

---

### GET /api/v1/inventory/available/:productId/:warehouseId

**Permission**: `INVENTORY_VIEW` (All roles)  
**Description**: Returns available (unreserved) stock

**Success Response (200)**:

```json
{
  "result": {
    "productId": "prod_123",
    "warehouseId": "wh_123",
    "availableQuantity": 140
  },
  "error": null
}
```

---

### GET /api/v1/inventory/low-stock

**Permission**: `INVENTORY_VIEW` (All roles)  
**Description**: Returns products below reorder point

**Query Parameters**:

- `warehouseId` (optional): Filter by warehouse

**Success Response (200)**:

```json
{
  "result": [
    {
      "productId": "prod_123",
      "productName": "Burger Buns",
      "quantity": 10,
      "reorderPoint": 20,
      "warehouseId": "wh_1"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/inventory/expiring

**Permission**: `INVENTORY_VIEW` (All roles)  
**Description**: Returns batches expiring within specified days

**Query Parameters**:

- `days` (optional): Days until expiry (default: 30)

**Success Response (200)**:

```json
{
  "result": [
    {
      "batchId": "batch_123",
      "productId": "prod_456",
      "expiryDate": "2026-02-01",
      "quantity": 50
    }
  ],
  "error": null
}
```

---

### GET /api/v1/inventory/movements/:productId

**Permission**: `INVENTORY_VIEW` (All roles)  
**Description**: Returns stock movement history for product

**Query Parameters**:

- `warehouseId` (optional): Filter by warehouse

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "mv_1",
      "productId": "prod_123",
      "type": "IN",
      "quantity": 100,
      "date": "2026-01-20T10:00:00Z"
    }
  ],
  "error": null
}
```

---

## Recipe Endpoints

### POST /api/v1/inventory/recipes

**Permission**: `INVENTORY_RECIPE_MANAGE` (Manager+)  
**Description**: Creates a new recipe for composite product

**Request**:

```json
{
  "productId": "prod-999",
  "name": "Cheeseburger Recipe",
  "yield": 1
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "rcp_123",
    "productId": "prod_999",
    "name": "Cheeseburger Recipe",
    "yield": 1,
    "ingredients": []
  },
  "error": null
}
```

---

### GET /api/v1/inventory/recipes/:productId

**Permission**: `INVENTORY_RECIPE_VIEW` (All roles)  
**Description**: Returns recipe and ingredients for product

**Success Response (200)**:

```json
{
  "result": {
    "id": "rcp_123",
    "productId": "prod_999",
    "ingredients": [
      {
        "productId": "prod_bun",
        "quantity": 1,
        "unit": "PCS"
      },
      {
        "productId": "prod_meat",
        "quantity": 0.15,
        "unit": "KG"
      }
    ]
  },
  "error": null
}
```

---

### POST /api/v1/inventory/recipes/ingredients

**Permission**: `INVENTORY_RECIPE_MANAGE` (Manager+)  
**Description**: Adds ingredient to existing recipe

**Request**:

```json
{
  "recipeId": "rcp_123",
  "productId": "prod_cheese",
  "quantity": 0.05,
  "unit": "KG"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "ing_1",
    "recipeId": "rcp_123",
    "productId": "prod_cheese",
    "quantity": 0.05,
    "unit": "KG"
  },
  "error": null
}
```

---

### GET /api/v1/inventory/recipes/:productId/cost

**Permission**: `INVENTORY_RECIPE_VIEW` (All roles)  
**Description**: Calculates total recipe cost per unit

**Success Response (200)**:

```json
{
  "result": {
    "productId": "prod_999",
    "costPerUnit": "15.50"
  },
  "error": null
}
```

---

## Notes

- Warehouse code must be unique
- Stock adjustments require a reason (DAMAGED, EXPIRED, STOLEN, etc.)
- Recipes enable automatic ingredient deduction when composite products are sold
- Batch tracking supports expiry date management
- Low stock alerts based on configurable reorder points
