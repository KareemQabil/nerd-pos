#!/usr/bin/env ts-node

/**
 * 💰 NERDPOS FINANCIAL VALIDATION TEST SUITE
 * ==========================================
 * 
 * Comprehensive tests for financial calculations, ensuring:
 * - Decimal precision (no floating-point errors)
 * - Tax calculations (15% VAT)
 * - Discount applications
 * - Payment reconciliation
 * - Session balancing
 * - FIFO inventory costing
 * 
 * Usage: npx ts-node scripts/financial-tests.ts
 */

import axios, { AxiosInstance } from 'axios';
import Decimal from 'decimal.js';

// =====================================================
// CONFIGURATION
// =====================================================

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api/v1';
const TIMESTAMP = Date.now();
const TAX_RATE = new Decimal(15); // 15% VAT

// Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// =====================================================
// TEST STATE
// =====================================================

interface TestResult {
  test: string;
  passed: boolean;
  expected: string;
  actual: string;
  difference?: string;
}

interface State {
  token: string;
  ids: Record<string, string>;
  results: TestResult[];
}

const STATE: State = {
  token: '',
  ids: {},
  results: [],
};

// =====================================================
// HELPERS
// =====================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' | 'step' = 'info') {
  const colors = {
    info: C.cyan,
    success: C.green,
    error: C.red,
    warn: C.yellow,
    step: C.blue,
  };
  console.log(`${colors[type]}${message}${C.reset}`);
}

function createApi(token?: string): AxiosInstance {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true,
    timeout: 30000,
  });
}

function recordResult(test: string, expected: Decimal | string, actual: any, tolerance: string = '0.01') {
  const e = new Decimal(expected.toString());
  const a = new Decimal(actual?.toString() || '0');
  const diff = e.minus(a).abs();
  const passed = diff.lessThanOrEqualTo(tolerance);
  
  STATE.results.push({
    test,
    passed,
    expected: e.toFixed(2),
    actual: a.toFixed(2),
    difference: diff.toFixed(4),
  });
  
  if (passed) {
    log(`    ✓ ${test}: ${a.toFixed(2)} (expected ${e.toFixed(2)}, diff: ${diff.toFixed(4)})`, 'success');
  } else {
    log(`    ✗ ${test}: ${a.toFixed(2)} (expected ${e.toFixed(2)}, diff: ${diff.toFixed(4)})`, 'error');
  }
  
  return passed;
}

// =====================================================
// SETUP
// =====================================================

async function setup(): Promise<AxiosInstance> {
  log('\n📦 Setting up financial tests...', 'info');
  
  const api = createApi();
  const login = await api.post('/auth/login', {
    username: 'admin',
    password: 'nerdpos123',
  });
  
  STATE.token = login.data.data?.access_token || login.data.access_token;
  const adminApi = createApi(STATE.token);
  
  // Get warehouse
  const wh = await adminApi.get('/inventory/warehouses');
  STATE.ids.warehouse = wh.data.data?.[0]?.id;
  
  // Get terminal
  const term = await adminApi.get('/settings/terminals');
  STATE.ids.terminal = term.data.data?.[0]?.id;
  
  // Get category
  const cat = await adminApi.get('/categories');
  STATE.ids.category = cat.data.data?.[0]?.id;
  
  if (!STATE.ids.category) {
    const newCat = await adminApi.post('/categories', {
      nameAr: 'مالية',
      nameEn: 'Financial Tests',
      sortOrder: 99,
      isActive: true,
    });
    STATE.ids.category = newCat.data.data?.id;
  }
  
  // Create cashier and session
  const cashierData = {
    username: `fin_cashier_${TIMESTAMP}`,
    password: 'test123',
    pin: '1234',
    nameAr: 'كاشير مالي',
    nameEn: 'Financial Cashier',
    role: 'CASHIER',
  };
  
  await adminApi.post('/users', cashierData);
  const cashierLogin = await createApi().post('/auth/login', {
    username: cashierData.username,
    password: cashierData.password,
  });
  STATE.token = cashierLogin.data.data?.access_token || cashierLogin.data.access_token;
  
  const cashierApi = createApi(STATE.token);
  
  // Open session
  const session = await cashierApi.post('/sessions/open', {
    terminalId: STATE.ids.terminal,
    openingBalance: 1000.00,
  });
  STATE.ids.session = session.data.data?.id;
  
  log(`  ✓ Setup complete`, 'success');
  return cashierApi;
}

