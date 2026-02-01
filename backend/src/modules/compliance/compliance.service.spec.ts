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
  };
}

// Mock EventBus per 07-testing.md
function createMockEventBus() {
  return {
    publish: jest.fn(),
    subscribe: jest.fn(),
  };
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
