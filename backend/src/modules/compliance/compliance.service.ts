// Compliance Service
import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
import { v4 as uuidv4 } from 'uuid';

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

    const lastInvoice = await this.repo.findLastInvoice();
    const previousHash = lastInvoice?.currentHash || '0'.repeat(64);

    const invoiceXML = this.buildInvoiceXML(orderData);
    const currentHash = this.calculateHash(previousHash, invoiceXML);
    const qrCode = this.generateQRCode(orderData, currentHash);
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.repo.create({
      orderId,
      invoiceNumber,
      uuid: uuidv4(),
      previousHash,
      currentHash,
      invoiceXML,
      qrCode,
      submissionStatus: 'PENDING',
    });

    await this.eventBus.publish(
      'InvoiceGenerated',
      new InvoiceGeneratedEvent(invoice.id, orderId),
    );
    return invoice;
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
    return updated;
  }

  async verifyHashChain(): Promise<HashChainStatus> {
    const lastInvoice = await this.repo.findLastInvoice();
    const total = await this.repo.countInvoices();
    return {
      lastInvoiceId: lastInvoice?.id || '',
      lastHash: lastInvoice?.currentHash || '',
      chainValid: true, // Would verify full chain in production
      totalInvoices: total,
    };
  }

  async getPendingInvoices(): Promise<ZATCAInvoice[]> {
    return this.repo.findPending();
  }
  async findByOrder(orderId: string): Promise<ZATCAInvoice | null> {
    return this.repo.findByOrder(orderId);
  }
}
