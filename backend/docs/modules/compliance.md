# Compliance Module API

Tax invoice generation and submission for ZATCA/ETA compliance.

---

## Invoice Endpoints

### POST /api/v1/compliance/invoice/generate

**Permission**: `COMPLIANCE_GENERATE` (Cashier+)  
**Description**: Generates ETA/ZATCA compliant tax invoice for order

**Request**:

```json
{
  "orderId": "ord_123",
  "orderData": {
    "items": [],
    "total": 115.0,
    "tax": 15.0
  }
}
```

**Success Response (201)**:

```json
{
  "result": {
    "id": "inv_123456789",
    "orderId": "ord_123",
    "invoiceNumber": "INV-2026-001",
    "totalAmount": 115.0,
    "taxAmount": 15.0,
    "status": "GENERATED",
    "hash": "a1b2c3d4..."
  },
  "error": null
}
```

---

### POST /api/v1/compliance/invoice/submit

**Permission**: `COMPLIANCE_GENERATE` (Cashier+)  
**Description**: Submits invoice to ETA/ZATCA for approval

**Request**:

```json
{
  "invoiceId": "inv_123"
}
```

**Success Response (200)**:

```json
{
  "result": {
    "invoiceId": "inv_123",
    "status": "SUBMITTED",
    "submissionId": "sub_999",
    "ackTime": "2026-01-23T12:05:00Z"
  },
  "error": null
}
```

---

### GET /api/v1/compliance/invoice/order/:orderId

**Permission**: `COMPLIANCE_VIEW` (Manager+)  
**Description**: Returns compliance invoice for order

**Success Response (200)**:

```json
{
  "result": {
    "id": "inv_123",
    "orderId": "ord_123",
    "status": "CLEARED",
    "qrCode": "base64_encoded_qr_code..."
  },
  "error": null
}
```

---

### GET /api/v1/compliance/invoice/pending

**Permission**: `COMPLIANCE_VIEW` (Manager+)  
**Description**: Returns invoices pending submission

**Success Response (200)**:

```json
{
  "result": [
    {
      "id": "inv_124",
      "status": "GENERATED",
      "amount": 50.0,
      "generatedAt": "2026-01-23T12:10:00Z"
    }
  ],
  "error": null
}
```

---

### GET /api/v1/compliance/hash-chain/verify

**Permission**: `COMPLIANCE_VIEW` (Manager+)  
**Description**: Verifies integrity of invoice hash chain

**Success Response (200)**:

```json
{
  "result": {
    "isValid": true,
    "brokenAt": null,
    "lastVerifiedHash": "h1a2s3h4..."
  },
  "error": null
}
```

---

## Notes

- Supports both ZATCA (Saudi Arabia) and ETA (Egypt) formats
- Invoice statuses: GENERATED, SUBMITTED, CLEARED, REJECTED
- Hash chain ensures invoice integrity and prevents tampering
- QR code generated automatically for paper invoices
- Automatic retry mechanism for failed submissions
