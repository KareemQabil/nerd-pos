import axios, { AxiosInstance, Method } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001/api/v1';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nerdpos123';
const LOG_FILE = path.join(__dirname, 'verification_full_flow.log');

function log(message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ${message}`;
  if (data !== undefined) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    logLine += `\n${payload}`;
  }
  logLine += '\n';
  fs.appendFileSync(LOG_FILE, logLine);
}

function unwrapData(payload: any) {
  if (!payload) return payload;
  if (payload?.data?.data !== undefined) return payload.data.data;
  if (payload?.data !== undefined) return payload.data;
  return payload;
}

async function request(api: AxiosInstance, method: Method, url: string, options?: { data?: any; params?: any }) {
  const requestPayload = options?.data;
  const requestParams = options?.params;
  log(`REQUEST ${method.toUpperCase()} ${url}`, { params: requestParams ?? null, body: requestPayload ?? null });

  const config: { method: Method; url: string; params?: any; data?: any } = { method, url };
  if (requestParams !== undefined) config.params = requestParams;
  if (requestPayload !== undefined) config.data = requestPayload;

  try {
    const response = await api.request(config);
    log(`RESPONSE ${method.toUpperCase()} ${url} ${response.status}`, response.data);
    return response;
  } catch (error: any) {
    if (error.response) {
      log(`RESPONSE ${method.toUpperCase()} ${url} ${error.response.status}`, error.response.data);
    } else {
      log(`RESPONSE ${method.toUpperCase()} ${url} ERROR`, error.message || error.toString());
    }
    throw error;
  }
}

async function main() {
  fs.writeFileSync(LOG_FILE, 'STARTING FULL FLOW VERIFICATION\n');

  log('1. Logging in...');
  log('REQUEST POST /auth/login', { username: ADMIN_USERNAME, password: '***' });
  const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });
  log('RESPONSE POST /auth/login', loginResponse.data);

  const loginPayload = unwrapData(loginResponse.data);
  const token = loginPayload?.access_token || loginPayload?.token;
  const userId = loginPayload?.user?.id || loginPayload?.userId;

  if (!token || !userId) {
    log('Login failed: Missing token or userId', loginResponse.data);
    process.exit(1);
  }

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const stamp = Date.now();
  const isUuid = (value: string | undefined) =>
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );

  // 2. Ensure session
  log('2. Ensuring cashier session...');
  let sessionId: string | undefined;
  try {
    const currentSession = await request(api, 'GET', `/sessions/current/${userId}`);
    const sessionData = unwrapData(currentSession.data);
    sessionId = sessionData?.id || sessionData?.sessionId;
    if (sessionId) {
      log('Active session found', sessionId);
    }
  } catch (error: any) {
    if (error.response?.status !== 404) {
      throw error;
    }
  }

  if (!sessionId) {
    const openSession = await request(api, 'POST', '/sessions/open', {
      data: {
        terminalId: `TERM-${stamp.toString().slice(-6)}`,
        openingBalance: 1000,
      },
    });
    const sessionData = unwrapData(openSession.data);
    sessionId = sessionData?.id || sessionData?.sessionId;
  }

  if (!sessionId) {
    log('Failed to establish session', { userId });
    process.exit(1);
  }

  // 3. Create category
  log('3. Creating category...');
  const categoryResponse = await request(api, 'POST', '/categories', {
    data: {
      nameEn: `Audit Category ${stamp}`,
      nameAr: `Audit Category AR ${stamp}`,
      isActive: true,
    },
  });
  const category = unwrapData(categoryResponse.data);
  const categoryId = category?.id;

  // 4. Create product
  log('4. Creating product...');
  const productResponse = await request(api, 'POST', '/products', {
    data: {
      sku: `AUD-${stamp}`,
      nameEn: `Audit Item ${stamp}`,
      nameAr: `Audit Item AR ${stamp}`,
      categoryId,
      price: 25.0,
      cost: 12.5,
      trackInventory: true,
      taxCategory: 'STANDARD',
      isActive: true,
    },
  });
  const product = unwrapData(productResponse.data);
  const productId = product?.id;

  if (!productId) {
    log('Product creation failed', productResponse.data);
    process.exit(1);
  }

  // 5. Ensure warehouse
  log('5. Ensuring warehouse...');
  let warehouseId: string | undefined;
  try {
    const defaultWarehouse = await request(
      api,
      'GET',
      '/inventory/warehouses/default',
    );
    const defaultData = unwrapData(defaultWarehouse.data);
    if (isUuid(defaultData?.id)) {
      warehouseId = defaultData.id;
    }
  } catch (error: any) {
    if (error.response?.status !== 404) {
      throw error;
    }
  }

  if (!warehouseId) {
    const warehousesResponse = await request(api, 'GET', '/inventory/warehouses');
    const warehouses = unwrapData(warehousesResponse.data);
    if (Array.isArray(warehouses) && warehouses.length > 0) {
      const match = warehouses.find((wh) => isUuid(wh?.id));
      warehouseId = match?.id;
    }
  }

  if (!warehouseId) {
    const warehouseResponse = await request(api, 'POST', '/inventory/warehouses', {
      data: {
        code: `WH${stamp.toString().slice(-8)}`,
        nameEn: 'Audit Warehouse',
        nameAr: 'Audit Warehouse AR',
        isDefault: true,
      },
    });
    const warehouse = unwrapData(warehouseResponse.data);
    warehouseId = warehouse?.id;
  }

  // 6. Receive stock (creates FIFO batch)
  if (warehouseId) {
    log('6. Receiving stock...');
    await request(api, 'POST', '/inventory/receive', {
      data: {
        productId,
        warehouseId,
        quantity: 50,
        costPerUnit: 12.5,
        batchNumber: `BATCH-${stamp}`,
      },
    });
  } else {
    log('Skipping stock receipt: No warehouseId resolved');
  }

  // 7. Create order
  log('7. Creating order...');
  const orderResponse = await request(api, 'POST', '/orders', {
    data: {
      type: 'DINE_IN',
      sessionId,
      items: [
        {
          productId,
          name: `Audit Item ${stamp}`,
          nameAr: `Audit Item AR ${stamp}`,
          price: 25.0,
          quantity: 2,
          notes: 'Audit flow item',
        },
      ],
    },
  });
  const order = unwrapData(orderResponse.data);
  const orderId = order?.id;

  if (!orderId) {
    log('Order creation failed', orderResponse.data);
    process.exit(1);
  }

  // 8. Confirm order (kitchen)
  log('8. Confirming order...');
  await request(api, 'PUT', `/orders/${orderId}/confirm`);

  // 9. Process payment
  log('9. Processing payment...');
  const rawTotal = order?.grandTotal ?? order?.total ?? order?.calculations?.grandTotal;
  const fallbackTotal = 25.0 * 2;
  const amount = Number(rawTotal ?? fallbackTotal);

  await request(api, 'POST', '/payments', {
    data: {
      orderId,
      sessionId,
      method: 'CASH',
      amount,
      receivedAmount: amount,
      createdBy: userId,
    },
  });

  // 10. Mark order paid (for daily sales aggregation)
  log('10. Marking order PAID...');
  await request(api, 'PUT', `/orders/${orderId}/status`, {
    data: { status: 'PAID' },
  });

  // 11. Reports
  const reportDate = new Date().toISOString().slice(0, 10);
  log('11. Fetching reports...');
  await request(api, 'GET', '/reports/daily-sales', { params: { date: reportDate } });
  await request(api, 'GET', `/reports/z-report/${sessionId}`);
  await request(api, 'GET', '/reports/inventory-valuation');

  log('FULL FLOW COMPLETED');
}

main().catch((error) => {
  log('FULL FLOW FAILED', error?.response?.data || error?.message || error);
  process.exit(1);
});
