# Audit Module Implementation

**Module**: Audit Logging, Compliance Tracking  
**Priority**: Medium (Compliance & security)  
**Dependencies**: All modules

---

## **OVERVIEW**

Comprehensive audit logging system:
- **Action Tracking** - All CRUD operations
- **User Attribution** - Who did what when
- **Change History** - Before/after values
- **Compliance** - Regulatory audit trails

---

## **ENTITIES**

```prisma
model AuditLog {
  id            String   @id @default(uuid())
  
  // User
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  username      String
  
  // Action
  module        String   // "sales", "inventory", "products"
  action        String   // "CREATE", "UPDATE", "DELETE", "VOID"
  entity        String   // "Order", "Product", "Payment"
  entityId      String
  
  // Changes
  before        Json?    // Previous state
  after         Json?    // New state
  changes       Json?    // Diff of changes
  
  // Request context
  ipAddress     String?
  userAgent     String?
  endpoint      String?
  method        String?  // GET, POST, PUT, DELETE
  
  // Result
  success       Boolean  @default(true)
  errorMessage  String?
  
  // Metadata
  sessionId     String?
  terminalId    String?
  businessDate  DateTime
  
  createdAt     DateTime @default(now())
  
  // Indexes for performance
  @@index([userId, createdAt])
  @@index([module, action])
  @@index([entity, entityId])
  @@index([businessDate])
  @@index([createdAt])
}

// Partitioning strategy: Monthly partitions
// Table naming: audit_log_YYYYMM
// Retention: 7 years (compliance requirement)

model ComplianceEvent {
  id            String   @id @default(uuid())
  
  // Event type
  type          String   // ZATCA_SUBMISSION, HASH_CHAIN_BREAK, TAX_AUDIT
  severity      String   // INFO, WARNING, ERROR, CRITICAL
  
  // Details
  description   String
  metadata      Json
  
  // Resolution
  resolved      Boolean  @default(false)
  resolvedAt    DateTime?
  resolvedBy    String?
  resolution    String?
  
  createdAt     DateTime @default(now())
  
  @@index([type])
  @@index([severity, resolved])
  @@index([createdAt])
}
```

---

## **SERVICE**

```typescript
// audit.service.ts
@Injectable()
export class AuditService {
  constructor(
    private readonly auditRepo: AuditRepository
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    // Calculate diff if before and after are provided
    let changes = null;
    if (dto.before && dto.after) {
      changes = this.calculateDiff(dto.before, dto.after);
    }

    await this.auditRepo.create({
      userId: dto.userId,
      username: dto.username,
      module: dto.module,
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId,
      before: dto.before,
      after: dto.after,
      changes,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      endpoint: dto.endpoint,
      method: dto.method,
      success: dto.success !== false,
      errorMessage: dto.errorMessage,
      sessionId: dto.sessionId,
      businessDate: dto.businessDate || new Date()
    });
  }

  private calculateDiff(before: any, after: any): any {
    const changes: any = {};
    
    // Find changed fields
    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = {
          from: before[key],
          to: after[key]
        };
      }
    }
    
    return changes;
  }

  async findByEntity(
    entity: string,
    entityId: string
  ): Promise<AuditLog[]> {
    return this.auditRepo.findByEntity(entity, entityId);
  }

  async findByUser(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditLog[]> {
    return this.auditRepo.findByUser(userId, startDate, endDate);
  }

  async findByModule(
    module: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditLog[]> {
    return this.auditRepo.findByModule(module, startDate, endDate);
  }

  async logComplianceEvent(
    type: string,
    severity: string,
    description: string,
    metadata: any
  ): Promise<void> {
    await this.auditRepo.createComplianceEvent({
      type,
      severity,
      description,
      metadata,
      resolved: false
    });
  }

  async resolveComplianceEvent(
    eventId: string,
    userId: string,
    resolution: string
  ): Promise<void> {
    await this.auditRepo.updateComplianceEvent(eventId, {
      resolved: true,
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution
    });
  }
}
```

---

## **CONTROLLER**

```typescript
// audit.controller.ts
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('entity/:entity/:entityId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getEntityHistory(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string
  ) {
    return this.auditService.findByEntity(entity, entityId);
  }

  @Get('user/:userId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.auditService.findByUser(
      userId,
      new Date(startDate),
      new Date(endDate)
    );
  }

  @Get('compliance-events')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getComplianceEvents() {
    return this.auditService.getUnresolvedEvents();
  }

  @Post('compliance-events/:id/resolve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  async resolveEvent(
    @Param('id') id: string,
    @Body() dto: { resolution: string },
    @Request() req
  ) {
    return this.auditService.resolveComplianceEvent(
      id,
      req.user.id,
      dto.resolution
    );
  }
}
```

---

## **INTERCEPTOR** (Auto-logging)

```typescript
// audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable\u003cany\u003e {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, headers } = request;

    const before = request.body?.id ? 
      this.captureCurrentState(request.body.id) : 
      null;

    return next.handle().pipe(
      tap(async (data) => {
        // Log successful operations
        if (this.shouldLog(method, url)) {
          await this.auditService.log({
            userId: user?.id || 'system',
            username: user?.username || 'system',
            module: this.extractModule(url),
            action: this.mapMethodToAction(method),
            entity: this.extractEntity(url),
            entityId: data?.id || request.params?.id,
            before,
            after: data,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            endpoint: url,
            method,
            success: true
          });
        }
      }),
      catchError(async (error) => {
        // Log failed operations
        await this.auditService.log({
          userId: user?.id || 'system',
          username: user?.username || 'system',
          module: this.extractModule(url),
          action: this.mapMethodToAction(method),
          entity: this.extractEntity(url),
          entityId: request.params?.id,
          ipAddress: ip,
          endpoint: url,
          method,
          success: false,
          errorMessage: error.message
        });
        throw error;
      })
    );
  }

  private shouldLog(method: string, url: string): boolean {
    // Don't log GET requests (read-only)
    if (method === 'GET') return false;
    
    // Don't log auth endpoints
    if (url.includes('/auth/')) return false;
    
    return true;
  }

  private mapMethodToAction(method: string): string {
    const mapping = {
      'POST': 'CREATE',
      'PUT': 'UPDATE',
      'PATCH': 'UPDATE',
      'DELETE': 'DELETE'
    };
    return mapping[method] || 'UNKNOWN';
  }
}
```

---

## **KEY FEATURES**

1. **Automatic Logging** - Via interceptor
2. **Change Tracking** - Before/after snapshots
3. **User Attribution** - Who did what
4. **Compliance Events** - Special event tracking
5. **Entity History** - Complete audit trail
6. **7-Year Retention** - Regulatory compliance
7. **Monthly Partitioning** - Performance optimization

---

## **NEXT**

- Phase 4 modules (Accounting, Purchasing, Production) - Document as needed
