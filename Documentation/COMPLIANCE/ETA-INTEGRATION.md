# Egyptian Tax Authority (ETA) Integration

**Authority**: Egyptian Tax Authority  
**System**: E-Invoice System  
**Format**: JSON API  

---

## **OVERVIEW**

Egypt's e-invoicing system requires:
- Real-time submission of all invoices
- Digital signatures using ETA-issued certificates
- JSON format (not XML like ZATCA)
- Activity codes for business classification

---

## **REGISTRATION**

```typescript
// 1. Register business with ETA
const registration = {
  taxpayerName: company.nameArabic,
  taxpayerNameEn: company.nameEnglish,
  taxNumber: company.taxNumber, // 9-digit TIN
  activityCode: '5610', // Restaurant services
  branchCode: '0',
  
  // Contact info
  address: {
    country: 'EG',
    governate: 'Cairo',
    regionCity: 'Nasr City',
    street: company.address.street,
    buildingNumber: company.address.building,
  },
  
  businessType: 'B', // B=Business, P=Person
};

// 2. Receive ETA certificate (p12 file)
// 3. Store certificate securely
```

---

## **INVOICE STRUCTURE**

```typescript
// ETA invoice format
interface ETAInvoice {
  issuer: {
    type: 'B'; // Business
    id: string; // Tax number
    name: string;
    address: ETAAddress;
  };
  
  receiver: {
    type: 'B' | 'P' | 'F'; // Business, Person, Foreign
    id: string;
    name: string;
    address: ETAAddress;
  };
  
  documentType: 'I' | 'C'; // Invoice or Credit Note
  documentTypeVersion: '1.0';
  dateTimeIssued: string; // ISO 8601
  taxpayerActivityCode: string;
  
  internalID: string; // Your invoice number
  purchaseOrderReference?: string;
  purchaseOrderDescription?: string;
  
  salesOrderReference?: string;
  salesOrderDescription?: string;
  
  proformaInvoiceNumber?: string;
  
  payment: {
    bankName?: string;
    bankAddress?: string;
    bankAccountNo?: string;
    bankAccountIBAN?: string;
    swiftCode?: string;
    terms?: string;
  };
  
  delivery?: {
    approach?: string;
    packaging?: string;
    dateValidity?: string;
    exportPort?: string;
    countryOfOrigin?: string;
    grossWeight?: number;
    netWeight?: number;
    terms?: string;
  };
  
  invoiceLines: ETAInvoiceLine[];
  
  totalDiscountAmount: number;
  totalSalesAmount: number;
  netAmount: number;
  taxTotals: ETATaxTotal[];
  totalAmount: number;
  extraDiscountAmount: number;
  totalItemsDiscountAmount: number;
}

interface ETAInvoiceLine {
  description: string;
  itemType: 'GS1' | 'EGS'; // GS1 barcode or Egyptian General Service
  itemCode: string;
  unitType: 'EA' | 'KG' | 'L'; // Each, Kilogram, Liter
  quantity: number;
  internalCode?: string;
  salesTotal: number;
  total: number;
  valueDifference?: number;
  totalTaxableFees?: number;
  netTotal: number;
  itemsDiscount?: number;
  unitValue: {
    currencySold: 'EGP';
    amountEGP: number;
    amountSold?: number;
    currencyExchangeRate?: number;
  };
  discount?: {
    rate: number;
    amount: number;
  };
  taxableItems: ETATaxableItem[];
}

interface ETATaxableItem {
  taxType: 'T1' | 'T2'; // T1=VAT, T2=Table Tax
  amount: number;
  subType: string; // V009=14% VAT
  rate: number;
}
```

---

## **SUBMISSION**

