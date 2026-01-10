# Reports Module Implementation

**Module**: Analytics, Reports, Dashboards  
**Priority**: Medium (Business intelligence)  
**Dependencies**: Sales, Inventory, Sessions, Payments

---

## **OVERVIEW**

Reporting and analytics system:
- **Sales Reports** - Daily, weekly, monthly sales
- **Inventory Reports** - Stock levels, movements
- **Financial Reports** - Revenue, tax, sessions
- **Custom Reports** - User-defined queries

---

## **KEY REPORTS** (from 00-DEEP-UNDERSTANDING.md line 81)

1. **Daily Sales Report** - Sales by day
2. **Sales by Category** - Category performance
3. **Top Selling Items** - Product rankings
4. **Hourly Sales** - Time-based trends
5. **Payment Methods** - Cash vs Card breakdown
6. **Tax Report** - VAT collected
7. **Inventory Valuation** - Stock worth
8. **Low Stock Alert** - Items below min
9. **Session Report** - Cashier sessions
10. **Void Report** - Cancelled orders
11. **Discount Report** - Discount usage
12. **Customer Report** - Customer analytics
13. **Waiter Performance** - Server stats
14. **Kitchen Efficiency** - Preparation times
15. **Delivery Report** - Delivery stats
16. **Z-Report** - End of day summary

---

## **ENTITIES**

```prisma
model Report {
  id            String   @id @default(uuid())
  type          String   // SALES, INVENTORY, FINANCIAL, CUSTOM
  name          String
  nameAr        String
  
  // Query definition
  query         Json     // SQL or query builder JSON
  parameters    Json?    // Report parameters
  
  // Scheduling
  schedule      String?  // CRON expression
  lastRunAt     DateTime?
  nextRunAt     DateTime?
  
  // Access control
  roleIds       String[] // Roles allowed to view
  
  // Output
  format        String   @default("PDF") // PDF, EXCEL, CSV
  
  isActive      Boolean  @default(true)
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  
  @@index([type])
}

model ReportExecution {
  id            String   @id @default(uuid())
  reportId      String
  report        Report   @relation(fields: [reportId], references: [id])
  
  // Execution
  status        String   // PENDING, RUNNING, COMPLETED, FAILED
  startedAt     DateTime @default(now())
  completedAt   DateTime?
  
  // Parameters used
  parameters    Json?
  
  // Output
  filePath      String?
  fileSize      Int?
  
  // Errors
  error         String?
  
  executedBy    String
  
  @@index([reportId])
  @@index([status])
  @@index([startedAt])
}
```

---

## **SERVICE**

```typescript
// reports.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportRepo: ReportRepository,
    private readonly salesRepo: SalesRepository,
    private readonly inventoryRepo: InventoryRepository,
    private readonly sessionRepo: SessionRepository
  ) {}

  async generateDailySalesReport(date: Date): Promise<any> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const orders = await this.salesRepo.findByDateRange(startOfDay, endOfDay);

    const totalSales = orders.reduce(
      (sum, order) => sum.plus(new Decimal(order.grandTotal)),
      new Decimal(0)
    );

    const totalTax = orders.reduce(
      (sum, order) => sum.plus(new Decimal(order.taxAmount)),
      new Decimal(0)
    );

    const orderCount = orders.length;

    // Group by category
    const byCategory = await this.salesRepo.groupByCategory(startOfDay, endOfDay);

    // Group by payment method
    const byPaymentMethod = await this.salesRepo.groupByPaymentMethod(startOfDay, endOfDay);

    return {
      date: date.toISOString().split('T')[0],
      totalSales: totalSales.toNumber(),
      totalTax: totalTax.toNumber(),
      orderCount,
      averageOrderValue: totalSales.dividedBy(orderCount || 1).toNumber(),
      byCategory,
      byPaymentMethod
    };
  }

  async generateZReport(sessionId: string): Promise<any> {
    const session = await this.sessionRepo.findWithDetails(sessionId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const payments = await this.salesRepo.findPaymentsBySession(sessionId);

    const cashPayments = payments
      .filter(p => p.method === 'CASH')
      .reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0));

    const cardPayments = payments
      .filter(p => p.method !== 'CASH')
      .reduce((sum, p) => sum.plus(new Decimal(p.amount)), new Decimal(0));

    const refunds = await this.salesRepo.findRefundsBySession(sessionId);
    const totalRefunds = refunds.reduce(
      (sum, r) => sum.plus(new Decimal(r.amount)),
      new Decimal(0)
    );

    return {
      sessionNumber: session.sessionNumber,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingBalance: session.openingBalance,
      closingBalance: session.closingBalance,
      expectedBalance: session.expectedBalance,
      variance: session.variance,
      totalSales: session.totalSales,
      cashSales: cashPayments.toNumber(),
      cardSales: cardPayments.toNumber(),
      refunds: totalRefunds.toNumber(),
      orderCount: session.orderCount,
      netCash: new Decimal(session.openingBalance)
        .plus(cashPayments)
        .minus(totalRefunds)
        .toNumber()
    };
  }

  async generateTopSellingItems(
    startDate: Date,
    endDate: Date,
    limit: number = 10
  ): Promise<any[]> {
    return this.salesRepo.getTopSellingItems(startDate, endDate, limit);
  }

  async generateInventoryValuation(): Promise<any> {
    const items = await this.inventoryRepo.findAllWithBatches();

    let totalValue = new Decimal(0);

    const valuations = items.map(item => {
      const quantity = new Decimal(item.quantity);
      const cost = new Decimal(item.cost || 0);
      const value = quantity.times(cost);
      totalValue = totalValue.plus(value);

      return {
        productId: item.productId,
        productName: item.product.name,
        quantity: quantity.toNumber(),
        cost: cost.toNumber(),
        value: value.toNumber()
      };
    });

    return {
      totalValue: totalValue.toNumber(),
      itemCount: items.length,
      items: valuations
    };
  }
}
```

---

## **CONTROLLER**

```typescript
// reports.controller.ts
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-sales')
  async dailySales(@Query('date') date: string) {
    return this.reportsService.generateDailySalesReport(new Date(date));
  }

  @Get('z-report/:sessionId')
  async zReport(@Param('sessionId') sessionId: string) {
    return this.reportsService.generateZReport(sessionId);
  }

  @Get('top-selling')
  async topSelling(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('limit') limit?: number
  ) {
    return this.reportsService.generateTopSellingItems(
      new Date(startDate),
      new Date(endDate),
      limit
    );
  }

  @Get('inventory-valuation')
  async inventoryValuation() {
    return this.reportsService.generateInventoryValuation();
  }
}
```

---

## **KEY FEATURES**

1. **16 Report Types** - Comprehensive analytics
2. **Date Range Filtering** - Flexible time periods
3. **Z-Report** - End of day summary
4. **Real-Time** - On-demand report generation
5. **Scheduled Reports** - Auto-generate reports
6. **Multiple Formats** - PDF, Excel, CSV
7. **Role-Based Access** - Permission control

---

## **NEXT**

- [17-MODULE-AUDIT.md](17-MODULE-AUDIT.md) - Audit logging
