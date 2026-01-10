# ZATCA Phase 2 E-Invoicing Implementation

**Country**: Saudi Arabia  
**Authority**: ZATCA (Zakat, Tax and Customs Authority)  
**Compliance Date**: January 1, 2023 (Phase 2)  
**Penalty**: Up to 50,000 SAR per violation  

---

## **PHASE 2 REQUIREMENTS**

### **1. Integration Type**
- **Phase 1**: Generation + QR (Simplified)
- **Phase 2**: Real-time clearance/reporting (Standard)

### **2. Invoice Types**
- **Standard B2B**: Requires clearance before issuance
- **Simplified B2C**: Reporting within 24 hours
- **Standard Credit/Debit Notes**: Clearance required
- **Simplified Credit/Debit Notes**: Reporting within 24 hours

---

## **TECHNICAL REQUIREMENTS**

### **1. UBL 2.1 XML Format**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- Invoice Header -->
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>INV-2024-001</cbc:ID>
  <cbc:UUID>8e66147c-d671-4474-9b2e-b5d469fd4e3f</cbc:UUID>
  <cbc:IssueDate>2024-01-15</cbc:IssueDate>
  <cbc:IssueTime>14:30:00</cbc:IssueTime>
  
  <!-- Invoice Type -->
  <cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>
  <!-- 388 = Standard invoice, 381 = Credit note -->
  
  <!-- Currency -->
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  
  <!-- Supplier (Seller) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">1234567890</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>King Fahd Road</cbc:StreetName>
        <cbc:BuildingNumber>1234</cbc:BuildingNumber>
        <cbc:CitySubdivisionName>Al Olaya</cbc:CitySubdivisionName>
        <cbc:CityName>Riyadh</cbc:CityName>
        <cbc:PostalZone>12345</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>SA</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>300000000000003</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>NerdPOS Restaurant</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Customer (Buyer) - Optional for B2C -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="NAT">0501234567</cbc:ID>
      </cac:PartyIdentification>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Invoice Lines -->
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">2</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">100.00</cbc:LineExtensionAmount>
    
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="SAR">15.00</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="SAR">115.00</cbc:RoundingAmount>
    </cac:TaxTotal>
    
    <cac:Item>
      <cbc:Name>Grilled Chicken</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    
    <cac:Price>
      <cbc:PriceAmount currencyID="SAR">50.00</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>
  
  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">15.00</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">100.00</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">15.00</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">100.00</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">100.00</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">115.00</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">115.00</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
