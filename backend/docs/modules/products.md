# Products Module API

Product catalog management including products, categories, and modifiers.

---

## Product Endpoints

### POST /api/v1/products

**Permission**: `PRODUCTS_CREATE` (Manager+)  
**Description**: Creates a new product

**Request**:

```json
{
  "sku": "LATTE-001",
  "nameEn": "Latte",
  "nameAr": "لاتيه",
  "price": 15.0,
  "cost": 5.0,
  "categoryId": "cat-hot-drinks-001",
  "trackInventory": true,
  "isActive": true
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "prod-latte-001",
    "sku": "LATTE-001",
    "nameEn": "Latte",
    "nameAr": "لاتيه",
    "price": 15.0,
    "cost": 5.0,
    "categoryId": "cat-hot-drinks-001",
    "currentStock": 0,
    "isActive": true
  },
  "error": null
}
```

---

### GET /api/v1/products

**Permission**: `PRODUCTS_VIEW` (All roles)  
**Description**: Returns paginated list of products

**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Success Response (200)**:

```json
{
  "result": {
    "data": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "nameEn": "Cheeseburger",
        "price": 25.0
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10
  },
  "error": null
}
```

---

### GET /api/v1/products/search

**Permission**: `PRODUCTS_VIEW` (All roles)  
**Description**: Searches products by name or SKU

**Query Parameters**:

- `q` (optional): Search query

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "prod-123",
      "nameEn": "Latte",
      "nameAr": "لاتيه",
      "price": 15.0
    }
  ],
  "error": null
}
```

---

### GET /api/v1/products/:id

**Permission**: `PRODUCTS_VIEW` (All roles)  
**Description**: Returns product details by ID

**Success Response (200)**:

```json
{
  "result": {
    "id": "prod-123",
    "sku": "LATTE-001",
    "nameEn": "Latte",
    "nameAr": "لاتيه",
    "price": 15.0,
    "cost": 5.0,
    "isActive": true
  },
  "error": null
}
```

---

### GET /api/v1/products/sku/:sku

**Permission**: `PRODUCTS_VIEW` (All roles)  
**Description**: Returns product details by SKU

**Success Response (200)**:

```json
{
  "result": {
    "id": "prod-123",
    "sku": "LATTE-001",
    "nameEn": "Latte",
    "price": 15.0
  },
  "error": null
}
```

---

### PUT /api/v1/products/:id

**Permission**: `PRODUCTS_UPDATE` (Manager+)  
**Description**: Updates product information

**Request**:

```json
{
  "price": 16.0,
  "isActive": true
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "prod-123",
    "price": 16.0,
    "isActive": true
  },
  "error": null
}
```

---

### PUT /api/v1/products/:id/deactivate

**Permission**: `PRODUCTS_UPDATE` (Manager+)  
**Description**: Deactivates a product

**Success Response (200)**:

```json
{
  "result": {
    "id": "prod-123",
    "isActive": false
  },
  "error": null
}
```

---

### DELETE /api/v1/products/:id

**Permission**: `PRODUCTS_DELETE` (Admin only)  
**Description**: Permanently deletes a product

**Success Response (200)**:

```json
{
  "result": {
    "message": "Product deleted"
  },
  "error": null
}
```

---

### GET /api/v1/products/:id/modifier-groups

**Permission**: `MODIFIERS_VIEW` (All roles)  
**Description**: Returns modifier groups assigned to product

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "mg-123",
      "nameEn": "Size",
      "nameAr": "الحجم",
      "required": true
    }
  ],
  "error": null
}
```

---

### POST /api/v1/products/:id/modifier-groups

**Permission**: `MODIFIERS_UPDATE` (Manager+)  
**Description**: Assigns modifier group to product

**Request**:

```json
{
  "groupId": "mg-123"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "message": "Modifier group assigned"
  },
  "error": null
}
```

---

### DELETE /api/v1/products/:productId/modifier-groups/:groupId

**Permission**: `MODIFIERS_UPDATE` (Manager+)  
**Description**: Removes modifier group from product

**Success Response (200)**:

```json
{
  "result": {
    "message": "Modifier group removed"
  },
  "error": null
}
```

---

## Category Endpoints

### POST /api/v1/categories

**Permission**: `CATEGORIES_CREATE` (Manager+)  
**Description**: Creates a new category

**Request**:

```json
{
  "nameEn": "Hot Beverages",
  "nameAr": "مشروبات ساخنة",
  "parentId": null,
  "sortOrder": 1,
  "isActive": true
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "cat-hot-drinks-001",
    "nameEn": "Hot Beverages",
    "nameAr": "مشروبات ساخنة",
    "sortOrder": 1,
    "isActive": true
  },
  "error": null
}
```

---

### GET /api/v1/categories

**Permission**: `CATEGORIES_VIEW` (All roles)  
**Description**: Returns paginated list of categories

**Success Response (200)**:

