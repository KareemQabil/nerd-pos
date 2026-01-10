# Compliance Submission Workflow

**Authority**: ZATCA (Saudi) / ETA (Egypt)  
**Format**: UBL 2.1 XML  
**Timing**: Real-time submission  

---

## **ZATCA PHASE 2 SUBMISSION**

```typescript
// Step 1: Generate compliant invoice
const invoice = await complianceService.generateInvoice(orderId);

// UBL XML structure
const ublXML = {
  Invoice: {
    ID: invoice.invoiceNumber,
    UUID: invoice.uuid,
    IssueDate: invoice.issuedAt,
    IssueTime: invoice.issuedAt,
    InvoiceTypeCode: '388', // Standard invoice
    DocumentCurrencyCode: 'SAR',
    
    // Previous invoice hash (chain)
    AdditionalDocumentReference: {
      ID: 'ICV',
      UUID: invoice.invoiceCounterValue,
    },
    AdditionalDocumentReference: {
      ID: 'PIH',
      Attachment: {
        EmbeddedDocumentBinaryObject: invoice.previousInvoiceHash,
      },
    },
    
    // Seller info
    AccountingSupplierParty: {
      Party: {
        PartyIdentification: {
          ID: sellerVATNumber,
        },
        PostalAddress: {
          StreetName: sellerAddress.street,
          CityName: sellerAddress.city,
          CountryCode: 'SA',
        },
      },
    },
    
    // Buyer info (if B2B)
    AccountingCustomerParty: customer ? {
      Party: {
        PartyIdentification: {
          ID: customer.vatNumber,
        },
      },
    } : null,
    
    // Line items
    InvoiceLine: invoice.items.map(item => ({
      ID: item.lineNumber,
      InvoicedQuantity: item.quantity,
      LineExtensionAmount: item.subtotal,
      Item: {
        Name: item.product.name,
      },
      Price: {
        PriceAmount: item.unitPrice,
      },
      TaxTotal: {
        TaxAmount: item.taxAmount,
        TaxCategory: {
          ID: 'S', // Standard rate
          Percent: 15,
          TaxScheme: { ID: 'VAT' },
        },
      },
    })),
    
    // Totals
    LegalMonetaryTotal: {
      LineExtensionAmount: invoice.subtotal,
      TaxExclusiveAmount: invoice.subtotal,
      TaxInclusiveAmount: invoice.grandTotal,
      PayableAmount: invoice.grandTotal,
    },
    
    // Tax breakdown
    TaxTotal: {
      TaxAmount: invoice.taxAmount,
      TaxSubtotal: {
        TaxableAmount: invoice.subtotal,
        TaxAmount: invoice.taxAmount,
        TaxCategory: {
          ID: 'S',
          Percent: 15,
          TaxScheme: { ID: 'VAT' },
        },
      },
    },
  },
};

// Step 2: Sign with cryptographic certificate
const signedXML = await zatcaService.signInvoice(ublXML, certificate);

// Step 3: Generate hash for chain
const invoiceHash = await zatcaService.generateHash(signedXML);

// Step 4: Generate QR code
const qrCode = await zatcaService.generateQRCode({
  sellerName: company.name,
  vatNumber: company.vatNumber,
  timestamp: invoice.issuedAt,
  total: invoice.grandTotal,
  tax: invoice.taxAmount,
});

// Step 5: Update invoice with compliance data
await prisma.invoice.update({
  where: { id: invoice.id },
  data: {
    currentInvoiceHash: invoiceHash,
    qrCode,
    ublXML: signedXML,
  },
});

// Step 6: Submit to ZATCA
const response = await zatcaService.submitInvoice({
  uuid: invoice.uuid,
  invoiceHash,
  invoice: signedXML,
});

// Step 7: Handle response
if (response.status === 'ACCEPTED') {
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      submittedToZATCA: true,
      submittedAt: new Date(),
      zatcaResponse: response,
    },
  });
  
  // Update next invoice's previous hash
  await complianceService.updateHashChain(invoiceHash);
  
} else {
  // Handle rejection
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      zatcaError: response.errors,
      submissionFailed: true,
    },
  });
  
  // Alert admin
  await notificationService.sendAlert({
    type: 'ZATCA_SUBMISSION_FAILED',
    invoiceId: invoice.id,
    errors: response.errors,
  });
}
```

