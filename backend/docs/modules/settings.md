# Settings Module API

System configuration and administrative settings.

---

## Store Settings Endpoints

### GET /api/v1/settings/store

**Permission**: `SETTINGS_VIEW` (Manager+)  
**Description**: Returns store configuration

**Success Response (200)**:

```json
{
  "result": {
    "id": "store_1",
    "name": "NerdBased Coffee",
    "vatNumber": "300000000000003",
    "address": "Riyadh, KSA",
    "currency": "SAR"
  },
  "error": null
}
```

---

### PUT /api/v1/settings/store

**Permission**: `SETTINGS_UPDATE` (Admin only)  
**Description**: Updates store configuration

**Request**:

```json
{
  "name": "NerdBased Coffee Updated",
  "address": "New Address, Riyadh"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "store_1",
    "name": "NerdBased Coffee Updated",
    "vatNumber": "300000000000003"
  },
  "error": null
}
```

---

## Tax Settings Endpoints

### GET /api/v1/settings/taxes

**Permission**: `SETTINGS_TAX_VIEW` (Manager+)  
**Description**: Returns all tax configurations

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "tax_vat",
      "name": "VAT",
      "rate": 15.0,
      "isDefault": true,
      "code": "VAT_SA"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/settings/taxes/default

**Permission**: `SETTINGS_TAX_VIEW` (Manager+)  
**Description**: Returns the default tax rate

**Success Response (200)**:

```json
{
  "result": {
    "id": "tax_vat",
    "rate": 15.0,
    "code": "VAT_SA"
  },
  "error": null
}
```

---

### POST /api/v1/settings/taxes

**Permission**: `SETTINGS_TAX_MANAGE` (Admin only)  
**Description**: Creates a new tax rate

**Request**:

```json
{
  "name": "Service Tax",
  "rate": 5.0,
  "code": "SERVICE_TAX",
  "isDefault": false
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "tax_2",
    "name": "Service Tax",
    "rate": 5.0,
    "code": "SERVICE_TAX"
  },
  "error": null
}
```

---

### PUT /api/v1/settings/taxes/:id

**Permission**: `SETTINGS_TAX_MANAGE` (Admin only)  
**Description**: Updates tax rate

**Request**:

```json
{
  "rate": 16.0
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "tax_vat",
    "rate": 16.0
  },
  "error": null
}
```

---

## POS Terminals Endpoints

### GET /api/v1/settings/terminals

**Permission**: `SETTINGS_TERMINAL_VIEW` (Manager+)  
**Description**: Returns all POS terminals

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "term_1",
      "code": "POS-01",
      "name": "Front Counter 1",
      "status": "ONLINE",
      "lastSeen": "2026-01-23T12:00:00Z"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/settings/terminals/:code

**Permission**: `SETTINGS_TERMINAL_VIEW` (Manager+)  
**Description**: Returns terminal by code

**Success Response (200)**:

```json
{
  "result": {
    "id": "term_1",
    "code": "POS-01",
    "name": "Front Counter 1",
    "status": "ONLINE"
  },
  "error": null
}
```

---

### POST /api/v1/settings/terminals

**Permission**: `SETTINGS_TERMINAL_MANAGE` (Admin only)  
**Description**: Registers a new POS terminal

**Request**:

```json
{
  "code": "POS-02",
  "name": "Front Counter 2"
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "term_2",
    "code": "POS-02",
    "name": "Front Counter 2",
    "status": "OFFLINE"
  },
  "error": null
}
```

---

### PUT /api/v1/settings/terminals/:id

**Permission**: `SETTINGS_TERMINAL_MANAGE` (Admin only)  
**Description**: Updates terminal configuration

**Request**:

```json
{
  "name": "Back Counter 1"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "id": "term_1",
    "name": "Back Counter 1"
  },
  "error": null
}
```

---

### POST /api/v1/settings/terminals/:code/heartbeat

**Permission**: `SESSIONS_OPEN` (Cashier+)  
**Description**: Updates terminal last-seen timestamp

**Success Response (200)**:

```json
{
  "result": null,
  "error": null
}
```

---

## Module Settings Endpoints

### GET /api/v1/settings/modules/:module

**Permission**: `SETTINGS_MODULE_VIEW` (Manager+)  
**Description**: Returns configuration for specific module

**Success Response (200)**:

```json
{
  "result": {
    "kitchen": {
      "autoPrint": true,
      "alertSound": true
    }
  },
  "error": null
}
```

---

### PUT /api/v1/settings/modules/:module

**Permission**: `SETTINGS_MODULE_MANAGE` (Admin only)  
**Description**: Updates module configuration

**Request**:

```json
{
  "autoPrint": false,
  "alertSound": false
}
```

**Success Response (200)**:

```json
{
  "result": {
    "autoPrint": false,
    "alertSound": false
  },
  "error": null
}
```

---

## Notes

- All settings endpoints require Manager+ permissions (most require Admin)
- Store settings include business name, VAT number, address, currency
- Tax rates support multiple configurations (VAT, service tax, etc.)
- Only one tax can be marked as default
- POS terminals track online/offline status via heartbeat
- Terminal heartbeat should be sent every 30 seconds
- Module settings allow customization per feature (kitchen, delivery, etc.)
- Settings changes are logged in audit trail