```typescript
// services/eta.service.ts
import axios from 'axios';
import * as forge from 'node-forge';

export class ETAService {
  private readonly baseURL = 'https://api.invoicing.eta.gov.eg';
  private certificate: any;
  
  constructor() {
    // Load ETA certificate
    const p12Data = fs.readFileSync('certificates/eta-cert.p12');
    this.certificate = forge.pkcs12.pkcs12FromAsn1(
      forge.asn1.fromDer(p12Data.toString('binary')),
      process.env.ETA_CERT_PASSWORD
    );
  }

  async submitInvoice(invoice: ETAInvoice) {
    // 1. Sign invoice
    const signedInvoice = this.signInvoice(invoice);

    // 2. Submit to ETA
    const response = await axios.post(
      `${this.baseURL}/api/v1.0/documentsubmissions`,
      {
        documents: [signedInvoice],
      },
      {
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // 3. Handle response
    if (response.data.acceptedDocuments?.length > 0) {
      const accepted = response.data.acceptedDocuments[0];
      
      return {
        success: true,
        submissionId: response.data.submissionId,
        longId: accepted.longId,
        uuid: accepted.uuid,
        internalId: accepted.internalId,
      };
    }

    // 4. Handle rejection
    if (response.data.rejectedDocuments?.length > 0) {
      const rejected = response.data.rejectedDocuments[0];
      
      throw new Error(`ETA rejected invoice: ${JSON.stringify(rejected.error)}`);
    }
  }

  private signInvoice(invoice: ETAInvoice) {
    // Serialize to canonical JSON
    const serialized = this.canonicalJSON(invoice);

    // Sign with certificate
    const signature = this.certificate.key.sign(
      forge.md.sha256.create().update(serialized).digest()
    );

    return {
      ...invoice,
      signatures: [
        {
          signatureType: 'I', // Issuer
          value: forge.util.encode64(signature),
        },
      ],
    };
  }

  private async getAccessToken() {
    // OAuth2 token from ETA
    const response = await axios.post(
      `${this.baseURL}/connect/token`,
      {
        grant_type: 'client_credentials',
        client_id: process.env.ETA_CLIENT_ID,
        client_secret: process.env.ETA_CLIENT_SECRET,
      }
    );

    return response.data.access_token;
  }
}
```

---

## **TAX TYPES**

```typescript
// Egypt-specific tax codes
const ETA_TAX_CODES = {
  VAT_14: { taxType: 'T1', subType: 'V009', rate: 14 },
  VAT_EXEMPT: { taxType: 'T1', subType: 'V001', rate: 0 },
  TABLE_TAX: { taxType: 'T2', subType: 'T002', rate: 14 },
};

// Calculate taxes
function calculateETATaxes(subtotal: Decimal) {
  const vat = subtotal.times(0.14); // 14% VAT
  const tableService = subtotal.times(0.14); // 14% service charge (restaurants)
  
  return {
    taxableItems: [
      {
        taxType: 'T1',
        amount: vat.toNumber(),
        subType: 'V009',
        rate: 14,
      },
      {
        taxType: 'T2',
        amount: tableService.toNumber(),
        subType: 'T002',
        rate: 14,
      },
    ],
    totalTax: vat.plus(tableService).toNumber(),
  };
}
```

---

## **RETRY LOGIC**

```typescript
// Retry failed submissions
async retryETASubmission(invoiceId: string) {
  const maxRetries = 5;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const invoice = await this.prepareETAInvoice(invoiceId);
      const result = await this.etaService.submitInvoice(invoice);

      // Success
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          etaSubmissionId: result.submissionId,
          etaLongId: result.longId,
          submittedToETA: true,
        },
      });

      return result;
      
    } catch (error) {
      attempts++;
      
      if (attempts >= maxRetries) {
        // Alert admin
        await this.sendAlert({
          type: 'ETA_SUBMISSION_FAILED',
          invoiceId,
          error: error.message,
        });
        
        throw error;
      }

      // Exponential backoff
      await this.delay(Math.pow(2, attempts) * 1000);
    }
  }
}
```

---

## **TESTING**

```typescript
// ETA provides test environment
const ETA_TEST_URL = 'https://api.preprod.invoicing.eta.gov.eg';

// Test with dummy data
const testInvoice = {
  issuer: { id: '999999999', name: 'Test Company' },
  receiver: { id: '888888888', name: 'Test Customer' },
  documentType: 'I',
  internalID: 'TEST-001',
  totalAmount: 100,
  // ...
};
```

---

**All Documentation Complete ✅**
