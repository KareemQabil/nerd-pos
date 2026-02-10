// Compliance Service
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { ComplianceRepository } from './compliance.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import {
  InvoiceGeneratedEvent,
  InvoiceSubmittedEvent,
  HashChainBrokenEvent,
} from './events/compliance.events';
import {
  ComplianceSettings,
  ZATCAInvoice,
  HashChainStatus,
} from './entities/compliance.entity';
import * as crypto from 'crypto';
import Decimal from 'decimal.js';

@Injectable()
export class ComplianceService {
  constructor(
    private readonly repo: ComplianceRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}

  async generateInvoice(
    orderId: string,
    orderData: any,
  ): Promise<ZATCAInvoice> {
    const existing = await this.repo.findByOrder(orderId);
    if (existing)
      throw new BadRequestException('Invoice already exists for this order');

    const chainStatus = await this.verifyHashChain();
    if (!chainStatus.chainValid) {
      await this.eventBus.publish(
        'HashChainBroken',
        new HashChainBrokenEvent(
          chainStatus.brokenAtInvoiceId || 'unknown',
          chainStatus.expectedHash || '',
          chainStatus.actualHash || '',
        ),
      );
      throw new InternalServerErrorException(
        'ZATCA hash chain validation failed',
      );
    }

    const lastInvoice = await this.repo.findLastInvoice();
    const previousHash = this.resolveInvoiceHash(lastInvoice) || '0'.repeat(64);

    const settings = await this.repo.getSettings();

    const invoiceXML = this.buildInvoiceXML(orderData);
    const currentHash = this.calculateHash(previousHash, invoiceXML);
    const signature = this.signInvoiceXml(invoiceXML, settings);
    const signedXml = signature
      ? this.appendSignature(invoiceXML, signature)
      : null;
    const qrCode = this.generateQRCode(
      orderData,
      currentHash,
      signature,
      settings,
    );
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.repo.create({
      orderId,
      invoiceNumber,
      previousHash,
      invoiceHash: currentHash,
      qrCode,
      xmlContent: invoiceXML,
      signedXml,
      submissionStatus: 'PENDING',
    });

    await this.eventBus.publish(
      'InvoiceGenerated',
      new InvoiceGeneratedEvent(invoice.id, orderId),
    );
    return this.normalizeInvoice(invoice, {
      currentHash,
      invoiceXML,
      signedXml,
      signature,
    });
  }

