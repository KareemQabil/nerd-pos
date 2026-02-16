# Reports Module API

Analytics and business intelligence reports.

---

## Endpoints

### GET /api/v1/reports/daily-sales

**Permission**: `REPORTS_SALES_VIEW` (Manager+)  
**Description**: Generates daily sales summary

**Query Parameters**:

- `date` (required): Date in ISO format (YYYY-MM-DD)

**Success Response (200)**:

```json
{
  "result": {
    "date": "2026-01-23",
    "totalSales": 5000.0,
    "totalOrders": 150,
    "averageOrderValue": 33.33,
    "categoryBreakdown": {
      "Main Dishes": 3000.0,
      "Beverages": 1000.0,
      "Desserts": 1000.0
    }
  },
  "error": null
}
```

---

### GET /api/v1/reports/z-report/:sessionId

**Permission**: `REPORTS_SALES_VIEW` (Manager+)  
**Description**: Generates end-of-day Z-Report for session

**Success Response (200)**:

```json
{
  "result": {
    "sessionId": "sess_123",
    "openedAt": "2026-01-23T08:00:00Z",
    "closedAt": "2026-01-23T22:00:00Z",
    "totalSales": 4500.0,
    "paymentBreakdown": {
      "CASH": 2000.0,
      "CARD": 2500.0
    },
    "netSales": 3913.04,
    "taxAmount": 586.96
  },
  "error": null
}
```

---

### GET /api/v1/reports/top-selling

**Permission**: `REPORTS_SALES_VIEW` (Manager+)  
**Description**: Returns best-selling products in date range

**Query Parameters**:

- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `limit` (optional): Number of items to return (default: 10)

**Success Response (200)**:

```json
{
  "result": [
    {
      "rank": 1,
      "productId": "prod_1",
      "name": "Cheeseburger",
      "quantitySold": 150,
      "totalRevenue": 2250.0
    }
  ],
  "error": null
}
```

---

### GET /api/v1/reports/inventory-valuation

**Permission**: `REPORTS_INVENTORY_VIEW` (Manager+)  
**Description**: Returns current inventory value

**Success Response (200)**:

```json
{
  "result": {
    "totalValue": 50000.0,
    "itemCount": 2500,
    "lastUpdated": "2026-01-23T12:00:00Z"
  },
  "error": null
}
```

---

## Notes

- All reports require Manager+ permissions
- Date format: YYYY-MM-DD
- Z-Report is a financial summary for closed register sessions
- Reports can be exported (additional endpoints may be available)
- Category breakdown shows sales distribution across product categories
- Inventory valuation based on current stock levels and unit costs
