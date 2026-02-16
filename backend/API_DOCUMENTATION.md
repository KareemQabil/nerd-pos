# NerdPOS API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001/api/v1`  
**Swagger Documentation:** `http://localhost:3001/api/docs`

## Table of Contents

1. [Introduction](#introduction)
2. [Generic API Response Structure](#generic-api-response-structure)
3. [Authentication](#authentication)
4. [Common Patterns](#common-patterns)
5. [Error Handling](#error-handling)
6. [Development & Testing](#development--testing)

---

## Introduction

NerdPOS is a Point of Sale & ERP System designed for the MENA region (Saudi Arabia & Egypt). This documentation covers the **generic API conventions** used across all endpoints.

### Key Features

- 🍽️ Dine-In, Takeout, Delivery orders
- 💰 Multi-payment methods (Cash, Card, Digital Wallet)
- 🧾 ZATCA-compliant invoicing (Saudi Arabia)
- 👨‍🍳 Kitchen management with ticket routing
- 📊 Real-time reporting and analytics
- 🌐 Arabic-first design (RTL support)

### Available Modules

The API consists of 17 modules, all documented in Swagger:

- **Auth** - Authentication and authorization
- **Users** - User management and RBAC
- **Customers** - Customer management, addresses, loyalty programs
- **Products** - Product catalog, modifiers, categories
- **Sales** - Orders and transactions
- **Inventory** - Stock management
- **Kitchen** - KDS integration
- **Tables** - Table and floor management
- **Payments** - Payment processing
- **Sessions** - Register sessions
- **Delivery** - Delivery order management
- **Discounts** - Discount rules
- **Compliance** - ZATCA/ETA invoicing
- **Settings** - Store configuration
- **Reports** - Analytics and reporting
- **Audit** - Audit logs
- **Lookup** - Reference data for dropdowns

> **📚 For specific endpoint details**, refer to the **[Swagger UI](http://localhost:3001/api/docs)**.

---

## Generic API Response Structure

All API endpoints follow a **consistent response envelope** pattern using `ApiResponseEnvelopeDto<T>`:

```typescript
{
  result: T | null,
  error: ApiErrorDto | null
}
```

### Success Response

When a request is successful, the `result` field contains the data and `error` is `null`.

**Structure:**

```json
{
  "result": {
    /* Actual data payload */
  },
  "error": null
}
```

**Example - Login Success:**

```json
{
  "result": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user-admin-1",
      "username": "admin",
      "nameEn": "System Admin",
      "nameAr": "مدير النظام",
      "role": "ADMIN",
      "roleId": "role-admin",
      "email": "admin@nerdpos.com"
    }
  },
  "error": null
}
```

**Example - Create Product Success:**

```json
{
  "result": {
    "id": "prod-latte-001",
    "sku": "LATTE-001",
    "nameEn": "Latte",
    "nameAr": "لاتيه",
    "price": 15.0,
    "cost": 5.0,
    "categoryId": "cat-hot-drinks-001",
    "currentStock": 0,
    "isActive": true
  },
  "error": null
}
```

### Error Response

When a request fails, the `result` field is `null` and `error` contains the error details.

**Structure:**

```json
{
  "result": null,
  "error": {
    "messageKey": "ERROR_CODE",
    "messageEn": "Error message in English",
    "messageAr": "رسالة الخطأ بالعربية",
    "details": {
      /* Optional error details */
    }
  }
}
```

**Example - Validation Error:**

```json
{
  "result": null,
  "error": {
    "messageKey": "VALIDATION_ERROR",
    "messageEn": "Validation error.",
    "messageAr": "خطأ في التحقق من البيانات.",
    "details": [
      {
        "field": "price",
        "message": "Price must be non-negative",
        "value": -10
      }
    ]
  }
}
```

**Example - Not Found Error:**

```json
{
  "result": null,
  "error": {
    "messageKey": "PRODUCT_NOT_FOUND",
    "messageEn": "Product not found.",
    "messageAr": "المنتج غير موجود.",
    "details": {
      "productId": "prod-unknown"
    }
  }
}
```

**Example - Unauthorized Error:**

```json
{
  "result": null,
  "error": {
    "messageKey": "UNAUTHORIZED",
    "messageEn": "Unauthorized.",
    "messageAr": "غير مصرح."
  }
}
```

### Error Response Fields

| Field        | Type                | Description                                                      |
| ------------ | ------------------- | ---------------------------------------------------------------- |
| `messageKey` | `string`            | Error code for internationalization (i18n)                       |
| `messageEn`  | `string`            | Error message in English                                         |
| `messageAr`  | `string`            | Error message in Arabic                                          |
| `details`    | `object` (optional) | Additional error details (e.g., validation errors, resource IDs) |

---

## Authentication

The API uses **JWT (JSON Web Token)** authentication with **HTTP-only cookies** for secure token storage.

### Login Flow

1. **Endpoint:** `POST /api/v1/auth/login`
2. **Request Body:**
   ```json
   {
     "username": "admin",
     "password": "nerdpos123"
   }
   ```
3. **Response:** Returns user data and sets `access_token` in HTTP-only cookie
   ```json
   {
     "result": {
       "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
       "user": {
         "id": "user-admin-1",
         "username": "admin",
         "nameEn": "System Admin",
         "nameAr": "مدير النظام",
         "role": "ADMIN"
       }
     },
     "error": null
   }
   ```

### HTTP-Only Cookie Configuration

The `access_token` is stored as an **HTTP-only cookie** with the following settings:

| Setting    | Production            | Development                   |
| ---------- | --------------------- | ----------------------------- |
| `httpOnly` | `true`                | `false` (for Swagger testing) |
| `secure`   | `true` (HTTPS only)   | `false`                       |
| `sameSite` | `'strict'`            | `'lax'`                       |
| `maxAge`   | 24 hours (86400000ms) | 24 hours                      |
| `path`     | `/`                   | `/`                           |

### Token Usage

- **Browser/Frontend:** The cookie is **automatically sent** with every request to the API
- **No manual header required:** The browser handles the cookie transmission
- **Backend validation:** The `JwtAuthGuard` extracts and validates the token from the cookie

### Protected Routes

Most endpoints require authentication. The API uses:

- **`JwtAuthGuard`**: Global guard that protects all routes by default
- **`@Public()` decorator**: Marks routes that don't require authentication (e.g., login, health check)

**Public Endpoints:**

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /health`
- `GET /api/docs` (Swagger UI)

**Protected Endpoints:** All other endpoints require a valid JWT token.

### Logout

**Endpoint:** `POST /api/v1/auth/logout`

Clears the `access_token` cookie and invalidates the session.

### Get Current User Profile

**Endpoint:** `GET /api/v1/auth/profile`

Returns the authenticated user's profile:

```json
{
  "result": {
    "id": "user-admin-1",
    "username": "admin",
    "role": "ADMIN",
    "roleId": "role-admin"
  },
  "error": null
}
```

### Testing Authentication in Swagger

1. Go to `http://localhost:3001/api/docs`
2. Click **"Authorize"** button (🔓 icon)
3. Enter the JWT token from login response
4. Click **"Authorize"**
5. All protected endpoints will now work in Swagger

> **Note:** In development mode, `httpOnly` is `false` to allow Swagger to access the cookie for testing.

---

## Common Patterns

### Pagination

Many list endpoints support pagination using `PaginationDto`:

**Query Parameters:**

- `page` (default: 1) - Page number
- `limit` (default: 20) - Items per page

**Response Format:**

```json
{
  "result": {
    "data": [
      /* Array of items */
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  },
  "error": null
}
```

**Example - Search Customers:**

```
GET /api/v1/customers/search?q=Ahmed&page=1&limit=10
```

Response:

```json
{
  "result": {
    "data": [
      {
        "id": "cust_123",
        "nameEn": "Ahmed Mohamed",
        "nameAr": "أحمد محمد",
        "phone": "+966501234567",
        "tier": "GOLD"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  },
  "error": null
}
```

### Search Endpoints

Search endpoints typically:

- Use the `/search` path suffix
- Accept a `q` query parameter for the search term
- Support pagination
- Return filtered results

**Examples:**

- `GET /api/v1/customers/search?q=Ahmed`
- `GET /api/v1/products/search?q=Latte`

### Lookups / Reference Data

The **Lookup module** provides reference data for dropdowns and select fields:

```
GET /api/v1/lookup/{entity}
```

Examples:

- `GET /api/v1/lookup/payment-methods`
- `GET /api/v1/lookup/order-types`
- `GET /api/v1/lookup/customer-tiers`

Returns arrays of lookup items with `id`, `nameEn`, `nameAr`, etc.

### Filtering and Sorting

Many endpoints support filtering and sorting via query parameters. Refer to the Swagger documentation for specific endpoint capabilities.

---

## Error Handling

### Common HTTP Status Codes

| Status Code | Meaning                        | Example                                    |
| ----------- | ------------------------------ | ------------------------------------------ |
| `200`       | Success (GET, PUT)             | `GET /api/v1/products/{id}`                |
| `201`       | Created (POST)                 | `POST /api/v1/sales/orders`                |
| `400`       | Bad Request / Validation Error | Invalid DTO, missing required fields       |
| `401`       | Unauthorized                   | Missing or invalid JWT token               |
| `403`       | Forbidden                      | User lacks required permissions            |
| `404`       | Not Found                      | Resource doesn't exist                     |
| `409`       | Conflict                       | Duplicate entry (e.g., SKU already exists) |
| `429`       | Too Many Requests              | Rate limit exceeded                        |
| `500`       | Internal Server Error          | Unexpected server error                    |

### Standard Error Codes

| Error Code           | HTTP Status | Description                       |
| -------------------- | ----------- | --------------------------------- |
| `VALIDATION_ERROR`   | 400         | Request validation failed         |
| `UNAUTHORIZED`       | 401         | Authentication required or failed |
| `FORBIDDEN`          | 403         | Insufficient permissions          |
| `NOT_FOUND`          | 404         | Resource not found                |
| `PRODUCT_NOT_FOUND`  | 404         | Specific product not found        |
| `CUSTOMER_NOT_FOUND` | 404         | Specific customer not found       |
| `TOO_MANY_REQUESTS`  | 429         | Rate limit exceeded               |

### Validation Errors

Validation errors return a `400` status with detailed field-level errors:

```json
{
  "result": null,
  "error": {
    "messageKey": "VALIDATION_ERROR",
    "messageEn": "Validation error.",
    "messageAr": "خطأ في التحقق من البيانات.",
    "details": [
      {
        "field": "items",
        "message": "items must not be empty",
        "value": []
      },
      {
        "field": "price",
        "message": "Price must be non-negative",
        "value": -10
      }
    ]
  }
}
```

### Rate Limiting

Some endpoints have rate limiting to prevent abuse:

**Example - Login Endpoint:**

- **Limit:** 5 requests per minute
- **Status:** 429 Too Many Requests

```json
{
  "result": null,
  "error": {
    "messageKey": "TOO_MANY_REQUESTS",
    "messageEn": "Too many requests.",
    "messageAr": "طلبات كثيرة جدًا."
  }
}
```

---

## Development & Testing

### Environment Setup

**Required Environment Variables:**

- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT signing
- `CORS_ORIGIN` - Allowed frontend origins (comma-separated)

**Example `.env`:**

```env
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/nerdpos
JWT_SECRET=your-secret-key-here
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
NODE_ENV=development
```

### CORS Configuration

CORS is enabled for configured origins with credentials support:

```javascript
{
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true
}
```

This allows the frontend to send cookies with requests.

### Global Validation

All DTOs are automatically validated using `class-validator`. Invalid requests return `400` with detailed validation errors.

### Testing with Swagger UI

1. **Access Swagger:** `http://localhost:3001/api/docs`
2. **Login:** Use `POST /api/v1/auth/login` with credentials
3. **Authorize:** Click "Authorize" and paste the JWT token
4. **Test Endpoints:** Use "Try it out" on any endpoint

### Testing with cURL

**Login:**

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"nerdpos123"}' \
  -c cookies.txt
```

**Authenticated Request:**

```bash
curl -X GET http://localhost:3001/api/v1/auth/profile \
  -b cookies.txt
```

### Testing with Postman

1. **Login:** Send `POST /api/v1/auth/login` with credentials
2. **Cookie Auto-Handling:** Postman automatically stores cookies
3. **Subsequent Requests:** Cookies are sent automatically

### Health Check

**Endpoint:** `GET /health`

Returns server health status (no authentication required):

```json
{
  "status": "ok",
  "timestamp": "2026-02-16T12:00:00.000Z"
}
```

---

## Additional Resources

- **Swagger UI:** [http://localhost:3001/api/docs](http://localhost:3001/api/docs) - Interactive API documentation
- **OpenAPI JSON:** [http://localhost:3001/api/docs-json](http://localhost:3001/api/docs-json) - Raw OpenAPI specification

---

## Summary

This API follows consistent patterns across all endpoints:

✅ **Response Envelope:** All responses use `{ result, error }` structure  
✅ **Authentication:** HTTP-only cookies with JWT tokens  
✅ **Bilingual Support:** All messages in English (`messageEn`) and Arabic (`messageAr`)  
✅ **Validation:** Automatic DTO validation with detailed error messages  
✅ **Documentation:** Complete Swagger/OpenAPI documentation at `/api/docs`

For **module-specific endpoint details**, always refer to the [Swagger Documentation](http://localhost:3001/api/docs).
