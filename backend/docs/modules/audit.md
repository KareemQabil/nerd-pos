# Audit Module API

System audit logs and activity tracking.

---

## Endpoints

### GET /api/v1/audit/entity/:entity/:entityId

**Permission**: `AUDIT_VIEW` (Manager+)  
**Description**: Returns change history for a specific entity

**Parameters**:

- `entity`: Entity type (e.g., Order, Product)
- `entityId`: Entity UUID

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "audit_1",
      "entity": "Product",
      "entityId": "prod_123",
      "action": "UPDATE",
      "userId": "usr_456",
      "changes": {
        "price": {
          "old": 10,
          "new": 12
        }
      },
      "timestamp": "2026-01-23T12:00:00Z"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/audit/user/:userId

**Permission**: `AUDIT_VIEW` (Manager+)  
**Description**: Returns audit trail for specific user

**Parameters**:

- `userId`: User UUID

**Query Parameters**:

- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "audit_2",
      "entity": "Order",
      "entityId": "ord_999",
      "action": "CREATE",
      "userId": "usr_123",
      "changes": null,
      "timestamp": "2026-01-23T12:05:00Z"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/audit/module/:module

**Permission**: `AUDIT_VIEW` (Manager+)  
**Description**: Returns audit trail for specific module

**Parameters**:

- `module`: Module name (e.g., products, sales)

**Query Parameters**:

- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "audit_3",
      "entity": "Product",
      "entityId": "prod_123",
      "action": "DELETE",
      "userId": "usr_admin",
      "timestamp": "2026-01-23T12:10:00Z"
    }
  ],
  "error": null
}
```

---

## Notes

- All audit endpoints require Manager+ permissions
- Actions tracked: CREATE, UPDATE, DELETE
- Changes field shows old and new values for updates
- Timestamps in ISO 8601 format (UTC)
- Date queries use YYYY-MM-DD format
