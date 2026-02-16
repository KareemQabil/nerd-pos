# Kitchen Module API

Kitchen Display System (KDS) for ticket and station management.

---

## Ticket Endpoints

### GET /api/v1/kitchen/stations/:stationId/tickets

**Permission**: `KITCHEN_VIEW` (Kitchen staff)  
**Description**: Returns active kitchen tickets for station

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "tkt_123",
      "orderId": "ord_456",
      "orderNumber": "ORD-001",
      "status": "PENDING",
      "items": [],
      "createdAt": "2026-01-23T12:00:00Z"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/kitchen/tickets/:id

**Permission**: `KITCHEN_VIEW` (Kitchen staff)  
**Description**: Returns ticket details with items

**Success Response (200)**:

```json
{
  "result": {
    "id": "tkt_123",
    "orderNumber": "ORD-001",
    "status": "IN_PROGRESS",
    "items": [
      {
        "id": "item_1",
        "name": "Burger",
        "quantity": 2,
        "status": "PENDING"
      }
    ]
  },
  "error": null
}
```

---

### GET /api/v1/kitchen/orders/:orderId/tickets

**Permission**: `KITCHEN_VIEW` (Kitchen staff)  
**Description**: Returns all kitchen tickets for order

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "tkt_123",
      "station": "GRILL",
      "status": "COMPLETED"
    },
    {
      "id": "tkt_124",
      "station": "SALAD",
      "status": "PENDING"
    }
  ],
  "error": null
}
```

---

### POST /api/v1/kitchen/tickets/:id/start

**Permission**: `KITCHEN_UPDATE` (Kitchen staff)  
**Description**: Marks ticket as IN_PROGRESS

**Success Response (200)**:

```json
{
  "result": {
    "id": "tkt_123",
    "status": "IN_PROGRESS",
    "startedAt": "2026-01-23T12:05:00Z"
  },
  "error": null
}
```

---

### POST /api/v1/kitchen/tickets/:id/ready

**Permission**: `KITCHEN_UPDATE` (Kitchen staff)  
**Description**: Marks ticket as READY for serving

**Success Response (200)**:

```json
{
  "result": {
    "id": "tkt_123",
    "status": "READY",
    "readyAt": "2026-01-23T12:10:00Z"
  },
  "error": null
}
```

---

### POST /api/v1/kitchen/tickets/:id/complete

**Permission**: `KITCHEN_UPDATE` (Kitchen staff)  
**Description**: Marks ticket as COMPLETED

**Success Response (200)**:

```json
{
  "result": {
    "id": "tkt_123",
    "status": "COMPLETED",
    "completedAt": "2026-01-23T12:15:00Z"
  },
  "error": null
}
```

---

### POST /api/v1/kitchen/tickets/:ticketId/items/:itemId/bump

**Permission**: `KITCHEN_UPDATE` (Kitchen staff)  
**Description**: Marks individual ticket item as completed

**Success Response (200)**:

```json
{
  "result": {
    "ticketId": "tkt_123",
    "itemId": "item_1",
    "status": "COMPLETED"
  },
  "error": null
}
```

---

## Station Endpoints

### GET /api/v1/kitchen/stations

**Permission**: `KITCHEN_VIEW` (Kitchen staff)  
**Description**: Returns all kitchen stations

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "st_1",
      "name": "Grill Station",
      "activeTickets": 3,
      "isOnline": true
    }
  ],
  "error": null
}
```

---

### POST /api/v1/kitchen/stations

**Permission**: `KITCHEN_STATION_CREATE` (Admin only)  
**Description**: Creates new kitchen station

**Request**:

```json
{
  "name": "Pizza Station",
  "displayName": "Pizzas"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "st_2",
    "name": "Pizza Station",
    "isOnline": true
  },
  "error": null
}
```

---

### PUT /api/v1/kitchen/stations/:id

**Permission**: `KITCHEN_STATION_UPDATE` (Manager+)  
**Description**: Updates kitchen station

**Request**:

```json
{
  "isOnline": false
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "st_1",
    "isOnline": false
  },
  "error": null
}
```

---

## Notes

- Ticket statuses: PENDING, IN_PROGRESS, READY, COMPLETED
- Tickets automatically created when orders are confirmed
- Items routed to stations based on product category configuration
- "Bump" removes individual items from display once prepared
- Station online/offline status controls ticket routing
