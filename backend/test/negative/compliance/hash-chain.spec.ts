/**
 * COMP-01: ZATCA Hash Chain Verification
 *
 * Ensures compliance invoice hash chain is validated and breaks are detected.
 */

import { Test } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ComplianceService } from '../../../src/modules/compliance/compliance.service';
import { ComplianceRepository } from '../../../src/modules/compliance/compliance.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import * as crypto from 'crypto';
import { generateTestId } from '../../helpers/test-helpers';

describe('COMP-01: ZATCA Hash Chain Verification', () => {
  let service: ComplianceService;
  let prisma: PrismaService;
  const createdInvoiceIds: string[] = [];

  const zeroHash = '0'.repeat(64);
  const hash = (input: string) =>
    crypto.createHash('sha256').update(input).digest('hex');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ComplianceService,
        ComplianceRepository,
        PrismaService,
        {
          provide: 'IEventBus',
          useValue: { publish: jest.fn(), subscribe: jest.fn() },
        },
      ],
    }).compile();

    service = moduleRef.get(ComplianceService);
    prisma = moduleRef.get(PrismaService);
  });

  afterEach(async () => {
    if (createdInvoiceIds.length > 0) {
      await prisma.complianceInvoice.deleteMany({
        where: { id: { in: createdInvoiceIds } },
      });
      createdInvoiceIds.length = 0;
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('flags a broken chain when previousHash is tampered', async () => {
    const firstInvoice = await prisma.complianceInvoice.create({
      data: {
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-1'),
        previousHash: zeroHash,
        qrCode: 'qr-1',
        submissionStatus: 'PENDING',
      },
    });
    createdInvoiceIds.push(firstInvoice.id);

    const secondInvoice = await prisma.complianceInvoice.create({
      data: {
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-2'),
        previousHash: hash('tampered'),
        qrCode: 'qr-2',
        submissionStatus: 'PENDING',
      },
    });
    createdInvoiceIds.push(secondInvoice.id);

    const status = await service.verifyHashChain();

    expect(status.chainValid).toBe(false);
    expect(status.brokenAtInvoiceId).toBe(secondInvoice.id);
    expect(status.expectedHash).toBe(firstInvoice.invoiceHash);
  });

  it('blocks invoice generation when hash chain is invalid', async () => {
    const firstInvoice = await prisma.complianceInvoice.create({
      data: {
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-3'),
        previousHash: zeroHash,
        qrCode: 'qr-3',
        submissionStatus: 'PENDING',
      },
    });
    createdInvoiceIds.push(firstInvoice.id);

    const secondInvoice = await prisma.complianceInvoice.create({
      data: {
        orderId: generateTestId('order'),
        invoiceNumber: generateTestId('INV'),
        invoiceHash: hash('invoice-4'),
        previousHash: hash('broken-chain'),
        qrCode: 'qr-4',
        submissionStatus: 'PENDING',
      },
    });
    createdInvoiceIds.push(secondInvoice.id);

    await expect(
      service.generateInvoice(generateTestId('order'), {
        orderNumber: 'ORD-COMP-01',
        grandTotal: 100,
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