---

## **HASH CHAIN VERIFICATION**

```typescript
// Verify hash chain integrity (run periodically)
async verifyHashChain() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { invoiceCounterValue: 'asc' },
  });

  for (let i = 1; i < invoices.length; i++) {
    const current = invoices[i];
    const previous = invoices[i - 1];

    // Verify chain link
    if (current.previousInvoiceHash !== previous.currentInvoiceHash) {
      throw new Error(`Hash chain broken at invoice ${current.invoiceNumber}`);
    }

    // Verify hash calculation
    const recalculatedHash = await this.generateHash(current.ublXML);
    if (recalculatedHash !== current.currentInvoiceHash) {
      throw new Error(`Hash mismatch for invoice ${current.invoiceNumber}`);
    }
  }

  return { valid: true, invoicesChecked: invoices.length };
}
```

---

## **OFFLINE HANDLING**

```typescript
// If ZATCA is offline, queue for retry
if (error.code === 'ZATCA_UNAVAILABLE') {
  await prisma.invoiceSubmissionQueue.create({
    data: {
      invoiceId: invoice.id,
      attempts: 0,
      status: 'PENDING',
    },
  });

  // Background job retries every 5 minutes
  scheduleRetry(invoice.id);
}

// Retry job
@Cron('*/5 * * * *') // Every 5 minutes
async retryFailedSubmissions() {
  const pending = await prisma.invoiceSubmissionQueue.findMany({
    where: {
      status: 'PENDING',
      attempts: { lt: 10 },
    },
  });

  for (const item of pending) {
    try {
      await this.submitInvoice(item.invoiceId);
      
      await prisma.invoiceSubmissionQueue.update({
        where: { id: item.id },
        data: { status: 'COMPLETED' },
      });
      
    } catch (error) {
      await prisma.invoiceSubmissionQueue.update({
        where: { id: item.id },
        data: { attempts: { increment: 1 } },
      });
    }
  }
}
```

---

## **ETA (EGYPT) SUBMISSION**

```typescript
// Similar flow but different endpoints
const etaResponse = await etaService.submitInvoice({
  issuer: company.taxNumber,
  receiver: customer.taxNumber,
  documentType: 'I', // Invoice
  documentTypeVersion: '1.0',
  dateTimeIssued: invoice.issuedAt,
  taxpayerActivityCode: company.activityCode,
  
  invoiceLines: invoice.items.map(item => ({
    description: item.product.name,
    itemType: 'GS1', // or 'EGS'
    itemCode: item.product.barcode,
    unitType: 'EA',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    netTotal: item.subtotal,
    taxableItems: [{
      taxType: 'T1', // VAT
      amount: item.taxAmount,
      subType: 'V009', // Standard rate
      rate: 14,
    }],
    total: item.total,
  })),
  
  totalSalesAmount: invoice.subtotal,
  totalDiscountAmount: invoice.discountAmount,
  netAmount: invoice.subtotal,
  taxTotals: [{
    taxType: 'T1',
    amount: invoice.taxAmount,
  }],
  totalAmount: invoice.grandTotal,
});

// Store ETA submission ID
await prisma.invoice.update({
  where: { id: invoice.id },
  data: {
    etaSubmissionId: etaResponse.submissionId,
    etaLongId: etaResponse.longId,
  },
});
```

---

## **FRONTEND - SUBMISSION STATUS**

```tsx
export function InvoiceStatus({ invoice }) {
  const statusColors = {
    PENDING: 'yellow',
    SUBMITTED: 'green',
    FAILED: 'red',
  };

  return (
    <div>
      <Badge variant={statusColors[invoice.submissionStatus]}>
        {invoice.submissionStatus}
      </Badge>
      
      {invoice.submittedAt && (
        <p>Submitted: {formatDate(invoice.submittedAt)}</p>
      )}
      
      {invoice.zatcaError && (
        <Alert variant="danger">
          <p>Submission failed: {invoice.zatcaError}</p>
          <Button onClick={() => retrySubmission(invoice.id)}>
            Retry
          </Button>
        </Alert>
      )}
      
      {invoice.qrCode && (
        <QRCodeDisplay data={invoice.qrCode} />
      )}
    </div>
  );
}
```

---

**NEXT**: [08-offline-sync.md](08-offline-sync.md)
