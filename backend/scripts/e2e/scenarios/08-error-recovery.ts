/**
 * Scenario 08: Error Recovery
 */

import axios from 'axios';
import Decimal from 'decimal.js';
import { TestContext, TestResult } from '../config/client';
import { ENV, logSection, logPass, logFail, logInfo, TEST_RUN_ID, TEST_DEFAULTS, TERMINALS } from '../config/env';
import { InventoryHelper } from '../helpers/inventory.helper';
import { SalesHelper } from '../helpers/sales.helper';
import { SessionHelper } from '../helpers/session.helper';
import { CreateProductDto, CreateCategoryDto } from '../../../src/modules/products/dto';
import { Product, Category } from '../../../src/modules/products/entities/product.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CreateWarehouseDto, ReceiveStockDto } from '../../../src/modules/inventory/dto';
import { CreateOrderDto, AddOrderItemDto } from '../../../src/modules/sales/dto';
import { Order } from '../../../src/modules/sales/entities/sales.entity';
import { CreatePaymentDto } from '../../../src/modules/payments/dto';

interface ErrorSetup {
    category: Category;
    product: Product;
    warehouse: Warehouse;
    sessionId: string;
    adminId: string;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runErrorRecoveryTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 08: ERROR RECOVERY');

    const setupResult = await runTest('08-SETUP', 'Setup (Session, Product)', async () => {
        const setup = await setupErrorRecovery(ctx);
        ctx.data.errorSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-066', 'Invalid Order Payload', async () => {
        const setup = getSetup(ctx);
        await testInvalidOrder(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-067', 'Add Item to Confirmed Order (Should Fail)', async () => {
        const setup = getSetup(ctx);
        await testAddItemToConfirmed(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-068', 'Cancel Completed Order (Should Fail)', async () => {
        const setup = getSetup(ctx);
        await testCancelCompleted(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-069', 'Cancel Draft Order', async () => {
        const setup = getSetup(ctx);
        await testCancelDraft(ctx, setup);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): ErrorSetup {
    const setup = ctx.data.errorSetup as ErrorSetup | undefined;
    if (!setup) {
        throw new Error('Error recovery setup missing');
    }
    return setup;
}

async function runTest(
    id: string,
    name: string,
    fn: () => Promise<RunnerResult>,
): Promise<TestResult> {
    const start = Date.now();
    try {
        const result = await fn();
        const duration = Date.now() - start;

        if (result.passed) {
            logPass(`${id}: ${name}`);
            return { id, name, passed: true, duration };
        }

        logFail(`${id}: ${name} - ${result.error ?? 'failed'}`);
        return { id, name, passed: false, duration, error: result.error };
    } catch (error) {
        const duration = Date.now() - start;
        const message = (error as Error).message;
        logFail(`${id}: ${name} - ${message}`);
        return { id, name, passed: false, duration, error: message };
    }
}

async function setupErrorRecovery(ctx: TestContext): Promise<ErrorSetup> {
    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) {
        throw new Error('Admin token/user id missing from context');
    }

    const inventory = new InventoryHelper(adminToken);
    const sessionHelper = new SessionHelper(adminToken);

    const category = await getOrCreateCategory(ctx);
    const product = await getOrCreateProduct(ctx, category.id);
    const warehouse = await getOrCreateWarehouse(ctx);
    const sessionId = await ensureSession(ctx, sessionHelper);

    await ensureStock(inventory, product.id, warehouse.id, 20, 10);

    return {
        category,
        product,
        warehouse,
        sessionId,
        adminId,
    };
}

async function testInvalidOrder(ctx: TestContext, setup: ErrorSetup): Promise<void> {
    const api = axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.tokens.admin}`,
        },
        validateStatus: () => true,
    });

    const payload: CreateOrderDto = {
        type: 'DINE_IN',
        sessionId: setup.sessionId,
        items: [
            {
                productId: setup.product.id,
                name: setup.product.nameEn,
                nameAr: setup.product.nameAr,
                price: new Decimal(setup.product.price).toNumber(),
                quantity: 0,
            },
        ],
    };

    const response = await api.post('/orders', payload);
    if (response.status !== 400 && response.status !== 422) {
        throw new Error(`Expected 400/422, got ${response.status}`);
    }
}

async function testAddItemToConfirmed(ctx: TestContext, setup: ErrorSetup): Promise<void> {
    const sales = new SalesHelper(ctx.tokens.admin);
    const orderId = await createOrder(ctx, setup, true);

    const api = axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.tokens.admin}`,
        },
        validateStatus: () => true,
    });

