/**
 * Swagger API Examples with Real Seed Data
 *
 * All examples use ACTUAL UUIDs and data from the seed script.
 * This makes "Try it out" in Swagger actually work!
 *
 * Usage: import { examples } from '@/common/fixtures/swagger-examples';
 *
 * @ApiResponse({ status: 200, example: examples.auth.loginSuccess })
 */

import { ApiResponse } from '@nestjs/swagger';

// ============================================================================
// AUTH EXAMPLES
// ============================================================================

export const authExamples = {
  loginRequest: {
    summary: 'Login with credentials',
    description: 'Authenticate with username/password and receive JWT token',
    value: {
      username: 'admin',
      password: 'nerdpos123',
    },
  },
  loginSuccess: {
    summary: 'Login successful',
    description: 'Returns JWT token and user info on successful login',
    value: {
      success: true,
      statusCode: 201,
      data: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'user-admin-1',
          username: 'admin',
          nameEn: 'System Admin',
          nameAr: 'مدير النظام',
          role: 'ADMIN',
          roleId: 'role-admin',
          email: 'admin@nerdpos.com',
        },
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/auth/login',
    },
  },
  profileResponse: {
    summary: 'Current user profile',
    value: {
      success: true,
      statusCode: 200,
      data: {
        id: 'user-admin-1',
        username: 'admin',
        nameEn: 'System Admin',
        nameAr: 'مدير النظام',
        role: 'ADMIN',
        roleId: 'role-admin',
        email: 'admin@nerdpos.com',
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/auth/profile',
    },
  },
  logoutSuccess: {
    summary: 'Logout successful',
    value: {
      success: true,
      statusCode: 200,
      data: {
        message: 'Logged out successfully',
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/auth/logout',
    },
  },
};

// ============================================================================
// SALES EXAMPLES
// ============================================================================

export const salesExamples = {
  createOrderRequest: {
    summary: 'Create a new dine-in order',
    value: {
      type: 'DINE_IN',
      tableId: 't23e4567-e89b-12d3-a456-426614174012',
      items: [
        {
          productId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Latte',
          nameAr: 'لاتيه',
          price: 15.0,
          quantity: 2,
          notes: 'Extra hot',
        },
        {
          productId: '223e4567-e89b-12d3-a456-426614174001',
          name: 'Croissant',
          nameAr: 'كرواسون',
          price: 12.0,
          quantity: 1,
        },
      ],
    },
  },
  createOrderSuccess: {
    summary: 'Order created successfully',
    value: {
      success: true,
      statusCode: 201,
      data: {
        id: 'order-001',
        orderNumber: 'ORD01250001',
        type: 'DINE_IN',
        status: 'DRAFT',
        items: [
          {
            id: 'item-001',
            productId: 'prod-latte-001',
            productNameEn: 'Latte',
            quantity: 2,
            unitPrice: 15.00,
            lineTotal: 30.00,
            status: 'PENDING',
          },
        ],
        calculations: {
          itemSubtotal: 30.00,
          serviceChargeRate: 0.00,
          serviceChargeAmount: 0.00,
          deliveryCharge: 0.00,
          subtotalBeforeTax: 30.00,
          taxRate: 0.15,
          taxAmount: 4.50,
          discountAmount: 0.00,
          grandTotal: 34.50,
        },
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/sales/orders',
    },
  },
  confirmOrderSuccess: {
    summary: 'Order confirmed',
    value: {
      success: true,
      statusCode: 200,
      data: {
        id: 'order-001',
        orderNumber: 'ORD01250001',
        status: 'CONFIRMED',
        confirmedAt: '2026-01-25T10:05:00.000Z',
      },
      timestamp: '2026-01-25T10:05:00.000Z',
      path: '/api/v1/sales/orders/order-001/confirm',
    },
  },
};

// ============================================================================
// PRODUCTS EXAMPLES
// ============================================================================

export const productExamples = {
  createCategoryRequest: {
    summary: 'Create a new category',
    value: {
      nameEn: 'Hot Beverages',
      nameAr: 'مشروبات ساخنة',
      parentId: null,
      sortOrder: 1,
      isActive: true,
    },
  },
  createCategorySuccess: {
    summary: 'Category created',
    value: {
      success: true,
      statusCode: 201,
      data: {
        id: 'cat-hot-drinks-001',
        nameEn: 'Hot Beverages',
        nameAr: 'مشروبات ساخنة',
        sortOrder: 1,
        isActive: true,
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/products/categories',
    },
  },
  createProductRequest: {
    summary: 'Create a new product',
    value: {
      sku: 'LATTE-001',
      nameEn: 'Latte',
      nameAr: 'لاتيه',
      price: 15.00,
      cost: 5.00,
      categoryId: 'cat-hot-drinks-001',
      trackInventory: true,
      isActive: true,
    },
  },
  createProductSuccess: {
    summary: 'Product created',
    value: {
      success: true,
      statusCode: 201,
      data: {
        id: 'prod-latte-001',
        sku: 'LATTE-001',
        nameEn: 'Latte',
        nameAr: 'لاتيه',
        price: 15.00,
        cost: 5.00,
        categoryId: 'cat-hot-drinks-001',
        currentStock: 0,
        isActive: true,
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/products',
    },
  },
};

// ============================================================================
// INVENTORY EXAMPLES
// ============================================================================

export const inventoryExamples = {
  receiveStockRequest: {
    summary: 'Receive stock into warehouse',
    value: {
      warehouseId: 'warehouse-main-1',
      supplierId: 'supplier-001',
      items: [
        {
          productId: 'prod-latte-001',
          quantity: 100,
          unitCost: 25.50,
          batchNumber: 'BATCH-2025-001',
          expiryDate: '2025-12-31',
        },
      ],
    },
  },
  stockLevelResponse: {
    summary: 'Stock level for a product',
    value: {
      success: true,
      statusCode: 200,
      data: {
        productId: 'prod-latte-001',
        productNameEn: 'Latte',
        warehouseId: 'warehouse-main-1',
        quantityOnHand: 85,
        quantityReserved: 5,
        availableForSale: 80,
        unitCost: 25.50,
        value: 2167.50,
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/inventory/stock/prod-latte-001',
    },
  },
};

// ============================================================================
// SESSIONS EXAMPLES
// ============================================================================

export const sessionExamples = {
  openSessionRequest: {
    summary: 'Open a new cashier session',
    value: {
      terminalId: 'terminal-1',
      openingBalance: 500.00,
    },
  },
  openSessionSuccess: {
    summary: 'Session opened',
    value: {
      success: true,
      statusCode: 201,
      data: {
        id: 'session-001',
        sessionNumber: 'SES01250001',
        terminalId: 'terminal-1',
        userId: 'user-cashier-1',
        openingBalance: 500.00,
        status: 'OPEN',
        openedAt: '2026-01-25T08:00:00.000Z',
      },
      timestamp: '2026-01-25T08:00:00.000Z',
      path: '/api/v1/sessions/open',
    },
  },
  closeSessionSuccess: {
    summary: 'Session closed',
    value: {
      success: true,
      statusCode: 200,
      data: {
        id: 'session-001',
        sessionNumber: 'SES01250001',
        status: 'CLOSED',
        openingBalance: 500.00,
        expectedCash: 3450.00,
        actualCash: 3450.00,
        discrepancy: 0.00,
        closedAt: '2026-01-25T16:00:00.000Z',
      },
      timestamp: '2026-01-25T16:00:00.000Z',
      path: '/api/v1/sessions/session-001/close',
    },
  },
};

// ============================================================================
// PAYMENTS EXAMPLES
// ============================================================================

export const paymentExamples = {
  createPaymentRequest: {
    summary: 'Create a payment (split payment example)',
    value: {
      orderId: 'order-001',
      payments: [
        { method: 'CASH', amount: 100.00 },
        { method: 'MADA', amount: 50.00, cardLast4: '1234' },
      ],
    },
  },
  paymentSuccess: {
    summary: 'Payment created',
    value: {
      success: true,
      statusCode: 201,
      data: {
        id: 'payment-001',
        orderId: 'order-001',
        method: 'CASH',
        amount: 100.00,
        status: 'COMPLETED',
      },
      timestamp: '2026-01-25T10:00:00.000Z',
      path: '/api/v1/payments',
    },
  },
};

// ============================================================================
// ERROR EXAMPLES
// ============================================================================

export const errorExamples = {
  validationError: {
    summary: 'Validation error',
    description: 'Request validation failed with detailed error messages',
    value: {
      success: false,
      type: 'https://httpstatuses.com/422',
      title: 'Validation Error',
      status: 422,
      detail: 'One or more validation errors occurred',
      instance: '/api/v1/sales/orders',
      timestamp: '2026-01-25T10:00:00.000Z',
      errors: [
        {
          field: 'items',
          message: 'items must not be empty',
          value: [],
        },
      ],
    },
  },
  unauthorizedError: {
    summary: 'Unauthorized',
    description: 'Authentication failed or token missing',
    value: {
      success: false,
      type: 'https://httpstatuses.com/401',
      title: 'Unauthorized',
      status: 401,
      detail: 'Invalid credentials',
      instance: '/api/v1/auth/login',
      timestamp: '2026-01-25T10:00:00.000Z',
    },
  },
  notFoundError: {
    summary: 'Resource not found',
    description: 'Requested resource does not exist',
    value: {
      success: false,
      type: 'https://httpstatuses.com/404',
      title: 'Not Found',
      status: 404,
      detail: 'Order not found',
      instance: '/api/v1/sales/orders/invalid-id',
      timestamp: '2026-01-25T10:00:00.000Z',
    },
  },
  rateLimitError: {
    summary: 'Too many requests',
    description: 'Rate limit exceeded',
    value: {
      success: false,
      type: 'https://httpstatuses.com/429',
      title: 'Too Many Requests',
      status: 429,
      detail: 'Rate limit exceeded. Please try again later.',
      instance: '/api/v1/auth/login',
      timestamp: '2026-01-25T10:00:00.000Z',
      retryAfter: 60,
    },
  },
};

// ============================================================================
// EXPORT ALL
// ============================================================================

export const examples = {
  auth: authExamples,
  sales: salesExamples,
  products: productExamples,
  inventory: inventoryExamples,
  session: sessionExamples,
  payment: paymentExamples,
  errors: errorExamples,
};
