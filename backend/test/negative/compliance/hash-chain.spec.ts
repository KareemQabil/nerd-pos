/**
 * COMP-01: ZATCA Hash Chain Verification
 *
 * Ensures compliance invoice hash chain is validated and breaks are detected.
 */

import { Test } from '@nestjs/testing';
import { InternalServerErrorAppException } from '../../../src/common/exceptions';
import { ErrorMessages } from '../../../src/common/constants';
import { ComplianceService } from '../../../src/modules/compliance/compliance.service';
import { ComplianceRepository } from '../../../src/modules/compliance/compliance.repository';
import * as crypto from 'crypto';
import { generateTestId } from '../../helpers/test-helpers';

describe('COMP-01: ZATCA Hash Chain Verification', () => {
  let service: ComplianceService;
  let repo: {
    create: jest.Mock;
    findByOrder: jest.Mock;
    findLastInvoice: jest.Mock;
    findAllOrdered: jest.Mock;
    getSettings: jest.Mock;
  };
  const invoices: any[] = [];

  const zeroHash = '0'.repeat(64);
  const hash = (input: string) =>
    crypto.createHash('sha256').update(input).digest('hex');

  beforeAll(async () => {
    repo = {
      create: jest.fn(async (data: any) => {
        const invoice = {
          id: data.id ?? `inv-${invoices.length + 1}`,
          createdAt: data.createdAt ?? new Date(),
          ...data,
        };
        invoices.push(invoice);
        return invoice;
      }),
      findByOrder: jest.fn(async (orderId: string) => {
        return invoices.find((inv) => inv.orderId === orderId) ?? null;
      }),
      findLastInvoice: jest.fn(async () => {
        const sorted = [...invoices].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
        return sorted[sorted.length - 1] ?? null;
      }),
      findAllOrdered: jest.fn(async () => {
        return [...invoices].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      }),
      getSettings: jest.fn(async () => null),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ComplianceService,
        { provide: ComplianceRepository, useValue: repo },
        {
          provide: 'IEventBus',
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(ComplianceService);
  });

  afterEach(async () => {
    invoices.length = 0;
  });

  it('flags a broken chain when previousHash is tampered', async () => {
    const firstInvoice = await repo.create({
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-1'),
        previousHash: zeroHash,
        qrCode: 'qr-1',
        xmlContent: '<Invoice>test-1</Invoice>',
        signedXml: '<Invoice>signed-1</Invoice>',
        submissionStatus: 'PENDING',
    });

    const secondInvoice = await repo.create({
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-2'),
        previousHash: hash('tampered'),
        qrCode: 'qr-2',
        xmlContent: '<Invoice>test-2</Invoice>',
        signedXml: '<Invoice>signed-2</Invoice>',
        submissionStatus: 'PENDING',
    });

    const status = await service.verifyHashChain();

    expect(status.chainValid).toBe(false);
    expect(status.brokenAtInvoiceId).toBe(secondInvoice.id);
    expect(status.expectedHash).toBe(firstInvoice.invoiceHash);
  });

  it('blocks invoice generation when hash chain is invalid', async () => {
    await repo.create({
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-3'),
        previousHash: zeroHash,
        qrCode: 'qr-3',
        xmlContent: '<Invoice>test-3</Invoice>',
        signedXml: '<Invoice>signed-3</Invoice>',
        submissionStatus: 'PENDING',
    });

    await repo.create({
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-4'),
        previousHash: hash('broken-chain'),
        qrCode: 'qr-4',
        xmlContent: '<Invoice>test-4</Invoice>',
        signedXml: '<Invoice>signed-4</Invoice>',
        submissionStatus: 'PENDING',
    });

    const result = service.generateInvoice(generateTestId('order'), {
      orderNumber: 'ORD-COMP-01',
      grandTotal: 100,
    });
    await expect(result).rejects.toThrow(InternalServerErrorAppException);
    await expect(result).rejects.toMatchObject({
      response: { messageKey: ErrorMessages.HashChainValidationFailed.key },
    });
  });
});
