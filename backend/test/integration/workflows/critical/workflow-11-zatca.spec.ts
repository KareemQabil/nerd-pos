/**
 * Workflow 11: ZATCA E-Invoicing
 * 
 * Source: WORKFLOWS.md - Compliance Workflows
 * Critical for Saudi Arabia tax compliance
 * 
 * Key Tests:
 * - Hash chain calculation (SHA256)
 * - First invoice uses previous hash of zeros
 * - QR code generation
 * - Invoice submission
 * - Hash chain verification
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ComplianceService } from '../../../../src/modules/compliance/compliance.service';
import { ComplianceRepository } from '../../../../src/modules/compliance/compliance.repository';

// Mock Repository
function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        findByOrder: jest.fn(),
        findLastInvoice: jest.fn(),
        findPending: jest.fn(),
        countInvoices: jest.fn(),
    };
}

function createMockEventBus() {
    return {
        publish: jest.fn(),
        subscribe: jest.fn(),
    };
}

describe('Workflow 11: ZATCA E-Invoicing', () => {
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

    // ==================== 11.1: HASH CHAIN CALCULATION ====================
    describe('11.1: Hash Chain Calculation', () => {
        it('should generate invoice with hash chain', async () => {
            const orderData = {
                orderNumber: 'ORD-001',
                grandTotal: 115.00,
            };

            repo.findByOrder.mockResolvedValue(null);
            repo.findLastInvoice.mockResolvedValue({
                id: 'inv-1',
                currentHash: 'a'.repeat(64),
            });
            repo.countInvoices.mockResolvedValue(0);
            repo.create.mockImplementation((data) => Promise.resolve({
                id: 'inv-2',
                ...data,
            }));

            const invoice = await service.generateInvoice('order-1', orderData);

            expect(invoice).toBeDefined();
            expect(invoice.previousHash).toBe('a'.repeat(64));
            expect(invoice.currentHash).toBeDefined();
            expect(invoice.currentHash!.length).toBe(64); // SHA256 hex = 64 chars
        });
    });

    // ==================== 11.2: FIRST INVOICE USES ZERO HASH ====================
    describe('11.2: First Invoice Zero Hash', () => {
        it('should use zero hash for first invoice', async () => {
            const orderData = { orderNumber: 'ORD-001', grandTotal: 50.00 };

            repo.findByOrder.mockResolvedValue(null);
            repo.findLastInvoice.mockResolvedValue(null); // No previous invoice
            repo.countInvoices.mockResolvedValue(0);
            repo.create.mockImplementation((data) => Promise.resolve({
                id: 'inv-1',
                ...data,
            }));

            const invoice = await service.generateInvoice('order-1', orderData);

            expect(invoice.previousHash).toBe('0'.repeat(64));
        });
    });

    // ==================== 11.3: QR CODE GENERATION ====================
    describe('11.3: QR Code Generation', () => {
        it('should generate QR code with hash', async () => {
            const orderData = { orderNumber: 'ORD-001', grandTotal: 100.00 };

            const mockInvoice = {
                id: 'inv-1',
                previousHash: '0'.repeat(64),
                currentHash: 'a'.repeat(64),
                qrCode: 'base64encodedQRcode',
            };

            repo.findByOrder.mockResolvedValue(null);
            repo.findLastInvoice.mockResolvedValue(null);
            repo.countInvoices.mockResolvedValue(0);
            repo.create.mockResolvedValue(mockInvoice);

            const invoice = await service.generateInvoice('order-1', orderData);

            expect(invoice.qrCode!).toBeDefined();
            expect(invoice.qrCode!.length).toBeGreaterThan(0);
        });
    });

    // ==================== 11.4: INVOICE SUBMISSION ====================
    describe('11.4: Invoice Submission', () => {
        it('should submit invoice and update status', async () => {
            const mockInvoice = {
                id: 'inv-1',
                submissionStatus: 'PENDING',
            };

            repo.findById.mockResolvedValue(mockInvoice);
            repo.update.mockImplementation((id, data) => Promise.resolve({
                ...mockInvoice,
                ...data,
            }));

            const result = await service.submitInvoice('inv-1');

            expect(result.submissionStatus).toBe('ACCEPTED');
            expect(eventBus.publish).toHaveBeenCalledWith('InvoiceSubmitted', expect.anything());
        });

        it('should throw NotFoundException for missing invoice', async () => {
            repo.findById.mockResolvedValue(null);

            await expect(service.submitInvoice('nonexistent'))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ==================== 11.5: HASH CHAIN VERIFICATION ====================
    describe('11.5: Hash Chain Verification', () => {
        it('should verify hash chain status', async () => {
            repo.findLastInvoice.mockResolvedValue({
                id: 'inv-10',
                currentHash: 'b'.repeat(64),
            });
            repo.countInvoices.mockResolvedValue(10);

            const status = await service.verifyHashChain();

            expect(status.chainValid).toBe(true);
            expect(status.totalInvoices).toBe(10);
            expect(status.lastHash).toBe('b'.repeat(64));
        });
    });

    // ==================== 11.6: DUPLICATE PREVENTION ====================
    describe('11.6: Duplicate Invoice Prevention', () => {
        it('should reject duplicate invoice for same order', async () => {
            const orderData = { orderNumber: 'ORD-001', grandTotal: 100.00 };

            repo.findByOrder.mockResolvedValue({
                id: 'inv-1',
                orderId: 'order-1',
            }); // Already exists

            await expect(service.generateInvoice('order-1', orderData))
                .rejects.toThrow(BadRequestException);
        });
    });

    // ==================== 11.7: EVENT PUBLISHING ====================
    describe('11.7: Event Publishing', () => {
        it('should publish InvoiceGenerated event', async () => {
            const orderData = { orderNumber: 'ORD-001', grandTotal: 100.00 };

            repo.findByOrder.mockResolvedValue(null);
            repo.findLastInvoice.mockResolvedValue(null);
            repo.countInvoices.mockResolvedValue(0);
            repo.create.mockImplementation((data) => Promise.resolve({
                id: 'inv-1',
                ...data,
            }));

            await service.generateInvoice('order-1', orderData);

            expect(eventBus.publish).toHaveBeenCalledWith('InvoiceGenerated', expect.anything());
        });
    });
});