```json
{
  "result": {
    "data": [
      {
        "id": "cat-123",
        "nameEn": "Hot Beverages",
        "nameAr": "مشروبات ساخنة"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20
  },
  "error": null
}
```

---

### GET /api/v1/categories/root

**Permission**: `CATEGORIES_VIEW` (All roles)  
**Description**: Returns root (top-level) categories

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "cat-123",
      "nameEn": "Hot Beverages",
      "parentId": null
    }
  ],
  "error": null
}
```

---

### GET /api/v1/categories/:id

**Permission**: `CATEGORIES_VIEW` (All roles)  
**Description**: Returns category details by ID

**Success Response (200)**:

```json
{
  "result": {
    "id": "cat-123",
    "nameEn": "Hot Beverages",
    "nameAr": "مشروبات ساخنة",
    "isActive": true
  },
  "error": null
}
```

---

### GET /api/v1/categories/:id/products

**Permission**: `PRODUCTS_VIEW` (All roles)  
**Description**: Returns all products in category

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "prod-123",
      "nameEn": "Latte",
      "price": 15.0
    }
  ],
  "error": null
}
```

---

### PUT /api/v1/categories/:id

**Permission**: `CATEGORIES_UPDATE` (Manager+)  
**Description**: Updates category information

**Request**:

```json
{
  "nameEn": "Hot Drinks",
  "sortOrder": 2
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "cat-123",
    "nameEn": "Hot Drinks",
    "sortOrder": 2
  },
  "error": null
}
```

---

### DELETE /api/v1/categories/:id

**Permission**: `CATEGORIES_DELETE` (Admin only)  
**Description**: Permanently deletes a category

**Success Response (200)**:

```json
{
  "result": {
    "message": "Category deleted"
  },
  "error": null
}
```

---

## Modifier Group Endpoints

### POST /api/v1/modifier-groups

**Permission**: `MODIFIERS_CREATE` (Manager+)  
**Description**: Creates a new modifier group

**Request**:

```json
{
  "nameEn": "Size",
  "nameAr": "الحجم",
  "required": true,
  "minSelections": 1,
  "maxSelections": 1
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "mg-123",
    "nameEn": "Size",
    "nameAr": "الحجم",
    "required": true
  },
  "error": null
}
```

---

### GET /api/v1/modifier-groups

**Permission**: `MODIFIERS_VIEW` (All roles)  
**Description**: Returns paginated list of modifier groups

**Success Response (200)**:

```json
{
  "result": {
    "data": [
      {
        "id": "mg-123",
        "nameEn": "Size",
        "required": true
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 20
  },
  "error": null
}
```

---

### GET /api/v1/modifier-groups/:id

**Permission**: `MODIFIERS_VIEW` (All roles)  
**Description**: Returns modifier group details with options

**Success Response (200)**:

```json
{
  "result": {
    "id": "mg-123",
    "nameEn": "Size",
    "nameAr": "الحجم",
    "options": [
      {
        "id": "mo-1",
        "nameEn": "Large",
        "priceModifier": 5.0
      }
    ]
  },
  "error": null
}
```

---

### PUT /api/v1/modifier-groups/:id

**Permission**: `MODIFIERS_UPDATE` (Manager+)  
**Description**: Updates modifier group

**Request**:

```json
{
  "required": false,
  "maxSelections": 3
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "mg-123",
    "required": false,
    "maxSelections": 3
  },
  "error": null
}
```

---

### DELETE /api/v1/modifier-groups/:id

**Permission**: `MODIFIERS_DELETE` (Admin only)  
**Description**: Permanently deletes a modifier group

**Success Response (200)**:

```json
{
  "result": {
    "message": "Modifier group deleted"
  },
  "error": null
}
```

---

### POST /api/v1/modifier-groups/:id/options

**Permission**: `MODIFIERS_CREATE` (Manager+)  
**Description**: Adds an option to modifier group

**Request**:

```json
{
  "nameEn": "Large",
  "nameAr": "كبير",
  "priceModifier": 5.0
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "mo-1",
    "groupId": "mg-123",
    "nameEn": "Large",
    "priceModifier": 5.0
  },
  "error": null
}
```

---

### PUT /api/v1/modifier-groups/options/:id

**Permission**: `MODIFIERS_UPDATE` (Manager+)  
**Description**: Updates modifier option

**Request**:

```json
{
  "priceModifier": 6.0
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "mo-1",
    "priceModifier": 6.0
  },
  "error": null
}
```

---

### DELETE /api/v1/modifier-groups/options/:id

**Permission**: `MODIFIERS_DELETE` (Admin only)  
**Description**: Permanently deletes a modifier option

**Success Response (200)**:

```json
{
  "result": {
    "message": "Modifier option deleted"
  },
  "error": null
}
```

---

## Notes

- Products module includes 3 controllers: Products, Categories, and Modifier Groups
- SKU must be unique across all products
- Categories support hierarchical structure with `parentId`
- Modifiers allow customization of products (e.g., Size, Toppings)
- `trackInventory` determines if product quantity is tracked
