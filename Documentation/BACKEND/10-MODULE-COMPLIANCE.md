# Compliance Module - ZATCA & ETA

**Module**: Tax Invoice Compliance  
**Priority**: CRITICAL (Legal requirement)  
**Dependencies**: Sales, Accounting

---

## **OVERVIEW**

ZATCA Phase 2 & Egyptian ETA compliance:
- **E-Invoice Generation** - XML format
- **Hash Chain** - Tamper-proof sequence
- **Digital Signature** - Cryptographic signing
- **Submission** - Real-time to government
- **QR Code** - TLV format

---

## **ENTITIES**

```prisma
model InvoiceCompliance {
  id            String   @id @default(uuid())
  
  // Invoice reference
  orderId       String   @unique
  order         Order    @relation(fields: [orderId], references: [id])
  
  // ZATCA fields
  uuid          String   @unique // Invoice UUID
  hash          String   // SHA-256 hash
  previousHash  String   // Hash chain
  
  // Signature
  signature     String?  // Digital signature
  publicKey     String?  // Certificate public key
  
  // XML
  xmlContent    String   @db.Text // Full UBL 2.1 XML
  
  // QR Code
  qrCodeData    String   // Base64 TLV
  
  // Submission
  submittedAt   DateTime?
  clearanceStatus String? // CLEARED, REJECTED, REPORTED
  clearanceId   String?  // ZATCA clearance ID
  
  // ETA (Egypt)
  etaUuid       String?
  etaSubmittedAt DateTime?
  etaStatus     String?
  
  createdAt     DateTime @default(now())
  
  @@index([submittedAt])
  @@index([clearanceStatus])
}

model ComplianceSettings {
  id            String   @id @default(uuid())
  
  // ZATCA credentials
  zatcaCsid     String?  // Compliance CSID
  zatcaSecret   String?  // API secret
  zatcaCertificate String? @db.Text // X.509 certificate
  zatcaPrivateKey String? @db.Text // Private key
  
  // ETA credentials
  etaClientId   String?
  etaClientSecret String?
  etaTaxId      String?
  
  // Settings
  country       String   // SA, EG
  vatNumber     String
  crNumber      String   // Commercial registration
  
  isProduction  Boolean  @default(false)
  
  updatedAt     DateTime @updatedAt
}
```

---

## **SERVICE**