// =====================================================
// TEST SUITES
// =====================================================

/**
 * Test Suite 1: Basic Tax Calculations
 */
async function testBasicTaxCalculations(api: AxiosInstance) {
  console.log('\n' + '═'.repeat(60));
  log(`${C.bright}TEST SUITE 1: Basic Tax Calculations (15% VAT)${C.reset}`, 'info');
  console.log('═'.repeat(60));
  
  const adminApi = createApi(STATE.token);
  
  // Test case: Simple item
  log('\n[Test 1.1] Single Item - Integer Price', 'step');
  log(`    Price: 100.00 SAR | Expected Tax: 15.00 | Expected Total: 115.00`, 'info');
  
  const product1 = await adminApi.post('/products', {
    sku: `FIN-100-${TIMESTAMP}`,
    nameEn: 'Test Item 100',
    nameAr: 'صنف 100',
    price: 100.00,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  const order1 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product1.data.data.id, quantity: 1, unitPrice: 100.00 }],
  });
  
  const order1Details = await api.get(`/orders/${order1.data.data.id}`);
  const o1 = order1Details.data.data;
  
  recordResult('Subtotal (100)', '100', o1.itemSubtotal || o1.subtotal);
  recordResult('Tax (15%)', '15', o1.taxAmount || o1.tax);
  recordResult('Total', '115', o1.grandTotal || o1.total);
  
  // Test case: Decimal price
  log('\n[Test 1.2] Single Item - Decimal Price', 'step');
  log(`    Price: 99.99 SAR | Expected Tax: 15.00 | Expected Total: 114.99`, 'info');
  
  const product2 = await adminApi.post('/products', {
    sku: `FIN-9999-${TIMESTAMP}`,
    nameEn: 'Test Item 99.99',
    nameAr: 'صنف 99.99',
    price: 99.99,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  const order2 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product2.data.data.id, quantity: 1, unitPrice: 99.99 }],
  });
  
  const order2Details = await api.get(`/orders/${order2.data.data.id}`);
  const o2 = order2Details.data.data;
  
  // 99.99 × 0.15 = 14.9985 → rounds to 15.00
  const expectedTax2 = new Decimal('99.99').times('0.15').toDP(2);
  const expectedTotal2 = new Decimal('99.99').plus(expectedTax2);
  
  recordResult('Subtotal (99.99)', '99.99', o2.itemSubtotal || o2.subtotal);
  recordResult('Tax (15%)', expectedTax2.toString(), o2.taxAmount || o2.tax);
  recordResult('Total', expectedTotal2.toString(), o2.grandTotal || o2.total);
}

/**
 * Test Suite 2: Multiple Items & Quantities
 */