  private buildInvoiceXML(orderData: any): string {
    // UBL 2.1 (minimal) with ZATCA-friendly fields
    const items = this.normalizeItems(orderData);
    const currency = orderData?.currency || 'SAR';
    const invoiceId =
      orderData?.invoiceNumber ||
      orderData?.orderNumber ||
      orderData?.id ||
      'N/A';

    const issueDate = new Date(
      orderData?.issuedAt || orderData?.createdAt || Date.now(),
    );
    const issueDateStr = issueDate.toISOString().slice(0, 10);
    const issueTimeStr = issueDate.toISOString().slice(11, 19);

    const subtotal = items.reduce(
      (sum, item) => sum.plus(item.lineTotal),
      new Decimal(0),
    );
    const discount = new Decimal(orderData?.discountAmount || 0);
    const serviceCharge = new Decimal(orderData?.serviceChargeAmount || 0);
    const deliveryCharge = new Decimal(orderData?.deliveryCharge || 0);

    const taxRate = new Decimal(
      orderData?.taxPercent ?? orderData?.taxRate ?? 15,
    );
    const taxBase = subtotal.minus(discount);
    const computedTax = taxBase.times(taxRate).dividedBy(100);
    const taxAmount = orderData?.taxAmount != null
      ? new Decimal(orderData.taxAmount)
      : computedTax;
    const taxAmountRounded = taxAmount.toDecimalPlaces(
      2,
      Decimal.ROUND_HALF_EVEN,
    );

    const taxExclusive = taxBase.plus(serviceCharge).plus(deliveryCharge);
    const taxInclusive = taxExclusive.plus(taxAmountRounded);
    const payable = orderData?.grandTotal != null
      ? new Decimal(orderData.grandTotal)
      : taxInclusive;

    const money = (val: Decimal) =>
      val.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toFixed(2);
    const rate = (val: Decimal) =>
      val.toDecimalPlaces(4, Decimal.ROUND_HALF_EVEN).toFixed(4);

    const sellerName =
      orderData?.sellerName ||
      orderData?.storeName ||
      orderData?.storeNameEn ||
      orderData?.storeNameAr ||
      'Unknown';
    const vatNumber =
      orderData?.vatNumber || orderData?.taxNumber || '';

    const linesXml = items
      .map((item, idx) => {
        return [
          '<cac:InvoiceLine>',
          `<cbc:ID>${idx + 1}</cbc:ID>`,
          `<cbc:InvoicedQuantity unitCode="EA">${item.quantity.toFixed(2)}</cbc:InvoicedQuantity>`,
          `<cbc:LineExtensionAmount currencyID="${currency}">${money(item.lineTotal)}</cbc:LineExtensionAmount>`,
          '<cac:Item>',
          `<cbc:Name>${this.escapeXml(item.name)}</cbc:Name>`,
          '</cac:Item>',
          '<cac:Price>',
          `<cbc:PriceAmount currencyID="${currency}">${money(item.unitPrice)}</cbc:PriceAmount>`,
          '</cac:Price>',
          '</cac:InvoiceLine>',
        ].join('');
      })
      .join('');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
      ' xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
      ' xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">',
      `<cbc:ID>${this.escapeXml(String(invoiceId))}</cbc:ID>`,
      `<cbc:IssueDate>${issueDateStr}</cbc:IssueDate>`,
      `<cbc:IssueTime>${issueTimeStr}</cbc:IssueTime>`,
      '<cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>',
      `<cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>`,
      `<cbc:TaxCurrencyCode>${currency}</cbc:TaxCurrencyCode>`,
      '<cac:AccountingSupplierParty>',
      '<cac:Party>',
      '<cac:PartyName>',
      `<cbc:Name>${this.escapeXml(String(sellerName))}</cbc:Name>`,
      '</cac:PartyName>',
      '<cac:PartyTaxScheme>',
      `<cbc:CompanyID>${this.escapeXml(String(vatNumber))}</cbc:CompanyID>`,
      '<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>',
      '</cac:PartyTaxScheme>',
      '</cac:Party>',
      '</cac:AccountingSupplierParty>',
      '<cac:TaxTotal>',
      `<cbc:TaxAmount currencyID="${currency}">${money(taxAmountRounded)}</cbc:TaxAmount>`,
      '<cac:TaxSubtotal>',
      `<cbc:TaxableAmount currencyID="${currency}">${money(taxBase)}</cbc:TaxableAmount>`,
      `<cbc:TaxAmount currencyID="${currency}">${money(taxAmountRounded)}</cbc:TaxAmount>`,
      '<cac:TaxCategory>',
      '<cbc:ID>S</cbc:ID>',
      `<cbc:Percent>${rate(taxRate)}</cbc:Percent>`,
      '<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>',
      '</cac:TaxCategory>',
      '</cac:TaxSubtotal>',
      '</cac:TaxTotal>',
      '<cac:LegalMonetaryTotal>',
      `<cbc:LineExtensionAmount currencyID="${currency}">${money(subtotal)}</cbc:LineExtensionAmount>`,
      `<cbc:TaxExclusiveAmount currencyID="${currency}">${money(taxExclusive)}</cbc:TaxExclusiveAmount>`,
      `<cbc:TaxInclusiveAmount currencyID="${currency}">${money(taxInclusive)}</cbc:TaxInclusiveAmount>`,
      `<cbc:AllowanceTotalAmount currencyID="${currency}">${money(discount)}</cbc:AllowanceTotalAmount>`,
      `<cbc:PayableAmount currencyID="${currency}">${money(payable)}</cbc:PayableAmount>`,
      '</cac:LegalMonetaryTotal>',
      linesXml,
      '</Invoice>',
    ].join('');
  }

  protected calculateHash(previousHash: string, xml: string): string {
    return crypto
      .createHash('sha256')
      .update(previousHash + xml)
      .digest('hex');
  }

  protected generateQRCode(
    orderData: any,
    hash: string,
    signature: string | null,
    settings?: ComplianceSettings | null,
  ): string {
    // Base64 encoded TLV per ZATCA Phase 1/2
    const sellerName =
      orderData?.sellerName ||
      orderData?.storeName ||
      orderData?.storeNameEn ||
      orderData?.storeNameAr ||
      'Unknown';
    const vatNumber =
      orderData?.vatNumber ||
      settings?.vatNumber ||
      orderData?.taxNumber ||
      '';
    const timestamp =
      orderData?.issuedAt ||
      orderData?.createdAt ||
      new Date().toISOString();

    const total = new Decimal(orderData?.grandTotal || orderData?.total || 0)
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
      .toFixed(2);
    const vatTotal = new Decimal(
      orderData?.taxAmount || orderData?.vatAmount || 0,
    )
      .toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN)
      .toFixed(2);

    const tags: Array<{ tag: number; value: string }> = [
      { tag: 1, value: String(sellerName) },
      { tag: 2, value: String(vatNumber) },
      { tag: 3, value: String(timestamp) },
      { tag: 4, value: String(total) },
      { tag: 5, value: String(vatTotal) },
    ];

    if (hash) {
      tags.push({ tag: 6, value: String(hash) });
    }
    if (signature) {
      tags.push({ tag: 7, value: String(signature) });
    }

    return this.encodeTlv(tags).toString('base64');
  }

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.repo.countInvoices();
    return `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(6, '0')}`;
  }

  private normalizeItems(orderData: any): Array<{
    name: string;
    quantity: Decimal;
    unitPrice: Decimal;
    lineTotal: Decimal;
  }> {
    const rawItems = orderData?.items || orderData?.orderItems || [];
    return rawItems.map((item: any) => {
      const quantity = new Decimal(item?.quantity ?? 1);
      const unitPrice = new Decimal(
        item?.unitPrice ?? item?.price ?? item?.unitPriceAmount ?? 0,
      );
      const lineTotal = item?.lineTotal != null
        ? new Decimal(item.lineTotal)
        : unitPrice.times(quantity);
      const name =
        item?.name || item?.productNameEn || item?.productName || 'Item';

      return {
        name: String(name),
        quantity,
        unitPrice,
        lineTotal,
      };
    });
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private encodeTlv(tags: Array<{ tag: number; value: string }>): Buffer {
    const chunks: Buffer[] = [];
    for (const { tag, value } of tags) {
      const valueBytes = Buffer.from(value, 'utf8');
      const length = valueBytes.length;
      if (length > 255) {
        throw new BadRequestException(
          `TLV value too long for tag ${tag} (length ${length})`,
        );
      }
      chunks.push(Buffer.from([tag]));
      chunks.push(Buffer.from([length]));
      chunks.push(valueBytes);
    }
    return Buffer.concat(chunks);
  }

  protected signInvoiceXml(
    xml: string,
    settings?: ComplianceSettings | null,
  ): string | null {
    const privateKey = settings?.zatcaPrivateKey;
    if (!privateKey) return null;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(xml);
    signer.end();
    return signer.sign(privateKey, 'base64');
  }

  protected verifySignature(
    xml: string,
    signature: string,
    settings?: ComplianceSettings | null,
  ): boolean {
    const publicKey = settings?.zatcaCertificate;
    if (!publicKey) return false;
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(xml);
    verifier.end();
    return verifier.verify(publicKey, signature, 'base64');
  }

  private appendSignature(xml: string, signature: string): string {
    return `${xml}<Signature>${signature}</Signature>`;
  }

  async submitInvoice(invoiceId: string): Promise<ZATCAInvoice> {
    const invoice = await this.repo.findById(invoiceId);
    if (!invoice) throw new NotFoundException('Invoice not found');

    // Simulate submission (real implementation would call ZATCA API)
    const updated = await this.repo.update(invoiceId, {
      submissionStatus: 'ACCEPTED',
      submittedAt: new Date(),
      responseCode: '200',
      responseMessage: 'Accepted',
    });

    await this.eventBus.publish(
      'InvoiceSubmitted',
      new InvoiceSubmittedEvent(invoiceId, 'ACCEPTED'),
    );
    return this.normalizeInvoice(updated);
  }

  async verifyHashChain(): Promise<HashChainStatus> {
    const invoices = await this.repo.findAllOrdered();
    if (invoices.length === 0) {
      return {
        lastInvoiceId: '',
        lastHash: '',
        chainValid: true,
        totalInvoices: 0,
      };
    }

    let expectedPrevious = '0'.repeat(64);
    for (const invoice of invoices) {
      const actualPrevious = invoice.previousHash || '0'.repeat(64);
      if (actualPrevious !== expectedPrevious) {
        return {
          lastInvoiceId: invoice.id,
          lastHash: expectedPrevious,
          chainValid: false,
          totalInvoices: invoices.length,
          brokenAtInvoiceId: invoice.id,
          expectedHash: expectedPrevious,
          actualHash: actualPrevious,
        };
      }

      const currentHash = this.resolveInvoiceHash(invoice);
      if (!currentHash || !/^[a-f0-9]{64}$/i.test(currentHash)) {
        return {
          lastInvoiceId: invoice.id,
          lastHash: expectedPrevious,
          chainValid: false,
          totalInvoices: invoices.length,
          brokenAtInvoiceId: invoice.id,
          expectedHash: expectedPrevious,
          actualHash: currentHash || '',
        };
      }

      expectedPrevious = currentHash;
    }

    return {
      lastInvoiceId: invoices[invoices.length - 1]?.id || '',
      lastHash: expectedPrevious,
      chainValid: true,
      totalInvoices: invoices.length,
    };
  }

  async getPendingInvoices(): Promise<ZATCAInvoice[]> {
    const invoices = await this.repo.findPending();
    return invoices.map((invoice) => this.normalizeInvoice(invoice));
  }
  async findByOrder(orderId: string): Promise<ZATCAInvoice | null> {
    const invoice = await this.repo.findByOrder(orderId);
    return invoice ? this.normalizeInvoice(invoice) : null;
  }

  private resolveInvoiceHash(invoice?: ZATCAInvoice | null): string | null {
    if (!invoice) return null;
    return invoice.invoiceHash || invoice.currentHash || invoice.hash || null;
  }

  private normalizeInvoice(
    invoice: ZATCAInvoice,
    extras?: {
      currentHash?: string;
      invoiceXML?: string;
      signedXml?: string | null;
      signature?: string | null;
    },
    ): ZATCAInvoice {
    if (!invoice) {
      return invoice;
    }

    const currentHash =
      invoice.currentHash || invoice.invoiceHash || invoice.hash || extras?.currentHash;
    const invoiceXML =
      invoice.invoiceXML || invoice.xmlContent || extras?.invoiceXML;
    const signedXml =
      invoice.signedXml || invoice.signedXML || extras?.signedXml || null;

    return {
      ...invoice,
      currentHash,
      hash: invoice.hash || currentHash,
      invoiceHash: invoice.invoiceHash || currentHash,
      invoiceXML,
      xmlContent: invoice.xmlContent || invoiceXML,
      signedXml,
      signedXML: invoice.signedXML || signedXml,
      signature: extras?.signature || invoice.signature,
      qrCode: invoice.qrCode || invoice.qrCodeData,
      qrCodeData: invoice.qrCodeData || invoice.qrCode,
      submissionStatus: invoice.submissionStatus || invoice.clearanceStatus,
    };
  }
}