</Invoice>
```

---

### **2. Cryptographic Stamp (Hash Chain)**

```typescript
// Generate SHA-256 hash
function generateInvoiceHash(
  xmlContent: string,
  previousHash: string
): string {
  const data = xmlContent + previousHash;
  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

// First invoice
const firstHash = generateInvoiceHash(invoice1XML, '0'.repeat(64));

// Second invoice (chained)
const secondHash = generateInvoiceHash(invoice2XML, firstHash);

// Third invoice (chained)
const thirdHash = generateInvoiceHash(invoice3XML, secondHash);
```

**CRITICAL**: Hash chain must NEVER be broken. Store previous hash in database.

---

### **3. Digital Signature (X.509)**

```typescript
// Sign invoice with private key
function signInvoice(
  xmlContent: string,
  privateKey: string
): string {
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(xmlContent);
  sign.end();
  
  return sign.sign(privateKey, 'base64');
}

// Verify signature
function verifySignature(
  xmlContent: string,
  signature: string,
  publicKey: string
): boolean {
  const verify = crypto.createVerify('RSA-SHA256');
  verify.update(xmlContent);
  verify.end();
  
  return verify.verify(publicKey, signature, 'base64');
}
```

---

### **4. QR Code (TLV Format)**

```typescript
// Tag-Length-Value encoding
function generateZATCAQR(invoice: Invoice): string {
  const fields = [
    { tag: 1, value: invoice.seller.name },          // Seller name (Arabic)
    { tag: 2, value: invoice.seller.vatNumber },     // VAT number
    { tag: 3, value: invoice.timestamp },            // Invoice timestamp
    { tag: 4, value: invoice.grandTotal.toString() }, // Total (with VAT)
    { tag: 5, value: invoice.totalVAT.toString() },  // VAT amount
    { tag: 6, value: invoice.hash }                  // Invoice hash (PIH)
  ];
  
  const tlv = fields.map(field => {
    const valueBuffer = Buffer.from(field.value, 'utf8');
    const tagBuffer = Buffer.from([field.tag]);
    const lengthBuffer = Buffer.from([valueBuffer.length]);
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
  });
  
  return Buffer.concat(tlv).toString('base64');
}

// Example output:
// AQtOZXJkUE9TIFLVzbmFDAgzMDAwMDAwMDAwMDAwMDMDFDIwMjQtMDEtMTVUMTQ6MzA6MDAF
```

---

### **5. API Integration**

#### **Onboarding (One-time)**

```http
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/core/compliance
Content-Type: application/json
Authorization: Basic <base64(OTP:OTP)>

{
  "csr": "<Base64 encoded CSR>"
}

Response:
{
  "requestID": "123456",
  "dispositionMessage": "ISSUED",
  "binarySecurityToken": "<Base64 X.509 Certificate>",
  "secret": "<API Secret>"
}
```

#### **Invoice Clearance (B2B)**

```http
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/clearance/single
Content-Type: application/json
Accept: application/json
Authorization: Basic <base64(CSID:SECRET)>
Clearance-Status: 1

{
  "invoiceHash": "abc123...",
  "uuid": "8e66147c-d671-4474-9b2e-b5d469fd4e3f",
  "invoice": "<Base64 encoded XML>"
}

Response (Success):
{
  "clearanceStatus": "CLEARED",
  "clearedInvoice": "<Base64 encoded signed XML>",
  "validationResults": {
    "status": "PASS",
    "warningMessages": []
  }
}

Response (Rejected):
{
  "clearanceStatus": "REJECTED",
  "validationResults": {
    "status": "FAIL",
    "errorMessages": [
      {
        "code": "XSD_ZATCA_INVALID",
        "message": "Invalid VAT number format"
      }
    ]
  }
}
```

#### **Invoice Reporting (B2C)**

```http
POST https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/reporting/single
Content-Type: application/json
Authorization: Basic <base64(CSID:SECRET)>

{
  "invoiceHash": "def456...",
  "uuid": "7a55047d-c570-4363-8a1f-a4d358ed3e2e",
  "invoice": "<Base64 encoded XML>"
}

Response:
{
  "reportingStatus": "REPORTED",
  "validationResults": {
    "status": "PASS"
  }
}
```

---

## **IMPLEMENTATION FLOW**

```
1. Order Completed
   ↓
2. Generate UBL 2.1 XML
   ↓
3. Calculate Hash (XML + Previous Hash)
   ↓
4. Sign with Private Key
   ↓
5. Generate QR Code (TLV)
   ↓
6. Submit to ZATCA API
   ├─ B2B → Clearance (wait for response)
   └─ B2C → Reporting (fire-and-forget)
   ↓
7. Store Invoice + Compliance Data
   ↓
8. Print Receipt with QR Code
```

---

## **ERROR HANDLING**

```typescript
async function submitInvoice(invoice: Invoice): Promise<void> {
  try {
    // Try clearance
    const response = await zatcaAPI.clearInvoice(invoice);
    
    if (response.clearanceStatus === 'CLEARED') {
      // Success
      await saveCompliance(invoice, response);
      await printReceipt(invoice);
    } else {
      // Rejected
      await handleRejection(invoice, response.validationResults);
    }
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      // Queue for retry
      await queueForRetry(invoice);
    } else {
      // Fatal error
      throw error;
    }
  }
}

// Retry mechanism
async function retryFailedInvoices(): Promise<void> {
  const failed = await getFailedInvoices();
  
  for (const invoice of failed) {
    try {
      await submitInvoice(invoice);
    } catch (error) {
      console.error(`Retry failed for ${invoice.id}:`, error);
    }
  }
}

// Run every 5 minutes
setInterval(retryFailedInvoices, 5 * 60 * 1000);
```

---

## **COMPLIANCE CHECKLIST**

- [ ] UBL 2.1 XML generation
- [ ] Hash chain implementation
- [ ] Digital signature (X.509)
- [ ] QR code generation (TLV)
- [ ] API integration (clearance + reporting)
- [ ] Certificate management
- [ ] Retry mechanism for failed submissions
- [ ] Audit log of all invoices
- [ ] Backup invoices to secondary storage
- [ ] Periodic hash chain validation

---

## **TESTING**

```typescript
// Test environment
const ZATCA_TEST_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal';
const ZATCA_PROD_URL = 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core';

// Test credentials (from ZATCA portal)
const TEST_CSID = 'test-csid-123';
const TEST_SECRET = 'test-secret-456';

// Validate XML against XSD
const validator = new XMLValidator();
const isValid = validator.validate(invoiceXML, 'UBL-Invoice-2.1.xsd');

// Validate hash chain
const isChainValid = await validateHashChain();

// Test QR code
const qrData = decodeZATCAQR(qrCodeBase64);
assert(qrData.vatNumber === '300000000000003');
```

---

## **RESOURCES**

- **ZATCA Portal**: https://fatoora.zatca.gov.sa
- **SDK**: https://github.com/zatca/zatca-sdk
- **Specifications**: ZATCA E-Invoicing Compliance Rulebook v3.1
- **Support**: egs@zatca.gov.sa

---

**CRITICAL**: Non-compliance penalties up to 50,000 SAR per violation!
