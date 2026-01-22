# 🛠️ INFRASTRUCTURE IMPLEMENTATION PLAN

**Project:** NerdPOS Backend  
**Document Type:** Step-by-Step Implementation Guide  
**Date:** January 22, 2026  
**Reference:** INFRASTRUCTURE_AUDIT_REPORT.md

---

## 📋 OVERVIEW

This document provides exact code changes needed to fix all infrastructure gaps identified in the audit.

| Gap | Priority | Effort | Section |
|-----|----------|--------|---------|
| HttpExceptionFilter not registered | 🔴 CRITICAL | 2 min | [Section 1](#section-1-error-filter-registration) |
| Swagger UI not activated | 🟡 HIGH | 15 min | [Section 2](#section-2-swagger-implementation) |
| i18n completely missing | 🟡 MEDIUM | 4 hours | [Section 3](#section-3-i18n-implementation) |

---

## SECTION 1: ERROR FILTER REGISTRATION

### 1.1 Current State

**File:** `src/main.ts`
```typescript
// Line 19: Missing filter registration
app.useGlobalPipes(createValidationPipe());
// ❌ No app.useGlobalFilters()
```

### 1.2 Required Change

**File:** `src/main.ts` - COMPLETE REPLACEMENT

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // CORS - Allow frontend to call API
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Validation - DTOs will now be validated
  app.useGlobalPipes(createValidationPipe());

  // Global Exception Filter - Standardized error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // API Prefix - versioned endpoints
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 NerdPOS API running on http://localhost:${port}/api/v1`);
}
bootstrap();
```

### 1.3 Verification

```bash
# Start server
npm run start:dev

# Test error response
curl http://localhost:3001/api/v1/products/invalid-uuid

# Expected JSON:
{
  "statusCode": 404,
  "timestamp": "2026-01-22T10:00:00.000Z",
  "path": "/api/v1/products/invalid-uuid",
  "method": "GET",
  "message": "Product invalid-uuid not found"
}
```

---

## SECTION 2: SWAGGER IMPLEMENTATION

### 2.1 Step 1: Update nest-cli.json

**File:** `nest-cli.json` - COMPLETE REPLACEMENT

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true,
          "dtoFileNameSuffix": [".dto.ts", ".entity.ts"]
        }
      }
    ]
  }
}
```

### 2.2 Step 2: Update main.ts with Swagger

**File:** `src/main.ts` - COMPLETE FILE WITH SWAGGER

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers
  app.use(helmet());

  // CORS - Allow frontend to call API
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Validation - DTOs will now be validated
  app.useGlobalPipes(createValidationPipe());

  // Global Exception Filter - Standardized error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // API Prefix - versioned endpoints
  app.setGlobalPrefix('api/v1');

  // ==================== SWAGGER CONFIGURATION ====================
  const config = new DocumentBuilder()
    .setTitle('NerdPOS API')
    .setDescription(`
## NerdPOS Point of Sale System - Backend API

### Overview
Enterprise-grade POS system for Middle East F&B and retail operations.

### Features
- **ZATCA Phase 2 Compliant** - Saudi Arabia e-invoicing
- **ETA Integration** - Egypt Tax Authority
- **Offline-First** - Works without internet
- **Multi-Payment** - Cash, Card, Split payments
- **Kitchen Display** - Real-time order routing

### Authentication
All endpoints (except /auth/login) require JWT Bearer token.
Use the **Authorize** button above to add your token.

### Base URL
\`${process.env.API_URL || 'http://localhost:3001'}/api/v1\`
    `)
    .setVersion('1.0.0')
    .setContact('NerdPOS Team', 'https://nerdpos.com', 'api@nerdpos.com')
    .setLicense('Proprietary', 'https://nerdpos.com/license')
    // Tags for grouping
    .addTag('Auth', 'Authentication and JWT tokens')
    .addTag('Products', 'Product catalog and categories')
    .addTag('Inventory', 'Stock management with FIFO')
    .addTag('Sales', 'Orders and transactions')
    .addTag('Payments', 'Payment processing')
    .addTag('Sessions', 'Register session management')
    .addTag('Kitchen', 'Kitchen display system')
    .addTag('Customers', 'Customer and loyalty management')
    .addTag('Tables', 'Table and floor management')
    .addTag('Delivery', 'Delivery order management')
    .addTag('Discounts', 'Promotions and discounts')
    .addTag('Settings', 'Store configuration')
    .addTag('Compliance', 'ZATCA/ETA e-invoicing')
    .addTag('Reports', 'Sales and financial reports')
    .addTag('Audit', 'Activity and audit logs')
    .addTag('Users', 'User and role management')
    // JWT Authentication
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'NerdPOS API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin-bottom: 20px; }
      .swagger-ui .info .title { color: #0891b2; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });
  // ==================== END SWAGGER ====================

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 NerdPOS API running on http://localhost:${port}/api/v1`);
  console.log(`📚 API Docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
```

### 2.3 Step 3: Add @ApiTags to Controllers

Apply this pattern to ALL controllers:

**File:** `src/modules/products/products.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductResponseDto } from './dto';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiResponse({ status: 200, description: 'List of products', type: [ProductResponseDto] })
  async findAll() {
    return this.service.findAllProducts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({ status: 200, description: 'Product found', type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.service.findProductById(id);
  }
}
```

### 2.4 Controller Tags Reference

| Controller | Tag | File |
|------------|-----|------|
| AuthController | 'Auth' | auth.controller.ts |
| ProductsController | 'Products' | products.controller.ts |
| InventoryController | 'Inventory' | inventory.controller.ts |
| SalesController | 'Sales' | sales.controller.ts |
| PaymentsController | 'Payments' | payments.controller.ts |
| SessionsController | 'Sessions' | sessions.controller.ts |
| KitchenController | 'Kitchen' | kitchen.controller.ts |
| CustomersController | 'Customers' | customers.controller.ts |
| TablesController | 'Tables' | tables.controller.ts |
| DeliveryController | 'Delivery' | delivery.controller.ts |
| DiscountsController | 'Discounts' | discounts.controller.ts |
| SettingsController | 'Settings' | settings.controller.ts |
| ComplianceController | 'Compliance' | compliance.controller.ts |
| ReportsController | 'Reports' | reports.controller.ts |
| AuditController | 'Audit' | audit.controller.ts |
| UsersController | 'Users' | users.controller.ts |

### 2.5 Verification

```bash
# Rebuild to apply nest-cli.json changes
npm run build

# Start server
npm run start:dev

# Open browser
# Visit: http://localhost:3001/api/docs
```

---

## SECTION 3: I18N IMPLEMENTATION

### 3.1 Step 1: Install Package

```bash
npm install nestjs-i18n
```

### 3.2 Step 2: Create Directory Structure

```
src/
├── i18n/
│   ├── en/
│   │   ├── validation.json
│   │   ├── errors.json
│   │   └── messages.json
│   └── ar/
│       ├── validation.json
│       ├── errors.json
│       └── messages.json
```

### 3.3 Step 3: Create English Locale Files

**File:** `src/i18n/en/validation.json`
```json
{
  "IS_NOT_EMPTY": "{property} should not be empty",
  "IS_STRING": "{property} must be a string",
  "IS_NUMBER": "{property} must be a number",
  "IS_INT": "{property} must be an integer",
  "IS_POSITIVE": "{property} must be a positive number",
  "IS_UUID": "{property} must be a valid UUID",
  "IS_EMAIL": "{property} must be a valid email address",
  "IS_PHONE": "{property} must be a valid phone number",
  "IS_DATE": "{property} must be a valid date",
  "IS_BOOLEAN": "{property} must be a boolean",
  "IS_ARRAY": "{property} must be an array",
  "IS_ENUM": "{property} must be one of: {constraints}",
  "MIN": "{property} must be at least {constraints.0}",
  "MAX": "{property} must not exceed {constraints.0}",
  "MIN_LENGTH": "{property} must be at least {constraints.0} characters",
  "MAX_LENGTH": "{property} must not exceed {constraints.0} characters",
  "MATCHES": "{property} format is invalid",
  "ARRAY_NOT_EMPTY": "{property} must contain at least one item",
  "ARRAY_MIN_SIZE": "{property} must contain at least {constraints.0} items"
}
```

**File:** `src/i18n/en/errors.json`
```json
{
  "GENERIC": {
    "NOT_FOUND": "{entity} not found",
    "ALREADY_EXISTS": "{entity} already exists",
    "INVALID_ID": "Invalid {entity} ID",
    "OPERATION_FAILED": "Operation failed: {reason}"
  },
  "AUTH": {
    "UNAUTHORIZED": "Authentication required",
    "FORBIDDEN": "You do not have permission to perform this action",
    "INVALID_CREDENTIALS": "Invalid username or password",
    "INVALID_TOKEN": "Invalid or expired token",
    "TOKEN_EXPIRED": "Your session has expired, please login again"
  },
  "SESSION": {
    "ALREADY_OPEN": "You already have an open session: {sessionNumber}",
    "NOT_FOUND": "Session not found",
    "ALREADY_CLOSED": "Session is already closed",
    "DRAFT_ORDERS_PENDING": "Cannot close session: {count} draft order(s) pending"
  },
  "ORDER": {
    "EMPTY": "Order must have at least one item",
    "NOT_FOUND": "Order not found",
    "INVALID_TRANSITION": "Invalid order status transition: {from} → {to}",
    "CANNOT_MODIFY": "Cannot modify order in {status} status",
    "ALREADY_PAID": "Order has already been paid"
  },
  "PAYMENT": {
    "AMOUNT_INVALID": "Payment amount must be greater than 0",
    "INSUFFICIENT_CASH": "Insufficient cash received. Received: {received}, Required: {required}",
    "REFUND_EXCEEDS": "Refund amount exceeds original payment",
    "ALREADY_REFUNDED": "This payment has already been fully refunded"
  },
  "INVENTORY": {
    "INSUFFICIENT_STOCK": "Insufficient stock for {product}. Available: {available}, Requested: {requested}",
    "BATCH_NOT_FOUND": "Batch not found",
    "WAREHOUSE_NOT_FOUND": "Warehouse not found"
  },
  "PRODUCT": {
    "NOT_FOUND": "Product not found",
    "SKU_EXISTS": "Product with SKU {sku} already exists",
    "INACTIVE": "Product is not available for sale"
  },
  "COMPLIANCE": {
    "INVOICE_EXISTS": "Invoice already exists for this order",
    "HASH_CHAIN_BROKEN": "CRITICAL: Invoice hash chain integrity compromised",
    "SUBMISSION_FAILED": "Invoice submission to ZATCA failed: {reason}"
  }
}
```

**File:** `src/i18n/en/messages.json`
```json
{
  "SUCCESS": {
    "CREATED": "{entity} created successfully",
    "UPDATED": "{entity} updated successfully",
    "DELETED": "{entity} deleted successfully",
    "LOGIN": "Login successful",
    "LOGOUT": "Logged out successfully"
  },
  "SESSION": {
    "OPENED": "Session {sessionNumber} opened",
    "CLOSED": "Session closed. Variance: {variance}"
  },
  "ORDER": {
    "CREATED": "Order {orderNumber} created",
    "CONFIRMED": "Order {orderNumber} confirmed",
    "COMPLETED": "Order {orderNumber} completed",
    "CANCELLED": "Order {orderNumber} cancelled"
  },
  "PAYMENT": {
    "RECEIVED": "Payment of {amount} received",
    "CHANGE": "Change due: {amount}",
    "REFUND_PROCESSED": "Refund of {amount} processed"
  },
  "INVENTORY": {
    "LOW_STOCK": "Low stock alert: {product} has only {quantity} units remaining",
    "STOCK_RECEIVED": "Received {quantity} units of {product}"
  }
}
```

### 3.4 Step 4: Create Arabic Locale Files

**File:** `src/i18n/ar/validation.json`
```json
{
  "IS_NOT_EMPTY": "{property} يجب ألا يكون فارغاً",
  "IS_STRING": "{property} يجب أن يكون نصاً",
  "IS_NUMBER": "{property} يجب أن يكون رقماً",
  "IS_INT": "{property} يجب أن يكون عدداً صحيحاً",
  "IS_POSITIVE": "{property} يجب أن يكون رقماً موجباً",
  "IS_UUID": "{property} يجب أن يكون معرّف UUID صالحاً",
  "IS_EMAIL": "{property} يجب أن يكون بريداً إلكترونياً صالحاً",
  "IS_PHONE": "{property} يجب أن يكون رقم هاتف صالحاً",
  "IS_DATE": "{property} يجب أن يكون تاريخاً صالحاً",
  "IS_BOOLEAN": "{property} يجب أن يكون قيمة منطقية",
  "IS_ARRAY": "{property} يجب أن يكون مصفوفة",
  "IS_ENUM": "{property} يجب أن يكون أحد: {constraints}",
  "MIN": "{property} يجب أن يكون على الأقل {constraints.0}",
  "MAX": "{property} يجب ألا يتجاوز {constraints.0}",
  "MIN_LENGTH": "{property} يجب أن يكون على الأقل {constraints.0} حرف",
  "MAX_LENGTH": "{property} يجب ألا يتجاوز {constraints.0} حرف",
  "MATCHES": "صيغة {property} غير صالحة",
  "ARRAY_NOT_EMPTY": "{property} يجب أن يحتوي على عنصر واحد على الأقل",
  "ARRAY_MIN_SIZE": "{property} يجب أن يحتوي على {constraints.0} عناصر على الأقل"
}
```

**File:** `src/i18n/ar/errors.json`
```json
{
  "GENERIC": {
    "NOT_FOUND": "{entity} غير موجود",
    "ALREADY_EXISTS": "{entity} موجود بالفعل",
    "INVALID_ID": "معرّف {entity} غير صالح",
    "OPERATION_FAILED": "فشلت العملية: {reason}"
  },
  "AUTH": {
    "UNAUTHORIZED": "يرجى تسجيل الدخول",
    "FORBIDDEN": "ليس لديك صلاحية لتنفيذ هذا الإجراء",
    "INVALID_CREDENTIALS": "اسم المستخدم أو كلمة المرور غير صحيحة",
    "INVALID_TOKEN": "رمز التحقق غير صالح أو منتهي الصلاحية",
    "TOKEN_EXPIRED": "انتهت صلاحية جلستك، يرجى تسجيل الدخول مرة أخرى"
  },
  "SESSION": {
    "ALREADY_OPEN": "لديك جلسة مفتوحة بالفعل: {sessionNumber}",
    "NOT_FOUND": "الجلسة غير موجودة",
    "ALREADY_CLOSED": "الجلسة مغلقة بالفعل",
    "DRAFT_ORDERS_PENDING": "لا يمكن إغلاق الجلسة: {count} طلب(ات) معلقة"
  },
  "ORDER": {
    "EMPTY": "يجب أن يحتوي الطلب على صنف واحد على الأقل",
    "NOT_FOUND": "الطلب غير موجود",
    "INVALID_TRANSITION": "انتقال غير صالح لحالة الطلب: {from} ← {to}",
    "CANNOT_MODIFY": "لا يمكن تعديل الطلب في حالة {status}",
    "ALREADY_PAID": "تم دفع الطلب بالفعل"
  },
  "PAYMENT": {
    "AMOUNT_INVALID": "مبلغ الدفع يجب أن يكون أكبر من صفر",
    "INSUFFICIENT_CASH": "المبلغ المستلم غير كافٍ. المستلم: {received}، المطلوب: {required}",
    "REFUND_EXCEEDS": "مبلغ الاسترداد يتجاوز المبلغ المدفوع",
    "ALREADY_REFUNDED": "تم استرداد هذه الدفعة بالكامل"
  },
  "INVENTORY": {
    "INSUFFICIENT_STOCK": "المخزون غير كافٍ لـ {product}. المتوفر: {available}، المطلوب: {requested}",
    "BATCH_NOT_FOUND": "الدفعة غير موجودة",
    "WAREHOUSE_NOT_FOUND": "المستودع غير موجود"
  },
  "PRODUCT": {
    "NOT_FOUND": "المنتج غير موجود",
    "SKU_EXISTS": "منتج بالرمز {sku} موجود بالفعل",
    "INACTIVE": "المنتج غير متاح للبيع"
  },
  "COMPLIANCE": {
    "INVOICE_EXISTS": "الفاتورة موجودة بالفعل لهذا الطلب",
    "HASH_CHAIN_BROKEN": "تحذير: تم اختراق سلسلة التجزئة للفواتير",
    "SUBMISSION_FAILED": "فشل إرسال الفاتورة إلى هيئة الزكاة: {reason}"
  }
}
```

**File:** `src/i18n/ar/messages.json`
```json
{
  "SUCCESS": {
    "CREATED": "تم إنشاء {entity} بنجاح",
    "UPDATED": "تم تحديث {entity} بنجاح",
    "DELETED": "تم حذف {entity} بنجاح",
    "LOGIN": "تم تسجيل الدخول بنجاح",
    "LOGOUT": "تم تسجيل الخروج بنجاح"
  },
  "SESSION": {
    "OPENED": "تم فتح الجلسة {sessionNumber}",
    "CLOSED": "تم إغلاق الجلسة. الفرق: {variance}"
  },
  "ORDER": {
    "CREATED": "تم إنشاء الطلب {orderNumber}",
    "CONFIRMED": "تم تأكيد الطلب {orderNumber}",
    "COMPLETED": "تم إتمام الطلب {orderNumber}",
    "CANCELLED": "تم إلغاء الطلب {orderNumber}"
  },
  "PAYMENT": {
    "RECEIVED": "تم استلام دفعة بقيمة {amount}",
    "CHANGE": "المبلغ المتبقي: {amount}",
    "REFUND_PROCESSED": "تم معالجة استرداد بقيمة {amount}"
  },
  "INVENTORY": {
    "LOW_STOCK": "تنبيه: المخزون منخفض - {product} متبقي {quantity} وحدة فقط",
    "STOCK_RECEIVED": "تم استلام {quantity} وحدة من {product}"
  }
}
```

### 3.5 Step 5: Configure I18nModule

**File:** `src/app.module.ts` - ADD IMPORT

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import {
  I18nModule,
  AcceptLanguageResolver,
  QueryResolver,
  HeaderResolver,
} from 'nestjs-i18n';
import * as path from 'path';

// ... existing imports ...

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),

    // ==================== I18N MODULE ====================
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true, // Enable hot reload in dev
      },
      resolvers: [
        // Priority 1: ?lang=ar query parameter
        { use: QueryResolver, options: ['lang'] },
        // Priority 2: Accept-Language header
        AcceptLanguageResolver,
        // Priority 3: X-Lang custom header
        new HeaderResolver(['x-lang']),
      ],
    }),
    // ==================== END I18N ====================

    PrismaModule,
    EventBusModule,
    // ... rest of modules ...
  ],
  // ... rest of config ...
})
export class AppModule {}
```

### 3.6 Step 6: Create i18n Service Helper

**File:** `src/common/utils/i18n.helper.ts` (NEW FILE)
```typescript
import { I18nService } from 'nestjs-i18n';
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class I18nHelper {
  constructor(
    private readonly i18n: I18nService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * Translate a key with the current request's language
   */
  t(key: string, args?: Record<string, any>): string {
    const lang = this.getLang();
    return this.i18n.translate(key, { lang, args });
  }

  /**
   * Get current language from request
   */
  getLang(): string {
    return (
      (this.request.query?.lang as string) ||
      this.request.headers['x-lang'] ||
      this.request.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
      'en'
    );
  }

  /**
   * Translate validation error
   */
  validation(key: string, property: string, constraints?: any[]): string {
    return this.t(`validation.${key}`, {
      property,
      constraints,
    });
  }

  /**
   * Translate error message
   */
  error(key: string, args?: Record<string, any>): string {
    return this.t(`errors.${key}`, args);
  }

  /**
   * Translate success message
   */
  success(key: string, args?: Record<string, any>): string {
    return this.t(`messages.SUCCESS.${key}`, args);
  }
}
```

### 3.7 Step 7: Update DTOs with i18n Validation

**File:** `src/modules/products/dto/create-product.dto.ts` - EXAMPLE UPDATE
```typescript
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class CreateProductDto {
  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  sku: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  nameAr: string;

  @IsString({ message: i18nValidationMessage('validation.IS_STRING') })
  @IsNotEmpty({ message: i18nValidationMessage('validation.IS_NOT_EMPTY') })
  nameEn: string;

  @IsUUID(4, { message: i18nValidationMessage('validation.IS_UUID') })
  categoryId: string;

  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  price: number;

  @IsOptional()
  @IsNumber({}, { message: i18nValidationMessage('validation.IS_NUMBER') })
  @Min(0, { message: i18nValidationMessage('validation.MIN') })
  cost?: number;

  @IsOptional()
  @IsEnum(['STANDARD', 'ZERO_RATED', 'EXEMPT'], {
    message: i18nValidationMessage('validation.IS_ENUM'),
  })
  taxCategory?: string;

  @IsOptional()
  @IsBoolean({ message: i18nValidationMessage('validation.IS_BOOLEAN') })
  isActive?: boolean;
}
```

### 3.8 Step 8: Update Services to Use i18n

**File:** `src/modules/products/products.service.ts` - EXAMPLE UPDATE
```typescript
import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
// ... other imports ...

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
    private readonly i18n: I18nService, // ADD THIS
  ) {}

  async findProductById(id: string): Promise<ProductWithRelations> {
    const product = await this.repo.findWithRelations(id);
    if (!product) {
      // Use i18n for error message
      throw new NotFoundException(
        this.i18n.t('errors.PRODUCT.NOT_FOUND', {
          args: { entity: 'Product' },
        }),
      );
    }
    return product;
  }
}
```

### 3.9 Verification

```bash
# Test English (default)
curl http://localhost:3001/api/v1/products/invalid-id
# Expected: "Product not found"

