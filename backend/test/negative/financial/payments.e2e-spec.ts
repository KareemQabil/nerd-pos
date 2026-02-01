import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { createValidationPipe } from '../../../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import {
  cleanupTestData,
  createTestOrder,
  createTestSession,
  generateTestId,
} from '../../helpers/test-helpers';
import { OrderStatus } from '../../../src/core/constants/enums';
import { PERMISSIONS } from '../../../src/core/constants/permissions';

describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authHeader: string;
  let roleId: string;
  let testUserId: string;
  const createdPermissionIds: string[] = [];

  const paymentPermissions = [
    PERMISSIONS.PAYMENTS_CREATE,
    PERMISSIONS.PAYMENTS_SPLIT,
    PERMISSIONS.PAYMENTS_VIEW,
  ];
  const unwrapData = (body: any) =>
    body?.data && body.data.data !== undefined ? body.data.data : body?.data;

  beforeAll(async () => {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      process.env.JWT_SECRET = 'test-jwt-secret-32-characters-minimum';
    }

    const { AppModule } = await import('../../../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'api/docs', 'api/docs-json'],
    });

    await app.init();
    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    for (const code of paymentPermissions) {
      const existing = await prisma.permission.findUnique({ where: { code } });
      if (existing) {
        continue;
      }
      const created = await prisma.permission.create({
        data: {
          code,
          name: code,
          nameAr: code,
          module: code.split('.')[0],
          section: null,
        },
      });
      createdPermissionIds.push(created.id);
    }

    const roleName = generateTestId('payments-e2e-role');
    const role = await prisma.role.create({
      data: {
        name: roleName,
        nameAr: roleName,
        description: 'Payments e2e role',
        level: 5,
        isSystem: false,
        isActive: true,
      },
    });
    roleId = role.id;

    for (const code of paymentPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { code },
      });
      if (!permission) {
        continue;
      }
      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
          assignedBy: 'e2e-test',
        },
      });
    }
  });

  beforeEach(async () => {
    const username = generateTestId('payments-user');
    const user = await prisma.user.create({
      data: {
        username,
        email: `${username}@example.com`,
        password: 'test-password',
        nameEn: 'Payments E2E User',
        nameAr: 'Payments E2E User',
        role: 'CASHIER',
        roleId,
        isActive: true,
      },
    });
    testUserId = user.id;

    const token = jwtService.sign({
      sub: user.id,
      username: user.username,
      roleId: user.roleId || user.role,
      role: user.role,
    });

    authHeader = `Bearer ${token}`;
  });

  afterAll(async () => {
    if (roleId) {
      await prisma.rolePermission.deleteMany({ where: { roleId } });
      await prisma.role.deleteMany({ where: { id: roleId } });
    }

    if (createdPermissionIds.length > 0) {
      await prisma.permission.deleteMany({
        where: { id: { in: createdPermissionIds } },
      });
    }

    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
  });

  it('rejects payment with negative amount', async () => {
    const session = await createTestSession(prisma, { userId: testUserId });
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      sessionId: session.id,
      grandTotal: 100,
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({
        orderId: order.id,
        sessionId: session.id,
        method: 'CASH',
        amount: -1,
        createdBy: 'test-user',
      })
      .expect(400);
  });

  it('validates required fields on create payment', async () => {
    const session = await createTestSession(prisma, { userId: testUserId });
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      sessionId: session.id,
      grandTotal: 50,
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({
        orderId: order.id,
        method: 'CASH',
        amount: 10,
        createdBy: 'test-user',
      })
      .expect(400);
  });

  it('creates payment and fetches by order', async () => {
    const session = await createTestSession(prisma, { userId: testUserId });
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      sessionId: session.id,
      grandTotal: 25,
    });

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/payments')
      .set('Authorization', authHeader)
      .send({
        orderId: order.id,
        sessionId: session.id,
        method: 'CASH',
        amount: 25,
        receivedAmount: 25,
        createdBy: 'test-user',
      })
      .expect(201);

    const paymentPayload = unwrapData(createRes.body);
    const paymentId = paymentPayload?.id;
    expect(paymentId).toBeTruthy();

    const byOrderRes = await request(app.getHttpServer())
      .get(`/api/v1/payments/order/${order.id}`)
      .set('Authorization', authHeader)
      .expect(200);

    const byOrderPayload = unwrapData(byOrderRes.body);
    expect(Array.isArray(byOrderPayload)).toBe(true);
    expect(byOrderPayload.length).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', authHeader)
      .expect(200);
  });

  it('validates split payment payload', async () => {
    const session = await createTestSession(prisma, { userId: testUserId });
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      sessionId: session.id,
      grandTotal: 60,
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments/split')
      .set('Authorization', authHeader)
      .send({
        orderId: order.id,
        sessionId: session.id,
        userId: 'test-user',
      })
      .expect(400);
  });

  it('processes split payment', async () => {
    const session = await createTestSession(prisma, { userId: testUserId });
    const order = await createTestOrder(prisma, {
      status: OrderStatus.CONFIRMED,
      sessionId: session.id,
      grandTotal: 100,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/split')
      .set('Authorization', authHeader)
      .send({
        orderId: order.id,
        sessionId: session.id,
        userId: 'test-user',
        payments: [
          { method: 'CASH', amount: 40, receivedAmount: 40 },
          { method: 'CARD', amount: 60, cardLast4: '1234' },
        ],
      })
      .expect(201);

    const splitPayload = unwrapData(res.body);
    expect(Array.isArray(splitPayload)).toBe(true);
    expect(splitPayload.length).toBe(2);
  });
});
