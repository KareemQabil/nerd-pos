# Tables Module API

Table and floor management for dine-in service.

---

## Floor Management Endpoints

### GET /api/v1/tables/floors

**Permission**: `TABLES_VIEW` (Cashier+)  
**Description**: Returns all floor/section layouts

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "floor_1",
      "name": "Main Hall",
      "tableCount": 10,
      "activeTables": 5
    }
  ],
  "error": null
}
```

---

### GET /api/v1/tables/floors/:id

**Permission**: `TABLES_VIEW` (Cashier+)  
**Description**: Returns floor layout with all tables

**Success Response (200)**:

```json
{
  "result": {
    "id": "floor_1",
    "name": "Main Hall",
    "tables": [
      {
        "id": "tbl_1",
        "number": "T1",
        "seats": 4,
        "status": "AVAILABLE",
        "x": 10,
        "y": 10
      }
    ]
  },
  "error": null
}
```

---

### POST /api/v1/tables/floors

**Permission**: `TABLES_FLOOR_MANAGE` (Admin only)  
**Description**: Creates new floor/section

**Request**:

```json
{
  "name": "Outdoor Terrace",
  "capacity": 20
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "floor_2",
    "name": "Outdoor Terrace",
    "tableCount": 0
  },
  "error": null
}
```

---

### PUT /api/v1/tables/floors/:id

**Permission**: `TABLES_FLOOR_MANAGE` (Admin only)  
**Description**: Updates floor details

**Request**:

```json
{
  "name": "Main Hall - Updated"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "floor_1",
    "name": "Main Hall - Updated"
  },
  "error": null
}
```

---

## Table Management Endpoints

### POST /api/v1/tables

**Permission**: `TABLES_CREATE` (Manager+)  
**Description**: Creates new table

**Request**:

```json
{
  "floorId": "floor_1",
  "number": "T5",
  "seats": 4,
  "x": 50,
  "y": 50
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "tbl_5",
    "number": "T5",
    "seats": 4,
    "status": "AVAILABLE"
  },
  "error": null
}
```

---

### PUT /api/v1/tables/:id

**Permission**: `TABLES_UPDATE` (Manager+)  
**Description**: Updates table details

**Request**:

```json
{
  "seats": 6,
  "x": 60,
  "y": 60
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "tbl_1",
    "seats": 6
  },
  "error": null
}
```

---

### GET /api/v1/tables/floor/:floorId

**Permission**: `TABLES_VIEW` (Cashier+)  
**Description**: Returns all tables on specified floor

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "tbl_1",
      "number": "T1",
      "seats": 4,
      "status": "AVAILABLE"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/tables/available

**Permission**: `TABLES_VIEW` (Cashier+)  
**Description**: Returns tables with AVAILABLE status

**Query Parameters**:

- `floorId` (optional): Filter by floor UUID

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "tbl_1",
      "number": "T1",
      "seats": 4,
      "status": "AVAILABLE"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/tables/occupied

**Permission**: `TABLES_VIEW` (Cashier+)  
**Description**: Returns tables with OCCUPIED status

**Query Parameters**:

- `floorId` (optional): Filter by floor UUID

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "tbl_2",
      "number": "T2",
      "seats": 4,
      "status": "OCCUPIED",
      "currentOrder": "ord_123"
    }
  ],
  "error": null
}
```

---

## Table Operations Endpoints

### POST /api/v1/tables/:id/assign

**Permission**: `TABLES_ASSIGN` (Cashier+)  
**Description**: Associates an order with a table

**Request**:

```json
{
  "orderId": "ord_123"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "tableId": "tbl_1",
    "orderId": "ord_123",
    "status": "OCCUPIED"
  },
  "error": null
}
```

---

### POST /api/v1/tables/:id/release

**Permission**: `TABLES_ASSIGN` (Cashier+)  
**Description**: Releases table and marks for cleaning

**Success Response (200)**:

```json
{
  "result": {
    "id": "tbl_1",
    "status": "NEEDS_CLEANING"
  },
  "error": null
}
```

---

### POST /api/v1/tables/:id/clean

**Permission**: `TABLES_CLEAN` (Cashier+)  
**Description**: Marks table as cleaned and available

**Success Response (200)**:

```json
{
  "result": {
    "id": "tbl_1",
    "status": "AVAILABLE"
  },
  "error": null
}
```

---

### POST /api/v1/tables/transfer

**Permission**: `TABLES_TRANSFER` (Manager+)  
**Description**: Transfers order between tables

**Request**:

```json
{
  "fromTableId": "tbl_1",
  "toTableId": "tbl_5",
  "orderId": "ord_123"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "fromTable": "tbl_1",
    "toTable": "tbl_5",
    "orderId": "ord_123"
  },
  "error": null
}
```

---

### POST /api/v1/tables/:id/waiter

**Permission**: `TABLES_ASSIGN` (Cashier+)  
**Description**: Assigns waiter responsibility for table

**Request**:

```json
{
  "waiterId": "usr_123"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "tableId": "tbl_1",
    "waiterId": "usr_123"
  },
  "error": null
}
```

---

## Reservation Endpoints

### POST /api/v1/tables/reservations

**Permission**: `TABLES_RESERVATION_MANAGE` (Manager+)  
**Description**: Creates a table reservation

**Request**:

```json
{
  "tableId": "tbl_1",
  "customerName": "Ahmed Ali",
  "customerPhone": "0501234567",
  "date": "2026-01-24",
  "time": "19:00",
  "partySize": 4
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "res_123",
    "tableId": "tbl_1",
    "customerName": "Ahmed Ali",
    "date": "2026-01-24",
    "time": "19:00",
    "status": "CONFIRMED"
  },
  "error": null
}
```

---

### PUT /api/v1/tables/reservations/:id/status

**Permission**: `TABLES_RESERVATION_MANAGE` (Manager+)  
**Description**: Updates reservation status

**Request**:

```json
{
  "status": "CANCELLED"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "res_123",
    "status": "CANCELLED"
  },
  "error": null
}
```

---

### GET /api/v1/tables/reservations/today

**Permission**: `TABLES_RESERVATION_VIEW` (Cashier+)  
**Description**: Returns all reservations for today

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "res_123",
      "tableNumber": "T1",
      "customerName": "Ahmed Ali",
      "time": "19:00",
      "status": "CONFIRMED"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/tables/:tableId/reservations

**Permission**: `TABLES_RESERVATION_VIEW` (Cashier+)  
**Description**: Returns reservations for table on specific date

**Query Parameters**:

- `date` (required): Date in ISO format (YYYY-MM-DD)

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "res_123",
      "customerName": "Ahmed Ali",
      "time": "19:00",
      "partySize": 4
    }
  ],
  "error": null
}
```

---

## Notes

- Table statuses: AVAILABLE, OCCUPIED, RESERVED, NEEDS_CLEANING
- Reservation statuses: PENDING, CONFIRMED, SEATED, CANCELLED, NO_SHOW
- Floor layouts support visual positioning (x, y coordinates)
- Table transfer requires Manager+ permission
- Waiter assignment enables server-specific tracking
- Cleaning workflow: OCCUPIED → NEEDS_CLEANING → AVAILABLE
- Reservations prevent table assignment during reserved time slots