    const payload: AddOrderItemDto = {
        productId: setup.product.id,
        name: setup.product.nameEn,
        nameAr: setup.product.nameAr,
        price: new Decimal(setup.product.price).toNumber(),
        quantity: 1,
    };

    const response = await api.post(`/orders/${orderId}/items`, payload);
    if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
    }
}

async function testCancelCompleted(ctx: TestContext, setup: ErrorSetup): Promise<void> {
    const orderId = await createOrder(ctx, setup, true);
    await payOrder(ctx, setup, orderId);

    const api = axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.tokens.admin}`,
        },
        validateStatus: () => true,
    });

    const response = await api.put(`/orders/${orderId}/cancel`, { reason: 'E2E test' });
    if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
    }
}

async function testCancelDraft(ctx: TestContext, setup: ErrorSetup): Promise<void> {
    const orderId = await createOrder(ctx, setup, false);
    const response = await ctx.api.put<Order>(`/orders/${orderId}/cancel`, { reason: 'E2E test' });
    const order = response.data as Order;
    if (order.status !== 'CANCELLED') {
        throw new Error(`Expected CANCELLED, got ${order.status}`);
    }
}

async function createOrder(ctx: TestContext, setup: ErrorSetup, confirm: boolean): Promise<string> {
    const sales = new SalesHelper(ctx.tokens.admin);
    const payload: CreateOrderDto = {
        type: 'DINE_IN',
        sessionId: setup.sessionId,
        items: [
            {
                productId: setup.product.id,
                name: setup.product.nameEn,
                nameAr: setup.product.nameAr,
                price: new Decimal(setup.product.price).toNumber(),
                quantity: 1,
            },
        ],
    };

    const result = await sales.createOrder(payload);
    if (!result.success || !result.data?.id) {
        throw new Error(result.error ?? 'Create order failed');
    }

    if (confirm) {
        await sales.confirmOrder(result.data.id);
    }

    return result.data.id;
}

async function payOrder(ctx: TestContext, setup: ErrorSetup, orderId: string): Promise<void> {
    const orderDetails = await ctx.api.get<Order>(`/orders/${orderId}`);
    const order = orderDetails.data as Order;
    if (!order?.grandTotal) {
        throw new Error('Order total missing');
    }

    const payload: CreatePaymentDto = {
        orderId,
        sessionId: setup.sessionId,
        method: 'CASH',
        amount: new Decimal(order.grandTotal).toNumber(),
        receivedAmount: new Decimal(order.grandTotal).toNumber(),
        createdBy: setup.adminId,
    };

    await ctx.api.post('/payments', payload);
}

async function ensureSession(ctx: TestContext, helper: SessionHelper): Promise<string> {
    if (ctx.ids.sessionId) {
        return ctx.ids.sessionId;
    }

    const open = await helper.openSession({
        terminalId: TERMINALS.pos1,
        openingBalance: TEST_DEFAULTS.OPENING_BALANCE,
    });
    if (open.success && open.data?.id) {
        ctx.ids.sessionId = open.data.id;
        return open.data.id;
    }

    const current = await ctx.api.get(`/sessions/current/${ctx.ids.adminId}`);
    const session = current.data as { id?: string };
    if (!session?.id) {
        throw new Error(open.error ?? 'No current session found');
    }

    ctx.ids.sessionId = session.id;
    return session.id;
}

async function ensureStock(
    inventory: InventoryHelper,
    productId: string,
    warehouseId: string,
    minQty: number,
    costPerUnit: number,
): Promise<void> {
    const current = await getStock(inventory, productId, warehouseId);
    if (current >= minQty) {
        return;
    }

    const payload: ReceiveStockDto = {
        productId,
        warehouseId,
        quantity: minQty - current,
        costPerUnit,
        batchNumber: `ERR-${TEST_RUN_ID}`,
    };

    const receive = await inventory.receiveStock(payload);
    if (!receive.success) {
        throw new Error(receive.error ?? 'Receive stock failed');
    }
}

async function getStock(
    inventory: InventoryHelper,
    productId: string,
    warehouseId: string,
): Promise<number> {
    const result = await inventory.checkStock(productId, warehouseId);
    if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Failed to read stock');
    }
    return result.data.quantity;
}

async function getOrCreateCategory(ctx: TestContext): Promise<Category> {
    const categories = await fetchArray<Category>(ctx, '/categories');
    if (categories.length > 0) {
        return categories[0];
    }

    const payload: CreateCategoryDto = {
        nameEn: `Error Category ${TEST_RUN_ID}`,
        nameAr: `Error Category ${TEST_RUN_ID}`,
        sortOrder: 1,
        isActive: true,
    };

    const response = await ctx.api.post<Category>('/categories', payload);
    const category = response.data as Category;
    if (!category?.id) {
        throw new Error('Category creation did not return an id');
    }
    return category;
}

async function getOrCreateProduct(ctx: TestContext, categoryId: string): Promise<Product> {
    const payload: CreateProductDto = {
        sku: `ERR-${TEST_RUN_ID}`,
        nameAr: `Error Product ${TEST_RUN_ID}`,
        nameEn: `Error Product ${TEST_RUN_ID}`,
        categoryId,
        price: 20.0,
        cost: 8.0,
        taxCategory: 'STANDARD',
        trackInventory: true,
        isActive: true,
    };

    const response = await ctx.api.post<Product>('/products', payload);
    const product = response.data as Product;
    if (!product?.id) {
        throw new Error('Product creation did not return an id');
    }
    return product;
}

async function getOrCreateWarehouse(ctx: TestContext): Promise<Warehouse> {
    let defaultWarehouse: Warehouse | undefined;
    try {
        const response = await ctx.api.get<Warehouse>('/inventory/warehouses/default');
        defaultWarehouse = response.data as Warehouse;
    } catch {
        // Default warehouse not found or endpoint unavailable.
    }

    if (defaultWarehouse?.id) {
        logInfo(`Targeting Warehouse: ${defaultWarehouse.nameEn ?? defaultWarehouse.id} (${defaultWarehouse.id})`);
        return defaultWarehouse;
    }

    const warehouses = await fetchArray<Warehouse>(ctx, '/inventory/warehouses');
    const existing = warehouses.find((wh) => isUuid(wh.id));
    if (existing) {
        logInfo(`Targeting Warehouse: ${existing.nameEn ?? existing.id} (${existing.id})`);
        return existing;
    }

    const payload: CreateWarehouseDto = {
        code: `ERR-WH-${TEST_RUN_ID}`,
        nameAr: `Error Warehouse ${TEST_RUN_ID}`,
        nameEn: `Error Warehouse ${TEST_RUN_ID}`,
        location: 'E2E',
        isDefault: true,
    };

    const response = await ctx.api.post<Warehouse>('/inventory/warehouses', payload);
    const warehouse = response.data as Warehouse;
    if (!warehouse?.id) {
        throw new Error('Warehouse creation did not return an id');
    }

    logInfo(`Targeting Warehouse: ${warehouse.nameEn ?? warehouse.id} (${warehouse.id})`);
    return warehouse;
}

async function fetchArray<T>(ctx: TestContext, path: string): Promise<T[]> {
    const response = await ctx.api.get(path);
    const payload = response.data as unknown;

    if (Array.isArray(payload)) {
        return payload as T[];
    }

    if (payload && typeof payload === 'object') {
        const maybeData = (payload as { data?: unknown }).data;
        if (Array.isArray(maybeData)) {
            return maybeData as T[];
        }
    }

    return [];
}

function isUuid(value: string | undefined): boolean {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}