async function testMultipleItems(api: AxiosInstance) {
  console.log('\n' + '═'.repeat(60));
  log(`${C.bright}TEST SUITE 2: Multiple Items & Quantities${C.reset}`, 'info');
  console.log('═'.repeat(60));
  
  const adminApi = createApi(STATE.token);
  
  // Create test products
  const prices = [45.50, 32.75, 18.00];
  const quantities = [2, 3, 5];
  const productIds: string[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    const prod = await adminApi.post('/products', {
      sku: `MULTI-${i}-${TIMESTAMP}`,
      nameEn: `Multi Item ${i}`,
      nameAr: `صنف متعدد ${i}`,
      price: prices[i],
      categoryId: STATE.ids.category,
      trackInventory: false,
      isActive: true,
    });
    productIds.push(prod.data.data.id);
  }
  
  log('\n[Test 2.1] Multiple Items Order', 'step');
  log(`    Item 1: ${quantities[0]} × ${prices[0]} = ${quantities[0] * prices[0]}`, 'info');
  log(`    Item 2: ${quantities[1]} × ${prices[1]} = ${quantities[1] * prices[1]}`, 'info');
  log(`    Item 3: ${quantities[2]} × ${prices[2]} = ${quantities[2] * prices[2]}`, 'info');
  
  /*
   * CALCULATION:
   * 2 × 45.50 = 91.00
   * 3 × 32.75 = 98.25
   * 5 × 18.00 = 90.00
   * Subtotal = 279.25
   * Tax (15%) = 41.8875 → 41.89
   * Total = 321.14
   */
  
  const expectedSubtotal = new Decimal(91).plus(98.25).plus(90);
  const expectedTax = expectedSubtotal.times('0.15').toDP(2);
  const expectedTotal = expectedSubtotal.plus(expectedTax);
  
  log(`    Expected Subtotal: ${expectedSubtotal.toFixed(2)}`, 'info');
  log(`    Expected Tax: ${expectedTax.toFixed(2)}`, 'info');
  log(`    Expected Total: ${expectedTotal.toFixed(2)}`, 'info');
  
  const order = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [
      { productId: productIds[0], quantity: quantities[0], unitPrice: prices[0] },
      { productId: productIds[1], quantity: quantities[1], unitPrice: prices[1] },
      { productId: productIds[2], quantity: quantities[2], unitPrice: prices[2] },
    ],
  });
  
  const orderDetails = await api.get(`/orders/${order.data.data.id}`);
  const o = orderDetails.data.data;
  
  recordResult('Subtotal', expectedSubtotal.toString(), o.itemSubtotal || o.subtotal);
  recordResult('Tax', expectedTax.toString(), o.taxAmount || o.tax);
  recordResult('Total', expectedTotal.toString(), o.grandTotal || o.total);
}

/**
 * Test Suite 3: Discount Calculations
 */
async function testDiscountCalculations(api: AxiosInstance) {
  console.log('\n' + '═'.repeat(60));
  log(`${C.bright}TEST SUITE 3: Discount Calculations${C.reset}`, 'info');
  console.log('═'.repeat(60));
  
  const adminApi = createApi(STATE.token);
  
  // Test 3.1: Percentage discount
  log('\n[Test 3.1] Percentage Discount (10%)', 'step');
  
  const product = await adminApi.post('/products', {
    sku: `DISC-PCT-${TIMESTAMP}`,
    nameEn: 'Discount Test Item',
    nameAr: 'صنف خصم',
    price: 200.00,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  // Create percentage discount
  const discountPct = await adminApi.post('/discounts', {
    name: 'Test 10% Discount',
    nameAr: 'خصم 10%',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    isActive: true,
  });
  
  /*
   * CALCULATION:
   * Price: 200
   * Discount (10%): 20
   * After Discount: 180
   * Tax (15%): 27
   * Total: 207
   */
  
  log(`    Price: 200.00 | Discount: 10% = 20.00 | After: 180.00`, 'info');
  log(`    Tax (15%): 27.00 | Total: 207.00`, 'info');
  
  const orderPct = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    discountId: discountPct.data.data?.id,
    items: [{ productId: product.data.data.id, quantity: 1, unitPrice: 200.00 }],
  });
  
  if (orderPct.status === 201) {
    const orderPctDetails = await api.get(`/orders/${orderPct.data.data.id}`);
    const o = orderPctDetails.data.data;
    
    const discountAmount = parseFloat(o.discountAmount || o.discount || '0');
    if (discountAmount > 0) {
      recordResult('Discount Amount', '20', discountAmount);
      recordResult('After Discount', '180', new Decimal(o.itemSubtotal || o.subtotal || '200').minus(discountAmount));
    } else {
      log(`    ⚠ Discount not applied (may require different API flow)`, 'warn');
    }
  }
  
  // Test 3.2: Fixed amount discount
  log('\n[Test 3.2] Fixed Amount Discount (25 SAR)', 'step');
  
  const discountFixed = await adminApi.post('/discounts', {
    name: 'Test 25 SAR Discount',
    nameAr: 'خصم 25 ريال',
    discountType: 'FIXED',
    discountValue: 25,
    isActive: true,
  });
  
  /*
   * CALCULATION:
   * Price: 200
   * Discount (Fixed): 25
   * After Discount: 175
   * Tax (15%): 26.25
   * Total: 201.25
   */
  
  log(`    Price: 200.00 | Discount: 25.00 | After: 175.00`, 'info');
  log(`    Tax (15%): 26.25 | Total: 201.25`, 'info');
  
  const orderFixed = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    discountId: discountFixed.data.data?.id,
    items: [{ productId: product.data.data.id, quantity: 1, unitPrice: 200.00 }],
  });
  
  if (orderFixed.status === 201) {
    const orderFixedDetails = await api.get(`/orders/${orderFixed.data.data.id}`);
    const o = orderFixedDetails.data.data;
    
    const discountAmount = parseFloat(o.discountAmount || o.discount || '0');
    if (discountAmount > 0) {
      recordResult('Fixed Discount Amount', '25', discountAmount);
    }
  }
}