# Test Arabic via query
curl "http://localhost:3001/api/v1/products/invalid-id?lang=ar"
# Expected: "المنتج غير موجود"

# Test Arabic via header
curl -H "Accept-Language: ar-SA" http://localhost:3001/api/v1/products/invalid-id
# Expected: "المنتج غير موجود"

# Test validation in Arabic
curl -X POST "http://localhost:3001/api/v1/products?lang=ar" \
  -H "Content-Type: application/json" \
  -d '{"price": "not-a-number"}'
# Expected: "price يجب أن يكون رقماً"
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Error Filter (CRITICAL - 2 minutes)
- [ ] Import HttpExceptionFilter in main.ts
- [ ] Add `app.useGlobalFilters(new HttpExceptionFilter())`
- [ ] Test error response format

### Phase 2: Swagger (HIGH - 15 minutes)
- [ ] Update nest-cli.json with plugin config
- [ ] Add DocumentBuilder setup to main.ts
- [ ] Add @ApiTags to all 16 controllers
- [ ] Run `npm run build`
- [ ] Verify at http://localhost:3001/api/docs

### Phase 3: i18n (MEDIUM - 4 hours)
- [ ] Install nestjs-i18n package
- [ ] Create `src/i18n/en/` directory with 3 JSON files
- [ ] Create `src/i18n/ar/` directory with 3 JSON files
- [ ] Configure I18nModule in app.module.ts
- [ ] Update DTOs with i18nValidationMessage
- [ ] Update services with I18nService
- [ ] Test with ?lang=ar parameter

---

## 📝 NOTES

### Build Requirements
After modifying nest-cli.json, you must rebuild:
```bash
npm run build
```

### Import Paths
Ensure all imports use the correct paths from the project structure.

### Testing
Run full test suite after each phase:
```bash
npm run test
npm run test:e2e
```

---

**END OF IMPLEMENTATION PLAN**

*Generated: January 22, 2026*
