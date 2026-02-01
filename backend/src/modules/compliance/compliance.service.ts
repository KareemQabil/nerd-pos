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
import { ZATCAInvoice, HashChainStatus } from './entities/compliance.entity';
import * as crypto from 'crypto';

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

    const invoiceXML = this.buildInvoiceXML(orderData);
    const currentHash = this.calculateHash(previousHash, invoiceXML);
    const qrCode = this.generateQRCode(orderData, currentHash);
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.repo.create({
      orderId,
      invoiceNumber,
      previousHash,
      invoiceHash: currentHash,
      qrCode,
      submissionStatus: 'PENDING',
    });

    await this.eventBus.publish(
      'InvoiceGenerated',
      new InvoiceGeneratedEvent(invoice.id, orderId),
    );
    return this.normalizeInvoice(invoice, {
      currentHash,
      invoiceXML,
    });
  }

  private buildInvoiceXML(orderData: any): string {
    // Simplified - real implementation would build ZATCA-compliant XML
    return `<Invoice><ID>${orderData.orderNumber}</ID><Total>${orderData.grandTotal}</Total></Invoice>`;
  }

  private calculateHash(previousHash: string, xml: string): string {
    return crypto
      .createHash('sha256')
      .update(previousHash + xml)
      .digest('hex');
  }

  private generateQRCode(orderData: any, hash: string): string {
    // Base64 encoded TLV per ZATCA spec
    return Buffer.from(
      JSON.stringify({ hash: hash.slice(0, 16), total: orderData.grandTotal }),
    ).toString('base64');
  }

  private async generateInvoiceNumber(): Promise<string> {
    const count = await this.repo.countInvoices();
    return `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(6, '0')}`;
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
    return (
      (invoice as any).invoiceHash ||
      (invoice as any).currentHash ||
      (invoice as any).hash ||
      null
    );
  }

  private normalizeInvoice(
    invoice: ZATCAInvoice,
    extras?: { currentHash?: string; invoiceXML?: string },
  ): ZATCAInvoice {
    if (!invoice) {
      return invoice;
    }

    const currentHash =
      (invoice as any).currentHash ||
      (invoice as any).invoiceHash ||
      (invoice as any).hash ||
      extras?.currentHash;
    const invoiceXML =
      (invoice as any).invoiceXML ||
      (invoice as any).xmlContent ||
      extras?.invoiceXML;

    return {
      ...invoice,
      currentHash,
      hash: (invoice as any).hash || currentHash,
      invoiceHash: (invoice as any).invoiceHash || currentHash,
      invoiceXML,
      xmlContent: (invoice as any).xmlContent || invoiceXML,
      qrCode: (invoice as any).qrCode || (invoice as any).qrCodeData,
      qrCodeData: (invoice as any).qrCodeData || (invoice as any).qrCode,
      submissionStatus:
        (invoice as any).submissionStatus || (invoice as any).clearanceStatus,
      uuid: (invoice as any).uuid,
    };
  }
}