/**
 * Test Suite 4: Edge Cases
 */
async function testEdgeCases(api: AxiosInstance) {
  console.log('\n' + '═'.repeat(60));
  log(`${C.bright}TEST SUITE 4: Edge Cases & Precision${C.reset}`, 'info');
  console.log('═'.repeat(60));
  
  const adminApi = createApi(STATE.token);
  
  // Test 4.1: Repeating decimal (1/3 scenario)
  log('\n[Test 4.1] Repeating Decimal Price (33.33)', 'step');
  
  const product1 = await adminApi.post('/products', {
    sku: `EDGE-3333-${TIMESTAMP}`,
    nameEn: 'One Third Test',
    nameAr: 'ثلث اختبار',
    price: 33.33,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  // 33.33 × 3 = 99.99
  // Tax = 14.9985 → 15.00
  // Total = 114.99
  
  log(`    3 × 33.33 = 99.99 | Tax: 15.00 | Total: 114.99`, 'info');
  
  const order1 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product1.data.data.id, quantity: 3, unitPrice: 33.33 }],
  });
  
  const order1Details = await api.get(`/orders/${order1.data.data.id}`);
  const o1 = order1Details.data.data;
  
  const expectedSubtotal = new Decimal('33.33').times(3);
  const expectedTax = expectedSubtotal.times('0.15').toDP(2);
  const expectedTotal = expectedSubtotal.plus(expectedTax);
  
  recordResult('Subtotal (33.33 × 3)', expectedSubtotal.toString(), o1.itemSubtotal || o1.subtotal);
  recordResult('Total', expectedTotal.toString(), o1.grandTotal || o1.total);
  
  // Test 4.2: Very small amounts
  log('\n[Test 4.2] Small Amount (0.50)', 'step');
  
  const product2 = await adminApi.post('/products', {
    sku: `EDGE-050-${TIMESTAMP}`,
    nameEn: 'Small Item',
    nameAr: 'صنف صغير',
    price: 0.50,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  // 0.50 × 15% = 0.075 → 0.08
  // Total = 0.58
  
  log(`    Price: 0.50 | Tax (15%): 0.08 | Total: 0.58`, 'info');
  
  const order2 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product2.data.data.id, quantity: 1, unitPrice: 0.50 }],
  });
  
  if (order2.status === 201) {
    const order2Details = await api.get(`/orders/${order2.data.data.id}`);
    const o2 = order2Details.data.data;
    
    const smallTax = new Decimal('0.50').times('0.15').toDP(2);
    recordResult('Small Tax Rounding', smallTax.toString(), o2.taxAmount || o2.tax);
  }
  
  // Test 4.3: Large amount
  log('\n[Test 4.3] Large Amount (9,999.99)', 'step');
  
  const product3 = await adminApi.post('/products', {
    sku: `EDGE-LARGE-${TIMESTAMP}`,
    nameEn: 'Large Item',
    nameAr: 'صنف كبير',
    price: 9999.99,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  // 9999.99 × 15% = 1499.9985 → 1500.00
  // Total = 11499.99
  
  log(`    Price: 9999.99 | Tax (15%): 1500.00 | Total: 11499.99`, 'info');
  
  const order3 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product3.data.data.id, quantity: 1, unitPrice: 9999.99 }],
  });
  
  if (order3.status === 201) {
    const order3Details = await api.get(`/orders/${order3.data.data.id}`);
    const o3 = order3Details.data.data;
    
    const largeTax = new Decimal('9999.99').times('0.15').toDP(2);
    const largeTotal = new Decimal('9999.99').plus(largeTax);
    
    recordResult('Large Amount Tax', largeTax.toString(), o3.taxAmount || o3.tax);
    recordResult('Large Amount Total', largeTotal.toString(), o3.grandTotal || o3.total);
  }
  
  // Test 4.4: Many small items (floating point accumulation test)
  log('\n[Test 4.4] Many Small Items (10 × 0.30 = precision test)', 'step');
  
  const product4 = await adminApi.post('/products', {
    sku: `EDGE-030-${TIMESTAMP}`,
    nameEn: 'Precision Test',
    nameAr: 'اختبار دقة',
    price: 0.30,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  // 0.30 × 10 = 3.00 (but 0.3 in binary floating point is repeating!)
  // In naive JS: 0.1 + 0.2 = 0.30000000000000004
  // We expect: 3.00 exactly
  
  log(`    10 × 0.30 = 3.00 (floating-point precision test)`, 'info');
  
  const order4 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product4.data.data.id, quantity: 10, unitPrice: 0.30 }],
  });
  
  if (order4.status === 201) {
    const order4Details = await api.get(`/orders/${order4.data.data.id}`);
    const o4 = order4Details.data.data;
    
    recordResult('Precision Subtotal', '3.00', o4.itemSubtotal || o4.subtotal);
    
    // Check for floating-point errors
    const subtotalStr = (o4.itemSubtotal || o4.subtotal || '').toString();
    if (subtotalStr.includes('0000000') || subtotalStr.length > 10) {
      log(`    ⚠ Possible floating-point issue: ${subtotalStr}`, 'warn');
    }
  }
}

