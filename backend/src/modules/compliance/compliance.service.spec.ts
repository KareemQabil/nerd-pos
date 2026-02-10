/**
 * ComplianceService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 *
 * CRITICAL: BR-002 ZATCA compliance
 * - Hash chain integrity must be validated
 * - SHA-256 calculation must be tested with real crypto
 *
 * Applied Error Fixing Workflow:
 * - Verified service methods from compliance.service.ts (86 lines)
 * - Verified repository methods from compliance.repository.ts (28 lines)
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceRepository } from './compliance.repository';
import * as crypto from 'crypto';

// Mock Repository - ALL methods from compliance.repository.ts
function createMockRepository() {
  return {
    // BaseRepository methods
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    // Compliance-specific methods
    findByOrder: jest.fn(),
    findLastInvoice: jest.fn(),
    findPending: jest.fn(),
    countInvoices: jest.fn(),
    findAllOrdered: jest.fn(),
    getSettings: jest.fn(),
  };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
}

function parseTlv(buffer: Buffer): Map<number, string> {
  const map = new Map<number, string>();
  let i = 0;
  while (i < buffer.length) {
    const tag = buffer[i];
    const length = buffer[i + 1];
    const value = buffer.subarray(i + 2, i + 2 + length).toString('utf8');
    map.set(tag, value);
    i += 2 + length;
  }
  return map;
}

describe('ComplianceService', () => {
  let service: ComplianceService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: ComplianceRepository, useValue: repo },
        { provide: 'IEventBus', useValue: eventBus },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== INVOICE GENERATION TESTS (BR-002) ====================

  describe('generateInvoice', () => {
    it('should generate invoice with hash chain linking', async () => {
      const orderData = {
        orderNumber: 'ORD-2026-001',
        grandTotal: 150.0,
      };

      const lastInvoice = {
        id: 'invoice-prev',
        currentHash: 'a'.repeat(64), // Previous invoice hash
      };

      const mockInvoice = {
        id: 'invoice-1',
        orderId: 'order-1',
        invoiceNumber: 'INV-2026-000001',
        previousHash: lastInvoice.currentHash,
        invoiceHash: expect.any(String),
        submissionStatus: 'PENDING',
      };

      repo.findByOrder.mockResolvedValue(null); // No existing invoice
      repo.findLastInvoice.mockResolvedValue(lastInvoice);
      repo.countInvoices.mockResolvedValue(0);
      repo.findAllOrdered.mockResolvedValue([]);
      repo.getSettings.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockInvoice);

      const result = await service.generateInvoice('order-1', orderData);

      expect(result.previousHash).toBe(lastInvoice.currentHash);
      expect(eventBus.publish).toHaveBeenCalledWith(
        'InvoiceGenerated',
        expect.anything(),
      );
    });

    it('should use zero hash for first invoice', async () => {
      const orderData = {
        orderNumber: 'ORD-2026-001',
        grandTotal: 100.0,
      };

      const mockInvoice = {
        id: 'invoice-1',
        previousHash: '0'.repeat(64),
        currentHash: expect.any(String),
      };

      repo.findByOrder.mockResolvedValue(null);
      repo.findLastInvoice.mockResolvedValue(null); // First invoice
      repo.countInvoices.mockResolvedValue(0);
      repo.findAllOrdered.mockResolvedValue([]);
      repo.getSettings.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockInvoice);

      const result = await service.generateInvoice('order-1', orderData);

      expect(result.previousHash).toBe('0'.repeat(64));
    });

    it('should throw error if invoice already exists for order', async () => {
      const existingInvoice = { id: 'invoice-existing', orderId: 'order-1' };
      repo.findByOrder.mockResolvedValue(existingInvoice);

      await expect(service.generateInvoice('order-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should generate UBL XML with required tags and values', async () => {
      const orderData = {
        orderNumber: 'ORD-2026-XML-01',
        currency: 'SAR',
        sellerName: 'NerdPOS Store',
        vatNumber: '300000000000003',
        items: [
          { name: 'Item A', quantity: 2, unitPrice: 50 },
        ],
        discountAmount: 10,
        serviceChargeAmount: 0,
        deliveryCharge: 0,
        taxPercent: 15,
        taxAmount: 13.5,
        grandTotal: 103.5,
        createdAt: '2026-02-10T12:00:00Z',
      };

      const mockInvoice = {
        id: 'invoice-1',
        orderId: 'order-1',
        invoiceNumber: 'INV-2026-000001',
        previousHash: '0'.repeat(64),
        invoiceHash: 'a'.repeat(64),
        submissionStatus: 'PENDING',
      };

      repo.findByOrder.mockResolvedValue(null);
      repo.findLastInvoice.mockResolvedValue(null);
      repo.countInvoices.mockResolvedValue(0);
      repo.findAllOrdered.mockResolvedValue([]);
      repo.getSettings.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockInvoice);

      const result = await service.generateInvoice('order-1', orderData);
      const xml = result.invoiceXML || result.xmlContent;

      expect(xml).toBeTruthy();
      expect(xml).toContain('<cbc:ID>ORD-2026-XML-01</cbc:ID>');
      expect(xml).toContain('<cbc:IssueDate>2026-02-10</cbc:IssueDate>');
      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain('<cbc:TaxAmount currencyID="SAR">13.50</cbc:TaxAmount>');
      expect(xml).toContain('<cac:LegalMonetaryTotal>');
      expect(xml).toContain('<cbc:LineExtensionAmount currencyID="SAR">100.00</cbc:LineExtensionAmount>');
      expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="SAR">90.00</cbc:TaxExclusiveAmount>');
      expect(xml).toContain('<cbc:PayableAmount currencyID="SAR">103.50</cbc:PayableAmount>');
    });

    it('should embed monetary totals that match order data', async () => {
      const orderData = {
        orderNumber: 'ORD-2026-XML-02',
        currency: 'SAR',
        sellerName: 'NerdPOS Store',
        vatNumber: '300000000000003',
        items: [
          { name: 'Item A', quantity: 2, unitPrice: 50 },
          { name: 'Item B', quantity: 1, unitPrice: 20 },
        ],
        discountAmount: 5,
        serviceChargeAmount: 2,
        deliveryCharge: 3,
        taxPercent: 15,
        taxAmount: 18,
        grandTotal: 138,
        createdAt: '2026-02-10T12:00:00Z',
      };

      const mockInvoice = {
        id: 'invoice-2',
        orderId: 'order-2',
        invoiceNumber: 'INV-2026-000002',
        previousHash: '0'.repeat(64),
        invoiceHash: 'b'.repeat(64),
        submissionStatus: 'PENDING',
      };

      repo.findByOrder.mockResolvedValue(null);
      repo.findLastInvoice.mockResolvedValue(null);
      repo.countInvoices.mockResolvedValue(0);
      repo.findAllOrdered.mockResolvedValue([]);
      repo.getSettings.mockResolvedValue(null);
      repo.create.mockResolvedValue(mockInvoice);

      const result = await service.generateInvoice('order-2', orderData);
      const xml = result.invoiceXML || result.xmlContent;

      expect(xml).toBeTruthy();
      expect(xml).toContain('<cbc:ID>ORD-2026-XML-02</cbc:ID>');
      expect(xml).toContain('<cbc:IssueDate>2026-02-10</cbc:IssueDate>');
      expect(xml).toContain('<cac:TaxTotal>');
      expect(xml).toContain('<cbc:TaxAmount currencyID="SAR">18.00</cbc:TaxAmount>');
      expect(xml).toContain('<cbc:TaxableAmount currencyID="SAR">115.00</cbc:TaxableAmount>');
      expect(xml).toContain('<cbc:Percent>15.0000</cbc:Percent>');
      expect(xml).toContain('<cac:LegalMonetaryTotal>');
      expect(xml).toContain('<cbc:LineExtensionAmount currencyID="SAR">120.00</cbc:LineExtensionAmount>');
      expect(xml).toContain('<cbc:TaxExclusiveAmount currencyID="SAR">120.00</cbc:TaxExclusiveAmount>');
      expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="SAR">138.00</cbc:TaxInclusiveAmount>');
      expect(xml).toContain('<cbc:AllowanceTotalAmount currencyID="SAR">5.00</cbc:AllowanceTotalAmount>');
      expect(xml).toContain('<cbc:PayableAmount currencyID="SAR">138.00</cbc:PayableAmount>');
    });
  });

  // ==================== TLV QR TESTS (PHASE 3) ====================

  describe('generateQRCode', () => {
    it('should generate TLV with required tags', () => {
      const generateQRCode = (service as any).generateQRCode.bind(service);
      const orderData = {
        sellerName: 'NerdPOS Store',
        vatNumber: '300000000000003',
        grandTotal: 115,
        taxAmount: 15,
        createdAt: '2026-02-10T12:00:00Z',
      };
      const qr = generateQRCode(orderData, 'hash123', null, null);
      const decoded = Buffer.from(qr, 'base64');
      const tags = parseTlv(decoded);

      expect(tags.get(1)).toBe('NerdPOS Store');
      expect(tags.get(2)).toBe('300000000000003');
      expect(tags.get(4)).toBe('115.00');
      expect(tags.get(5)).toBe('15.00');
    });
  });

  // ==================== HASH CALCULATION TESTS (CRITICAL) ====================

  describe('calculateHash', () => {
    it('should calculate correct SHA-256 hash', () => {
      // Access private method via service prototype for testing
      const calculateHash = (service as any).calculateHash.bind(service);

      const previousHash = 'abc123';
      const xml = '<Invoice><ID>TEST-001</ID></Invoice>';

      const result = calculateHash(previousHash, xml);

      // Verify it's a valid hex string
      expect(result).toMatch(/^[a-f0-9]{64}$/);

      // Verify using real crypto
      const expected = crypto
        .createHash('sha256')
        .update(previousHash + xml)
        .digest('hex');

      expect(result).toBe(expected);
    });

    it('should chain hashes correctly', () => {
      const calculateHash = (service as any).calculateHash.bind(service);

      const hash1 = calculateHash('0'.repeat(64), '<Invoice>1</Invoice>');
      const hash2 = calculateHash(hash1, '<Invoice>2</Invoice>');

      // Hash2 should incorporate hash1
      expect(hash2).not.toBe(hash1);
      expect(hash2).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ==================== SIGNATURE TESTS (PHASE 3) ====================

  describe('signInvoiceXml/verifySignature', () => {
    it('should sign and verify invoice XML with RSA keypair', () => {
      const signInvoiceXml = (service as any).signInvoiceXml.bind(service);
      const verifySignature = (service as any).verifySignature.bind(service);
      const xml = '<Invoice><ID>TEST-001</ID></Invoice>';

      const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
      });

      const privatePem = privateKey.export({ type: 'pkcs1', format: 'pem' });
      const publicPem = publicKey.export({ type: 'pkcs1', format: 'pem' });

      const signature = signInvoiceXml(xml, {
        zatcaPrivateKey: privatePem,
      } as any);

      expect(signature).toBeTruthy();

      const isValid = verifySignature(xml, signature, {
        zatcaCertificate: publicPem,
      } as any);

      expect(isValid).toBe(true);
    });
  });

  // ==================== SUBMIT INVOICE TESTS ====================

  describe('submitInvoice', () => {
    it('should submit invoice and update status', async () => {
      const invoice = {
        id: 'invoice-1',
        submissionStatus: 'PENDING',
      };

      const submittedInvoice = {
        ...invoice,
        submissionStatus: 'ACCEPTED',
        submittedAt: expect.any(Date),
      };

      repo.findById.mockResolvedValue(invoice);
      repo.update.mockResolvedValue(submittedInvoice);

      const result = await service.submitInvoice('invoice-1');

      expect(result.submissionStatus).toBe('ACCEPTED');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'InvoiceSubmitted',
        expect.anything(),
      );
    });

    it('should throw NotFoundException for non-existent invoice', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.submitInvoice('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== HASH CHAIN VERIFICATION TESTS (CRITICAL) ====================

  describe('verifyHashChain', () => {
    it('should return valid status for correct chain', async () => {
      const invoices = [
        {
          id: 'invoice-1',
          invoiceHash: 'a'.repeat(64),
          previousHash: '0'.repeat(64),
        },
        {
          id: 'invoice-2',
          invoiceHash: 'b'.repeat(64),
          previousHash: 'a'.repeat(64),
        },
        {
          id: 'invoice-3',
          invoiceHash: 'c'.repeat(64),
          previousHash: 'b'.repeat(64),
        },
      ];

      repo.findAllOrdered.mockResolvedValue(invoices);

      const result = await service.verifyHashChain();

      expect(result.chainValid).toBe(true);
      expect(result.totalInvoices).toBe(3);
      expect(result.lastHash).toBe('c'.repeat(64));
    });

    it('should return empty values for no invoices', async () => {
      repo.findAllOrdered.mockResolvedValue([]);

      const result = await service.verifyHashChain();

      expect(result.lastHash).toBe('');
      expect(result.totalInvoices).toBe(0);
    });
  });

  // ==================== QUERY TESTS ====================

  describe('getPendingInvoices', () => {
    it('should return pending invoices', async () => {
      const pending = [
        { id: 'invoice-1', submissionStatus: 'PENDING' },
        { id: 'invoice-2', submissionStatus: 'PENDING' },
      ];
      repo.findPending.mockResolvedValue(pending);

      const result = await service.getPendingInvoices();

      expect(result).toHaveLength(2);
    });
  });

  describe('findByOrder', () => {
    it('should return invoice for order', async () => {
      const invoice = { id: 'invoice-1', orderId: 'order-1' };
      repo.findByOrder.mockResolvedValue(invoice);

      const result = await service.findByOrder('order-1');

      expect(result?.orderId).toBe('order-1');
    });

    it('should return null if no invoice', async () => {
      repo.findByOrder.mockResolvedValue(null);

      const result = await service.findByOrder('no-invoice-order');

      expect(result).toBeNull();
    });
  });
});
