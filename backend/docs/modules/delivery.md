# Delivery Module API

Delivery order management, zones, and driver tracking.

---

## Delivery Endpoints

### GET /api/v1/delivery/active

**Permission**: `DELIVERY_VIEW` (Cashier+)  
**Description**: Returns deliveries currently in progress

**Query Parameters**:

- `driverId` (optional): Filter by driver UUID

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "del_123",
      "orderId": "ord_456",
      "status": "OUT_FOR_DELIVERY",
      "driverId": "drv_789",
      "address": "123 Main St, Riyadh",
      "estimatedTime": "25 mins"
    }
  ],
  "error": null
}
```

---

### POST /api/v1/delivery

**Permission**: `DELIVERY_CREATE` (Cashier+)  
**Description**: Creates a new delivery order

**Request**:

```json
{
  "orderId": "ord_457",
  "addressId": "addr_123",
  "district": "Al Malqa"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "del_124",
    "orderId": "ord_457",
    "status": "PENDING",
    "deliveryFee": 15.0
  },
  "error": null
}
```

---

### POST /api/v1/delivery/:id/assign

**Permission**: `DELIVERY_ASSIGN` (Manager+)  
**Description**: Assigns a driver to delivery

**Request**:

```json
{
  "driverId": "drv_789"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "deliveryId": "del_124",
    "driverId": "drv_789",
    "status": "ASSIGNED"
  },
  "error": null
}
```

---

### PUT /api/v1/delivery/:id/status

**Permission**: `DELIVERY_UPDATE` (Cashier+)  
**Description**: Updates delivery status

**Request**:

```json
{
  "status": "PICKED_UP",
  "driverId": "drv_789"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "del_124",
    "status": "PICKED_UP",
    "timestamp": "2026-01-23T12:15:00Z"
  },
  "error": null
}
```

---

## Zone Endpoints

### GET /api/v1/delivery/zones

**Permission**: `DELIVERY_VIEW` (Cashier+)  
**Description**: Returns all delivery zones with fees

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "zone_1",
      "name": "Downtown",
      "fee": 10.0,
      "active": true
    }
  ],
  "error": null
}
```

---

### POST /api/v1/delivery/zones

**Permission**: `DELIVERY_ZONE_MANAGE` (Admin only)  
**Description**: Creates a new delivery zone

**Request**:

```json
{
  "name": "Suburbs",
  "districts": ["Al Malqa", "Al Nakheel"],
  "fee": 20.0
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "zone_2",
    "name": "Suburbs",
    "fee": 20.0,
    "active": true
  },
  "error": null
}
```

---

## Driver Endpoints

### GET /api/v1/delivery/drivers

**Permission**: `DELIVERY_VIEW` (Cashier+)  
**Description**: Returns all delivery drivers

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "drv_789",
      "name": "John Doe",
      "phone": "+966501234567",
      "status": "AVAILABLE",
      "currentLocation": {
        "lat": 24.7136,
        "lng": 46.6753
      }
    }
  ],
  "error": null
}
```

---

### GET /api/v1/delivery/drivers/available

**Permission**: `DELIVERY_VIEW` (Cashier+)  
**Description**: Returns drivers not currently on delivery

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "drv_789",
      "name": "John Doe",
      "status": "AVAILABLE"
    }
  ],
  "error": null
}
```

---

### POST /api/v1/delivery/drivers

**Permission**: `DELIVERY_PARTNER_MANAGE` (Admin only)  
**Description**: Registers a new delivery driver

**Request**:

```json
{
  "name": "Ahmed Ali",
  "phone": "+966501234567",
  "vehicleType": "MOTORCYCLE",
  "licenseNumber": "ABC123"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "drv_790",
    "name": "Ahmed Ali",
    "phone": "+966501234567",
    "status": "AVAILABLE"
  },
  "error": null
}
```

---

### PUT /api/v1/delivery/drivers/:id/location

**Permission**: `DELIVERY_UPDATE` (Cashier+)  
**Description**: Updates driver GPS coordinates

**Request**:

```json
{
  "latitude": 24.7136,
  "longitude": 46.6753
}
```

**Success Response (200)**:

```json
{
  "result": {
    "driverId": "drv_789",
    "location": {
      "lat": 24.7136,
      "lng": 46.6753
    },
    "updatedAt": "2026-01-23T12:20:00Z"
  },
  "error": null
}
```

---

## Notes

- Delivery statuses: PENDING, ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
- Driver statuses: AVAILABLE, BUSY, OFFLINE
- Zones define delivery areas with specific fees per district
- Real-time driver location tracking for customer visibility
- Estimated delivery time calculated based on zone and traffic