```typescript
// compliance.service.ts
import * as crypto from 'crypto';
import { create } from 'xmlbuilder2';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly complianceRepo: InvoiceComplianceRepository,
    private readonly settingsRepo: ComplianceSettingsRepository,
    private readonly orderRepo: OrderRepository,
    private readonly httpService: HttpService,
    private readonly eventBus: IEventBus
  ) {}

  async generateCompliantInvoice(orderId: string): Promise<InvoiceCompliance> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const settings = await this.settingsRepo.getActive();

    // Generate UUID
    const uuid = crypto.randomUUID();

    // Get previous hash for chain
    const previousInvoice = await this.complianceRepo.findLatest();
    const previousHash = previousInvoice?.hash || '0'.repeat(64);

    // Generate XML
    const xmlContent = await this.generateUBLXML(order, uuid, settings);

    // Calculate hash
    const hash = this.calculateHash(xmlContent, previousHash);

    // Sign invoice
    const signature = await this.signInvoice(xmlContent, settings);

    // Generate QR code
    const qrCodeData = this.generateQRCode(order, uuid, hash);

    // Save compliance record
    const compliance = await this.complianceRepo.create({
      orderId,
      uuid,
      hash,
      previousHash,
      signature,
      publicKey: settings.zatcaCertificate,
      xmlContent,
      qrCodeData,
      clearanceStatus: 'PENDING'
    });

    // Submit to ZATCA/ETA
    await this.submitInvoice(compliance.id);

    return compliance;
  }

  private async generateUBLXML(
    order: Order,
    uuid: string,
    settings: ComplianceSettings
  ): Promise<string> {
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Invoice', {
        xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
        'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
        'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2'
      })
      .ele('cbc:ProfileID').txt('reporting:1.0').up()
      .ele('cbc:ID').txt(order.orderNumber).up()
      .ele('cbc:UUID').txt(uuid).up()
      .ele('cbc:IssueDate').txt(order.createdAt.toISOString().split('T')[0]).up()
      .ele('cbc:IssueTime').txt(order.createdAt.toISOString().split('T')[1].split('.')[0]).up()
      .ele('cbc:InvoiceTypeCode', { name: '0200000' }).txt('388').up() // Standard invoice
      .ele('cbc:DocumentCurrencyCode').txt('SAR').up()
      .ele('cbc:TaxCurrencyCode').txt('SAR').up();

    // Supplier (store)
    doc.ele('cac:AccountingSupplierParty')
      .ele('cac:Party')
        .ele('cac:PartyIdentification')
          .ele('cbc:ID', { schemeID: 'CRN' }).txt(settings.crNumber).up()
        .up()
        .ele('cac:PartyTaxScheme')
          .ele('cbc:CompanyID').txt(settings.vatNumber).up()
          .ele('cac:TaxScheme')
            .ele('cbc:ID').txt('VAT').up()
          .up()
        .up()
      .up()
    .up();

    // Customer
    if (order.customer) {
      doc.ele('cac:AccountingCustomerParty')
        .ele('cac:Party')
          .ele('cac:PartyIdentification')
            .ele('cbc:ID', { schemeID: 'NAT' }).txt(order.customer.phone).up()
          .up()
        .up()
      .up();
    }

    // Invoice lines
    order.items.forEach((item, index) => {
      const lineExtension = new Decimal(item.priceAfterDiscount).times(item.quantity);
      const taxAmount = lineExtension.times(new Decimal(item.taxRate)).dividedBy(100);

      doc.ele('cac:InvoiceLine')
        .ele('cbc:ID').txt((index + 1).toString()).up()
        .ele('cbc:InvoicedQuantity', { unitCode: 'PCE' }).txt(item.quantity.toString()).up()
        .ele('cbc:LineExtensionAmount', { currencyID: 'SAR' }).txt(lineExtension.toFixed(2)).up()
        .ele('cac:TaxTotal')
          .ele('cbc:TaxAmount', { currencyID: 'SAR' }).txt(taxAmount.toFixed(2)).up()
          .ele('cbc:RoundingAmount', { currencyID: 'SAR' }).txt(lineExtension.plus(taxAmount).toFixed(2)).up()
        .up()
        .ele('cac:Item')
          .ele('cbc:Name').txt(item.product.name).up()
        .up()
        .ele('cac:Price')
          .ele('cbc:PriceAmount', { currencyID: 'SAR' }).txt(item.priceAfterDiscount.toString()).up()
        .up()
      .up();
    });

    // Tax totals
    doc.ele('cac:TaxTotal')
      .ele('cbc:TaxAmount', { currencyID: 'SAR' }).txt(order.totalTax.toString()).up()
    .up();

    // Legal monetary total
    doc.ele('cac:LegalMonetaryTotal')
      .ele('cbc:LineExtensionAmount', { currencyID: 'SAR' }).txt(order.subtotal.toString()).up()
      .ele('cbc:TaxExclusiveAmount', { currencyID: 'SAR' }).txt(order.subtotal.toString()).up()
      .ele('cbc:TaxInclusiveAmount', { currencyID: 'SAR' }).txt(order.grandTotal.toString()).up()
      .ele('cbc:PayableAmount', { currencyID: 'SAR' }).txt(order.grandTotal.toString()).up()
    .up();

    return doc.end({ prettyPrint: true });
  }

  private calculateHash(xmlContent: string, previousHash: string): string {
    // Concatenate XML + previous hash
    const data = xmlContent + previousHash;

    // SHA-256 hash
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  private async signInvoice(
    xmlContent: string,
    settings: ComplianceSettings
  ): Promise<string> {
    if (!settings.zatcaPrivateKey) {
      throw new Error('ZATCA private key not configured');
    }

    // Create signature
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(xmlContent);
    sign.end();

    const signature = sign.sign(settings.zatcaPrivateKey, 'base64');
    return signature;
  }

  private generateQRCode(order: Order, uuid: string, hash: string): string {
    // TLV encoding for ZATCA QR
    const fields = [
      { tag: 1, value: order.store.nameAr }, // Seller name
      { tag: 2, value: order.store.vatNumber }, // VAT number
      { tag: 3, value: order.createdAt.toISOString() }, // Timestamp
      { tag: 4, value: order.grandTotal.toString() }, // Total
      { tag: 5, value: order.totalTax.toString() }, // Tax amount
      { tag: 6, value: hash } // Invoice hash
    ];

    // Encode as TLV
    const tlv = fields.map(field => {
      const valueBuffer = Buffer.from(field.value, 'utf8');
      const tagBuffer = Buffer.from([field.tag]);
      const lengthBuffer = Buffer.from([valueBuffer.length]);
      return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
    });

    const tlvBuffer = Buffer.concat(tlv);
    return tlvBuffer.toString('base64');
  }

  private async submitInvoice(complianceId: string): Promise<void> {
    const compliance = await this.complianceRepo.findById(complianceId);
    const settings = await this.settingsRepo.getActive();

    const endpoint = settings.isProduction
      ? 'https://gw-fatoora.zatca.gov.sa/e-invoicing/core/invoices/reporting/single'
      : 'https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal/invoices/reporting/single';

    try {
      const response = await this.httpService
        .post(
          endpoint,
          {
            invoiceHash: compliance.hash,
            uuid: compliance.uuid,
            invoice: Buffer.from(compliance.xmlContent).toString('base64')
          },
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Accept-Language': 'en',
              'Clearance-Status': '1',
              'Authorization': `Basic ${Buffer.from(`${settings.zatcaCsid}:${settings.zatcaSecret}`).toString('base64')}`
            }
          }
        )
        .toPromise();

      await this.complianceRepo.update(complianceId, {
        submittedAt: new Date(),
        clearanceStatus: 'CLEARED',
        clearanceId: response.data.clearanceId
      });

      await this.eventBus.publish('InvoiceCleared',
        new InvoiceClearedEvent(complianceId, compliance.orderId)
      );
    } catch (error) {
      await this.complianceRepo.update(complianceId, {
        clearanceStatus: 'REJECTED'
      });

      await this.eventBus.publish('InvoiceRejected',
        new InvoiceRejectedEvent(complianceId, error.message)
      );

      throw error;
    }
  }

  async verifyHashChain(): Promise<boolean> {
    const invoices = await this.complianceRepo.findAll({ orderBy: 'createdAt' });

    for (let i = 1; i < invoices.length; i++) {
      const current = invoices[i];
      const previous = invoices[i - 1];

      // Verify previous hash matches
      if (current.previousHash !== previous.hash) {
        return false;
      }

      // Recalculate current hash
      const recalculatedHash = this.calculateHash(
        current.xmlContent,
        current.previousHash
      );

      if (recalculatedHash !== current.hash) {
        return false;
      }
    }

    return true;
  }
}
```

---

## **CONTROLLER**

```typescript
// compliance.controller.ts
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('invoices/:orderId/generate')
  async generateInvoice(@Param('orderId') orderId: string) {
    return this.complianceService.generateCompliantInvoice(orderId);
  }

  @Get('invoices/:orderId')
  async getInvoice(@Param('orderId') orderId: string) {
    return this.complianceService.findByOrder(orderId);
  }

  @Get('verify-chain')
  async verifyChain() {
    const valid = await this.complianceService.verifyHashChain();
    return { valid };
  }
}
```

---

## **KEY FEATURES**

1. **UBL 2.1 XML** - ZATCA-compliant invoice format
2. **Hash Chain** - Tamper-proof invoice sequence
3. **Digital Signature** - RSA-SHA256 signing
4. **QR Code** - TLV-encoded invoice data
5. **Real-time Submission** - Auto-submit to ZATCA
6. **Chain Verification** - Validate entire invoice history

---

## **NEXT**

- [11-MODULE-SETTINGS.md](11-MODULE-SETTINGS.md) - System configuration