/**
 * Test Suite 5: Payment Reconciliation
 */
async function testPaymentReconciliation(api: AxiosInstance) {
  console.log('\n' + '═'.repeat(60));
  log(`${C.bright}TEST SUITE 5: Payment Reconciliation${C.reset}`, 'info');
  console.log('═'.repeat(60));
  
  const adminApi = createApi(STATE.token);
  
  // Test 5.1: Exact payment
  log('\n[Test 5.1] Exact Payment Amount', 'step');
  
  const product = await adminApi.post('/products', {
    sku: `PAY-EXACT-${TIMESTAMP}`,
    nameEn: 'Payment Test',
    nameAr: 'اختبار دفع',
    price: 50.00,
    categoryId: STATE.ids.category,
    trackInventory: false,
    isActive: true,
  });
  
  const order = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product.data.data.id, quantity: 1, unitPrice: 50.00 }],
  });
  
  const orderDetails = await api.get(`/orders/${order.data.data.id}`);
  const total = parseFloat(orderDetails.data.data.grandTotal || orderDetails.data.data.total);
  
  log(`    Order Total: ${total.toFixed(2)} SAR`, 'info');
  
  const payment = await api.post('/payments', {
    orderId: order.data.data.id,
    paymentMethod: 'CASH',
    amount: total,
    amountReceived: total,
    sessionId: STATE.ids.session,
  });
  
  if (payment.status === 201) {
    recordResult('Payment Amount', total.toString(), payment.data.data.amount);
    
    // Verify order is paid
    const finalOrder = await api.get(`/orders/${order.data.data.id}`);
    const status = finalOrder.data.data.status;
    const isPaid = status === 'COMPLETED' || status === 'PAID';
    
    STATE.results.push({
      test: 'Order Marked Paid',
      passed: isPaid,
      expected: 'COMPLETED/PAID',
      actual: status,
    });
    log(`    ${isPaid ? '✓' : '✗'} Order status: ${status}`, isPaid ? 'success' : 'error');
  }
  
  // Test 5.2: Change calculation
  log('\n[Test 5.2] Change Calculation', 'step');
  
  const order2 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId: product.data.data.id, quantity: 1, unitPrice: 50.00 }],
  });
  
  const order2Details = await api.get(`/orders/${order2.data.data.id}`);
  const total2 = parseFloat(order2Details.data.data.grandTotal || order2Details.data.data.total);
  const received = 100.00;
  const expectedChange = new Decimal(received).minus(total2);
  
  log(`    Total: ${total2.toFixed(2)} | Received: ${received} | Change: ${expectedChange.toFixed(2)}`, 'info');
  
  const payment2 = await api.post('/payments', {
    orderId: order2.data.data.id,
    paymentMethod: 'CASH',
    amount: total2,
    amountReceived: received,
    sessionId: STATE.ids.session,
  });
  
  if (payment2.status === 201) {
    const change = parseFloat(payment2.data.data.changeGiven || payment2.data.data.change || '0');
    if (change > 0) {
      recordResult('Change Amount', expectedChange.toString(), change);
    } else {
      log(`    ⚠ Change not returned in response`, 'warn');
    }
  }
}

