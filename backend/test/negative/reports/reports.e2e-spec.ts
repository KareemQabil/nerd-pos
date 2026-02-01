import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { createValidationPipe } from '../../../src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from '../../../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';
import { PrismaService } from '../../../src/core/prisma/prisma.service';
import { PERMISSIONS } from '../../../src/core/constants/permissions';
import { OrderStatus } from '../../../src/core/constants/enums';
import {
  cleanupTestData,
  createTestSession,
  generateTestId,
} from '../../helpers/test-helpers';

describe('Reports API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authHeader: string;
  let forbiddenHeader: string;
  let roleAllowedId: string;
  let roleDeniedId: string;
  const createdPermissionIds: string[] = [];
  const createdSessionIds: string[] = [];
  const createdWarehouseIds: string[] = [];
  const createdCategoryIds: string[] = [];
  const createdProductIds: string[] = [];
  const createdInventoryItemIds: string[] = [];

  const reportPermissions = [
    PERMISSIONS.REPORTS_SALES_VIEW,
    PERMISSIONS.REPORTS_INVENTORY_VIEW,
  ];

  const unwrapData = (body: any) =>
    body?.data && body.data.data !== undefined ? body.data.data : body?.data;
  const safeDelete = async (operation: () => Promise<unknown>) => {
    try {
      await operation();
    } catch {
      // Best-effort cleanup for shared DBs.
    }
  };

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

    for (const code of reportPermissions) {
      const existing = await prisma.permission.findUnique({ where: { code } });
      if (existing) continue;
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

    const allowedRoleName = generateTestId('reports-role');
    const allowedRole = await prisma.role.create({
      data: {
        name: allowedRoleName,
        nameAr: allowedRoleName,
        description: 'Reports e2e role',
        level: 5,
        isSystem: false,
        isActive: true,
      },
    });
    roleAllowedId = allowedRole.id;

    for (const code of reportPermissions) {
      const permission = await prisma.permission.findUnique({
        where: { code },
      });
      if (!permission) continue;
      await prisma.rolePermission.create({
        data: {
          roleId: allowedRole.id,
          permissionId: permission.id,
          assignedBy: 'e2e-test',
        },
      });
    }

    const deniedRoleName = generateTestId('reports-denied');
    const deniedRole = await prisma.role.create({
      data: {
        name: deniedRoleName,
        nameAr: deniedRoleName,
        description: 'Reports denied role',
        level: 5,
        isSystem: false,
        isActive: true,
      },
    });
    roleDeniedId = deniedRole.id;
  });

  beforeEach(async () => {
    const allowedUsername = generateTestId('reports-user');
    const allowedUser = await prisma.user.create({
      data: {
        username: allowedUsername,
        email: `${allowedUsername}@example.com`,
        password: 'test-password',
        nameEn: 'Reports E2E User',
        nameAr: 'Reports E2E User',
        role: 'MANAGER',
        roleId: roleAllowedId,
        isActive: true,
      },
    });

    const allowedToken = jwtService.sign({
      sub: allowedUser.id,
      username: allowedUser.username,
      roleId: allowedUser.roleId || allowedUser.role,
      role: allowedUser.role,
    });
    authHeader = `Bearer ${allowedToken}`;

    const deniedUsername = generateTestId('reports-denied-user');
    const deniedUser = await prisma.user.create({
      data: {
        username: deniedUsername,
        email: `${deniedUsername}@example.com`,
        password: 'test-password',
        nameEn: 'Reports Denied User',
        nameAr: 'Reports Denied User',
        role: 'MANAGER',
        roleId: roleDeniedId,
        isActive: true,
      },
    });

    const deniedToken = jwtService.sign({
      sub: deniedUser.id,
      username: deniedUser.username,
      roleId: deniedUser.roleId || deniedUser.role,
      role: deniedUser.role,
    });
    forbiddenHeader = `Bearer ${deniedToken}`;
  });

  afterEach(async () => {
    await cleanupTestData(prisma);
    if (createdInventoryItemIds.length > 0) {
      await safeDelete(() =>
        prisma.inventoryItem.deleteMany({
          where: { id: { in: createdInventoryItemIds } },
        }),
      );
      createdInventoryItemIds.length = 0;
    }
    if (createdProductIds.length > 0) {
      await safeDelete(() =>
        prisma.product.deleteMany({
          where: { id: { in: createdProductIds } },
        }),
      );
      createdProductIds.length = 0;
    }
    if (createdSessionIds.length > 0) {
      await prisma.registerSession.deleteMany({
        where: { id: { in: createdSessionIds } },
      });
      createdSessionIds.length = 0;
    }
    if (createdWarehouseIds.length > 0) {
      await safeDelete(() =>
        prisma.warehouse.deleteMany({
          where: { id: { in: createdWarehouseIds } },
        }),
      );
      createdWarehouseIds.length = 0;
    }
    if (createdCategoryIds.length > 0) {
      await safeDelete(() =>
        prisma.category.deleteMany({
          where: { id: { in: createdCategoryIds } },
        }),
      );
      createdCategoryIds.length = 0;
    }
  });

  afterAll(async () => {
    if (roleAllowedId) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: roleAllowedId },
      });
      await prisma.role.deleteMany({ where: { id: roleAllowedId } });
    }
    if (roleDeniedId) {
      await prisma.role.deleteMany({ where: { id: roleDeniedId } });
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

  it('rejects unauthorized access to reports', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/daily-sales')
      .query({ date: '2026-01-27' })
      .expect(401);
  });

  it('rejects access without permissions', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reports/daily-sales')
      .set('Authorization', forbiddenHeader)
      .query({ date: '2026-01-27' })
      .expect(403);
  });

  it('returns daily sales report for the requested date', async () => {
    const reportDate = new Date('2026-01-27T12:00:00Z');
    const session = await createTestSession(prisma);
    createdSessionIds.push(session.id);

    await prisma.salesOrder.create({
      data: {
        orderNumber: generateTestId('ORD'),
        orderType: 'DINE_IN',
        status: OrderStatus.COMPLETED,
        sessionId: session.id,
        businessDate: reportDate,
        orderDate: reportDate,
        itemSubtotal: 100,
        serviceChargeRate: 0,
        serviceChargeAmount: 0,
        deliveryCharge: 0,
        subtotalBeforeTax: 100,
        taxRate: 0.15,
        taxAmount: 15,
        discountAmount: 0,
        grandTotal: 115,
      },
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: generateTestId('ORD'),
        orderType: 'TAKEAWAY',
        status: OrderStatus.PAID,
        sessionId: session.id,
        businessDate: reportDate,
        orderDate: reportDate,
        itemSubtotal: 50,
        serviceChargeRate: 0,
        serviceChargeAmount: 0,
        deliveryCharge: 0,
        subtotalBeforeTax: 50,
        taxRate: 0.15,
        taxAmount: 7.5,
        discountAmount: 0,
        grandTotal: 57.5,
      },
    });

    await prisma.salesOrder.create({
      data: {
        orderNumber: generateTestId('ORD'),
        orderType: 'TAKEAWAY',
        status: OrderStatus.CANCELLED,
        sessionId: session.id,
        businessDate: reportDate,
        orderDate: reportDate,
        itemSubtotal: 999,
        serviceChargeRate: 0,
        serviceChargeAmount: 0,
        deliveryCharge: 0,
        subtotalBeforeTax: 999,
        taxRate: 0.15,
        taxAmount: 150,
        discountAmount: 0,
        grandTotal: 1149,
      },
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/daily-sales')
      .set('Authorization', authHeader)
      .query({ date: '2026-01-27' })
      .expect(200);

    const payload = unwrapData(res.body);
    expect(payload.date).toBe('2026-01-27');
    expect(payload.totalSales).toBe(172.5);
    expect(payload.totalTax).toBe(22.5);
    expect(payload.orderCount).toBe(2);
    expect(payload.averageOrderValue).toBe(86.25);
  });

  it('returns z-report totals for a session', async () => {
    const session = await prisma.registerSession.create({
      data: {
        userId: generateTestId('user'),
        terminalId: generateTestId('terminal'),
        businessDate: new Date('2026-01-27'),
        openingBalance: 1000,
        status: 'OPEN',
        totalCashSales: 1200,
        totalCardSales: 700,
        totalOtherSales: 100,
        totalRefunds: 50,
        ordersCount: 42,
      },
    });
    createdSessionIds.push(session.id);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/reports/z-report/${session.id}`)
      .set('Authorization', authHeader)
      .expect(200);

    const payload = unwrapData(res.body);
    expect(payload.sessionId).toBe(session.id);
    expect(payload.totalSales).toBe(2000);
    expect(payload.cashSales).toBe(1200);
    expect(payload.cardSales).toBe(700);
    expect(payload.otherSales).toBe(100);
    expect(payload.refunds).toBe(50);
    expect(payload.orderCount).toBe(42);
  });

  it('returns inventory valuation totals', async () => {
    const category = await prisma.category.create({
      data: {
        nameEn: 'Reports Test Category',
        nameAr: 'Reports Test Category AR',
        sortOrder: 1,
        isActive: true,
      },
    });
    createdCategoryIds.push(category.id);

    const product = await prisma.product.create({
      data: {
        sku: generateTestId('SKU'),
        nameEn: 'Report Item',
        nameAr: 'Report Item AR',
        categoryId: category.id,
        price: 10,
        isActive: true,
      },
    });
    createdProductIds.push(product.id);

    const warehouse = await prisma.warehouse.create({
      data: {
        code: `WH${Date.now()}`,
        nameEn: 'Reports Warehouse',
        nameAr: 'Reports Warehouse AR',
        isActive: true,
        isDefault: true,
      },
    });
    createdWarehouseIds.push(warehouse.id);

    await prisma.inventoryItem.create({
      data: {
        productId: product.id,
        warehouseId: warehouse.id,
        quantityOnHand: 20,
        averageCost: 5,
      },
    });
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: { productId: product.id, warehouseId: warehouse.id },
    });
    if (inventoryItem?.id) {
      createdInventoryItemIds.push(inventoryItem.id);
    }

    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/inventory-valuation')
      .set('Authorization', authHeader)
      .expect(200);

    const payload = unwrapData(res.body);
    expect(payload.itemCount).toBe(1);
    expect(payload.totalValue).toBe(100);
    expect(payload.items[0].productId).toBe(product.id);
  });
});
