/**
 * FIN-10: Takeaway Service Charge
 *
 * Tests that service charge applies only to DINE_IN orders
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SalesService } from '../../../src/modules/sales/sales.service';
import { SalesRepository } from '../../../src/modules/sales/sales.repository';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { EventBusService } from '../../../src/core/event-bus/event-bus.service';
import {
  ItemSubtotalStep,
  ServiceChargeStep,
  DeliveryChargeStep,
  SubtotalBeforeTaxStep,
  TaxStep,
  DiscountStep,
  GrandTotalStep,
} from '../../../src/modules/sales/calculation-steps';
import { SessionsService } from '../../../src/modules/sessions/sessions.service';
import {
  createTestProduct,
  createTestSession,
  cleanupTestData,
} from '../../helpers/test-helpers';

describe('FIN-10: Takeaway Service Charge', () => {
  let salesService: SalesService;
  let prisma: PrismaService;
  let sessionId: string;
  let productId: string;
  let productNameEn: string;
  let productNameAr: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        SalesService,
        SalesRepository,
        PrismaService,
        EventBusService,
        ItemSubtotalStep,
        ServiceChargeStep,
        DeliveryChargeStep,
        SubtotalBeforeTaxStep,
        TaxStep,
        DiscountStep,
        GrandTotalStep,
        {
          provide: SessionsService,
          useValue: { getCurrentSession: jest.fn() },
        },
        { provide: 'IEventBus', useExisting: EventBusService },
      ],
    }).compile();

    await module.init();

    salesService = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    const session = await createTestSession(prisma);
    sessionId = session.id;

    const product = await createTestProduct(prisma, { price: 100 });
    productId = product.id;
    productNameEn = product.nameEn || 'Test Product';
    productNameAr = product.nameAr || 'Test Product AR';
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('should not apply service charge to TAKEAWAY order', async () => {
    const result = await salesService.createOrder(
      {
        type: 'TAKEAWAY',
        sessionId,
        items: [
          {
            productId,
            name: productNameEn,
            nameAr: productNameAr,
            price: 100,
            quantity: 1,
          },
        ],
      } as any,
      'test-user',
    );

    expect(result.serviceChargeAmount?.toString()).toBe('0');
    expect(result.serviceChargeRate?.toString()).toBe('0');
  });

  it('should apply service charge to DINE_IN order', async () => {
    const result = await salesService.createOrder(
      {
        type: 'DINE_IN',
        sessionId,
        items: [
          {
            productId,
            name: productNameEn,
            nameAr: productNameAr,
            price: 100,
            quantity: 1,
          },
        ],
      } as any,
      'test-user',
    );

    expect(result.serviceChargeAmount?.toString()).toBe('12');
    expect(result.serviceChargeRate?.toString()).toBe('0.12');
  });

  it('should not apply service charge to DELIVERY order', async () => {
    const result = await salesService.createOrder(
      {
        type: 'DELIVERY',
        sessionId,
        items: [
          {
            productId,
            name: productNameEn,
            nameAr: productNameAr,
            price: 100,
            quantity: 1,
          },
        ],
      } as any,
      'test-user',
    );

    expect(result.serviceChargeAmount?.toString()).toBe('0');
    expect(result.serviceChargeRate?.toString()).toBe('0');
  });
});