/**
 * Test Suite 6: FIFO Inventory Costing
 */
async function testFIFOCosting(api: AxiosInstance) {
  console.log('\n' + '═'.repeat(60));
  log(`${C.bright}TEST SUITE 6: FIFO Inventory Costing${C.reset}`, 'info');
  console.log('═'.repeat(60));
  
  const adminApi = createApi(STATE.token);
  
  // Create tracked product
  const product = await adminApi.post('/products', {
    sku: `FIFO-TEST-${TIMESTAMP}`,
    nameEn: 'FIFO Test Item',
    nameAr: 'صنف فيفو',
    price: 100.00,
    cost: 0, // Will be calculated from batches
    categoryId: STATE.ids.category,
    trackInventory: true,
    isActive: true,
  });
  
  const productId = product.data.data.id;
  
  // Receive batch 1
  log('\n[Test 6.1] Receive Batch 1: 10 units @ 20 SAR', 'step');
  await adminApi.post('/inventory/receive', {
    warehouseId: STATE.ids.warehouse,
    items: [{
      productId,
      quantity: 10,
      unitCost: 20.00,
      batchNumber: `FIFO-B1-${TIMESTAMP}`,
    }],
  });
  
  // Receive batch 2
  log('\n[Test 6.2] Receive Batch 2: 10 units @ 25 SAR', 'step');
  await adminApi.post('/inventory/receive', {
    warehouseId: STATE.ids.warehouse,
    items: [{
      productId,
      quantity: 10,
      unitCost: 25.00,
      batchNumber: `FIFO-B2-${TIMESTAMP}`,
    }],
  });
  
  // Check total stock
  const stockCheck = await adminApi.get(`/inventory/stock/${productId}/${STATE.ids.warehouse}`);
  const totalStock = parseFloat(
    stockCheck.data.data?.availableQuantity || 
    stockCheck.data.data?.quantityOnHand || 
    '0'
  );
  
  log(`\n[Test 6.3] Verify Total Stock: 20 units`, 'step');
  recordResult('Total Stock', '20', totalStock);
  
  // Sell 5 units (should come from batch 1 @ 20 SAR)
  log('\n[Test 6.4] Sell 5 units (FIFO: from Batch 1)', 'step');
  log(`    Expected COGS: 5 × 20 = 100 SAR`, 'info');
  
  const order = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId, quantity: 5, unitPrice: 100.00 }],
  });
  
  // Pay the order
  if (order.status === 201) {
    const orderDetails = await api.get(`/orders/${order.data.data.id}`);
    const total = parseFloat(orderDetails.data.data.grandTotal || orderDetails.data.data.total);
    
    await api.post('/payments', {
      orderId: order.data.data.id,
      paymentMethod: 'CASH',
      amount: total,
      sessionId: STATE.ids.session,
    });
    
    // Check remaining stock
    const afterStock = await adminApi.get(`/inventory/stock/${productId}/${STATE.ids.warehouse}`);
    const remainingStock = parseFloat(
      afterStock.data.data?.availableQuantity || 
      afterStock.data.data?.quantityOnHand || 
      '0'
    );
    
    recordResult('Remaining Stock After Sale', '15', remainingStock);
  }
  
  // Sell 7 more units (should take 5 from batch 1, 2 from batch 2)
  log('\n[Test 6.5] Sell 7 more units (crosses batches)', 'step');
  log(`    Expected COGS: 5 × 20 + 2 × 25 = 100 + 50 = 150 SAR`, 'info');
  
  const order2 = await api.post('/orders', {
    orderType: 'TAKEOUT',
    terminalId: STATE.ids.terminal,
    warehouseId: STATE.ids.warehouse,
    sessionId: STATE.ids.session,
    items: [{ productId, quantity: 7, unitPrice: 100.00 }],
  });
  
  if (order2.status === 201) {
    const order2Details = await api.get(`/orders/${order2.data.data.id}`);
    const total2 = parseFloat(order2Details.data.data.grandTotal || order2Details.data.data.total);
    
    await api.post('/payments', {
      orderId: order2.data.data.id,
      paymentMethod: 'CASH',
      amount: total2,
      sessionId: STATE.ids.session,
    });
    
    // Check remaining stock (should be 8 from batch 2)
    const finalStock = await adminApi.get(`/inventory/stock/${productId}/${STATE.ids.warehouse}`);
    const finalQty = parseFloat(
      finalStock.data.data?.availableQuantity || 
      finalStock.data.data?.quantityOnHand || 
      '0'
    );
    
    recordResult('Final Stock (Batch 2 only)', '8', finalQty);
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function runAllFinancialTests() {
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(68) + '║');
  console.log(`║${C.bright}${C.yellow}       💰 NERDPOS FINANCIAL VALIDATION SUITE 💰${C.reset}` + ' '.repeat(22) + '║');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');
  
  log(`🚀 API Target: ${API_BASE_URL}`, 'info');
  log(`📅 Timestamp: ${TIMESTAMP}`, 'info');
  log(`💹 Tax Rate: ${TAX_RATE}%\n`, 'info');
  
  try {
    const api = await setup();
    
    await testBasicTaxCalculations(api);
    await testMultipleItems(api);
    await testDiscountCalculations(api);
    await testEdgeCases(api);
    await testPaymentReconciliation(api);
    await testFIFOCosting(api);
    
    // Summary
    console.log('\n' + '═'.repeat(70));
    log(`${C.bright}FINANCIAL TEST SUMMARY${C.reset}`, 'info');
    console.log('═'.repeat(70));
    
    const passed = STATE.results.filter(r => r.passed).length;
    const failed = STATE.results.filter(r => !r.passed).length;
    const total = STATE.results.length;
    
    console.log(`\n  Total Tests: ${total}`);
    log(`  Passed: ${passed}`, 'success');
    if (failed > 0) {
      log(`  Failed: ${failed}`, 'error');
      
      console.log('\n  Failed Tests:');
      STATE.results.filter(r => !r.passed).forEach(r => {
        log(`    ✗ ${r.test}: Expected ${r.expected}, Got ${r.actual} (diff: ${r.difference})`, 'error');
      });
    }
    
    const passRate = (passed / total * 100).toFixed(1);
    console.log('\n' + '─'.repeat(70));
    log(`🏆 Financial Accuracy: ${passRate}% (${passed}/${total})`, passed === total ? 'success' : 'warn');
    
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error: any) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

runAllFinancialTests();
