# Sessions Module API

Cashier register session management and tracking.

---

## Session Management Endpoints

### POST /api/v1/sessions/open

**Permission**: `SESSIONS_OPEN` (Cashier+)  
**Description**: Opens a new cashier session with opening balance

**Request**:

```json
{
  "openingBalance": 500.0,
  "notes": "Morning shift"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "session-001",
    "userId": "user-cashier-1",
    "openedAt": "2026-01-23T09:00:00.000Z",
    "openingBalance": 500.0,
    "status": "OPEN"
  },
  "error": null
}
```

---

### POST /api/v1/sessions/close

**Permission**: `SESSIONS_CLOSE` (Manager only)  
**Description**: Closes session with closing balance and calculates variance

**Request**:

```json
{
  "sessionId": "sess_123",
  "closingBalance": 1450.0,
  "closedBy": "usr_manager"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "session-001",
    "closedAt": "2026-01-23T22:00:00.000Z",
    "openingBalance": 500.0,
    "closingBalance": 1450.0,
    "expectedBalance": 1500.0,
    "variance": -50.0,
    "totalSales": 1000.0,
    "status": "CLOSED"
  },
  "error": null
}
```

---

### GET /api/v1/sessions/current/:userId

**Permission**: `SESSIONS_VIEW` (Cashier+)  
**Description**: Returns active session for user

**Success Response (200)**:

```json
{
  "result": {
    "id": "sess_123",
    "userId": "usr_123",
    "startTime": "2026-01-23T09:00:00Z",
    "status": "OPEN"
  },
  "error": null
}
```

---

### GET /api/v1/sessions/:id

**Permission**: `SESSIONS_VIEW` (Cashier+)  
**Description**: Returns session details by ID

**Success Response (200)**:

```json
{
  "result": {
    "id": "sess_123",
    "userId": "usr_123",
    "openedAt": "2026-01-23T09:00:00Z",
    "openingBalance": 500.0,
    "status": "OPEN"
  },
  "error": null
}
```

---

### GET /api/v1/sessions/:id/details

**Permission**: `SESSIONS_VIEW_ALL` (Manager+)  
**Description**: Returns session with orders and payments

**Success Response (200)**:

```json
{
  "result": {
    "id": "sess_123",
    "orders": [],
    "payments": [],
    "totalSales": 1500.0,
    "totalPayments": 1500.0
  },
  "error": null
}
```

---

### GET /api/v1/sessions/user/:userId

**Permission**: `SESSIONS_VIEW_ALL` (Manager+)  
**Description**: Returns session history for user

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "sess_123",
      "openedAt": "2026-01-23T09:00:00Z",
      "closedAt": "2026-01-23T22:00:00Z",
      "totalSales": 1500.0
    }
  ],
  "error": null
}
```

---

## Notes

- Session statuses: OPEN, CLOSED
- Only one active session allowed per user at a time
- Opening sessions requires opening balance (cash float)
- Closing sessions requires Manager approval
- Variance = Closing Balance - (Opening Balance + Cash Sales)
- Negative variance indicates shortage, positive indicates overage
- All payments during session are tracked for reconciliation
- Sessions are required for cashier accountability and end-of-day reporting
