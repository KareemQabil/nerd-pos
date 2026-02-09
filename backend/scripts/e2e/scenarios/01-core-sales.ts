/**
 * Scenario 01: Core Sales
 */

import Decimal from 'decimal.js';
import { TestContext, TestResult } from '../config/client';
import {
    logSection,
    logPass,
    logFail,
    logInfo,
    TEST_RUN_ID,
    TEST_DEFAULTS,
    TERMINALS,
} from '../config/env';
import { InventoryHelper } from '../helpers/inventory.helper';
import { SalesHelper } from '../helpers/sales.helper';
import { SessionHelper } from '../helpers/session.helper';
import { CreateProductDto, CreateCategoryDto } from '../../../src/modules/products/dto';
import { Product, Category } from '../../../src/modules/products/entities/product.entity';
import { CreateFloorDto, CreateTableDto } from '../../../src/modules/tables/dto';
import { Floor, Table } from '../../../src/modules/tables/entities/tables.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CreateWarehouseDto } from '../../../src/modules/inventory/dto';
import { CreateOrderDto } from '../../../src/modules/sales/dto';
import { Order } from '../../../src/modules/sales/entities/sales.entity';
import { CreatePaymentDto } from '../../../src/modules/payments/dto';
import { Payment } from '../../../src/modules/payments/entities/payments.entity';

interface SetupState {
    product: Product;
    category: Category;
    table: Table;
    warehouse: Warehouse;
    sessionId: string;
    initialStock: number;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runCoreSalesTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 01: CORE SALES');

    const setupResult = await runTest('01-SETUP', 'Setup (Product, Table, Inventory, Session)', async () => {
        const state = await setupCoreSales(ctx);
        ctx.data.coreSalesSetup = state;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-001', 'Quick Sale - Cash Payment', async () => {
        const state = getSetupState(ctx);
        await runQuickSale(ctx, state);
        return { passed: true };
    }));

    results.push(await runTest('TEST-006', 'Dine-In Order - Save & Pay Later', async () => {
        const state = getSetupState(ctx);
        await runDineInOrder(ctx, state);
        return { passed: true };
    }));

    return results;
}

function getSetupState(ctx: TestContext): SetupState {
    const state = ctx.data.coreSalesSetup as SetupState | undefined;
    if (!state) {
        throw new Error('Core sales setup state missing');
    }
    return state;
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

async function setupCoreSales(ctx: TestContext): Promise<SetupState> {
    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;

    if (!adminToken) {
        throw new Error('Admin token missing from context');
    }
    if (!adminId) {
        throw new Error('Admin user id missing from context');
    }

    const inventoryHelper = new InventoryHelper(adminToken);
    const sessionHelper = new SessionHelper(adminToken);

    const category = await getOrCreateCategory(ctx);
    const product = await getOrCreateProduct(ctx, category.id);
    const warehouse = await getOrCreateWarehouse(ctx);
    const table = await getOrCreateTable(ctx);
    const sessionId = await ensureSession(ctx, sessionHelper);
    const initialStock = await ensureStock(inventoryHelper, product.id, warehouse.id);

    ctx.ids.categoryId = category.id;
    ctx.ids.productId = product.id;
    ctx.ids.tableId = table.id;
    ctx.ids.warehouseId = warehouse.id;
    ctx.ids.sessionId = sessionId;
    ctx.data.product = product;
    ctx.data.category = category;
    ctx.data.table = table;
    ctx.data.warehouse = warehouse;

    return {
        product,
        category,
        table,
        warehouse,
        sessionId,
        initialStock,
    };
}

async function getOrCreateCategory(ctx: TestContext): Promise<Category> {
    const categories = await fetchArray<Category>(ctx, '/categories');
    if (categories.length > 0) {
        logInfo(`Using existing category: ${categories[0].nameEn ?? categories[0].id}`);
        return categories[0];
    }

    const payload: CreateCategoryDto = {
        nameEn: `E2E Category ${TEST_RUN_ID}`,
        nameAr: `E2E Category ${TEST_RUN_ID}`,
        sortOrder: 1,
        isActive: true,
    };

    const response = await ctx.api.post<Category>('/categories', payload);
    const category = response.data as Category;

    if (!category?.id) {
        throw new Error('Category creation did not return an id');
    }

    logInfo(`Created category: ${category.nameEn ?? category.id}`);
    return category;
}

async function getOrCreateProduct(ctx: TestContext, categoryId: string): Promise<Product> {
    const searchResults = await fetchArray<Product>(ctx, '/products/search?q=Coffee');
    const searchCandidate = searchResults.find((p) => p.trackInventory === true && p.isActive !== false);
    if (searchCandidate) {
        logInfo(`Using existing product: ${searchCandidate.nameEn ?? searchCandidate.id}`);
        return searchCandidate;
    }

    const products = await fetchArray<Product>(ctx, '/products');
    const candidate = products.find((p) => p.trackInventory === true && p.isActive !== false);
    if (candidate) {
        logInfo(`Using existing product: ${candidate.nameEn ?? candidate.id}`);
        return candidate;
    }

    const payload: CreateProductDto = {
        sku: `E2E-${TEST_RUN_ID}`,
        nameAr: `E2E Product ${TEST_RUN_ID}`,
        nameEn: `E2E Product ${TEST_RUN_ID}`,
        categoryId,
        price: 15.0,
        cost: 10.0,
        taxCategory: 'STANDARD',
        trackInventory: true,
        isActive: true,
    };

    const response = await ctx.api.post<Product>('/products', payload);
    const product = response.data as Product;

    if (!product?.id) {
        throw new Error('Product creation did not return an id');
    }

    logInfo(`Created product: ${product.nameEn ?? product.id}`);
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
        code: `E2E-WH-${TEST_RUN_ID}`,
        nameAr: `E2E Warehouse ${TEST_RUN_ID}`,
        nameEn: `E2E Warehouse ${TEST_RUN_ID}`,
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

async function getOrCreateTable(ctx: TestContext): Promise<Table> {
    const available = await fetchArray<Table>(ctx, '/tables/available');
    if (available.length > 0) {
        logInfo(`Using available table: ${available[0].number ?? available[0].id}`);
        return available[0];
    }

    const floors = await fetchArray<Floor>(ctx, '/tables/floors');
    const floor = floors.length > 0 ? floors[0] : await createFloor(ctx);
    const tablePayload: CreateTableDto = {
        number: `E2E-${TEST_RUN_ID}`,
        floorId: floor.id,
        capacity: 4,
        section: 'INDOOR',
        shape: 'SQUARE',
    };

    const response = await ctx.api.post<Table>('/tables', tablePayload);
    const table = response.data as Table;

    if (!table?.id) {
        throw new Error('Table creation did not return an id');
    }

    logInfo(`Created table: ${table.number ?? table.id}`);
    return table;
}

async function createFloor(ctx: TestContext): Promise<Floor> {
    const payload: CreateFloorDto = {
        name: `E2E Floor ${TEST_RUN_ID}`,
        nameAr: `E2E Floor ${TEST_RUN_ID}`,
        displayOrder: 1,
        isActive: true,
    };

    const response = await ctx.api.post<Floor>('/tables/floors', payload);
    const floor = response.data as Floor;

    if (!floor?.id) {
        throw new Error('Floor creation did not return an id');
    }

    logInfo(`Created floor: ${floor.name ?? floor.id}`);
    return floor;
}

async function ensureSession(ctx: TestContext, sessionHelper: SessionHelper): Promise<string> {
    const adminId = ctx.ids.adminId;
    if (!adminId) {
        throw new Error('Admin user id missing from context');
    }

    if (ctx.ids.sessionId) {
        return ctx.ids.sessionId;
    }

    try {
        const current = await ctx.api.get(`/sessions/current/${adminId}`);
        const session = current.data as { id?: string };
        if (session?.id) {
            ctx.ids.sessionId = session.id;
            logInfo(`Using existing session: ${session.id}`);
            return session.id;
        }
    } catch {
        // No current session, open a new one.
    }

    const openPayload = {
        terminalId: TERMINALS.pos1,
        openingBalance: TEST_DEFAULTS.OPENING_BALANCE,
    };

    const opened = await sessionHelper.openSession(openPayload);
    if (!opened.success || !opened.data?.id) {
        throw new Error(opened.error ?? 'Failed to open session');
    }

    ctx.ids.sessionId = opened.data.id;
    logInfo(`Opened session: ${opened.data.id}`);
    return opened.data.id;
}

async function ensureStock(
    inventoryHelper: InventoryHelper,
    productId: string,
    warehouseId: string,
): Promise<number> {
    const stockResult = await inventoryHelper.checkStock(productId, warehouseId);
    if (!stockResult.success || !stockResult.data) {
        throw new Error(stockResult.error ?? 'Failed to read stock level');
    }

    let quantity = stockResult.data.quantity;
    logInfo(`Stock reported (${quantity}); receiving stock to ensure availability...`);

    const receiveResult = await inventoryHelper.receiveStock({
        productId,
        warehouseId,
        quantity: 100,
        costPerUnit: 10,
        batchNumber: `SMOKE-TEST-${Date.now()}`,
    });

    if (!receiveResult.success) {
        throw new Error(receiveResult.error ?? 'Failed to receive stock');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const refreshed = await inventoryHelper.checkStock(productId, warehouseId);
    if (!refreshed.success || !refreshed.data) {
        throw new Error(refreshed.error ?? 'Failed to refresh stock level');
    }
    quantity = refreshed.data.quantity;

    logInfo(`Current stock: ${quantity}`);
    return quantity;
}

async function runQuickSale(ctx: TestContext, state: SetupState): Promise<void> {
    const adminId = ctx.ids.adminId;
    if (!adminId) {
        throw new Error('Admin user id missing from context');
    }

    const salesHelper = new SalesHelper(ctx.tokens.admin);
    const inventoryHelper = new InventoryHelper(ctx.tokens.admin);

    const orderPayload: CreateOrderDto = {
        type: 'DINE_IN',
        sessionId: state.sessionId,
        items: [
            {
                productId: state.product.id,
                name: state.product.nameEn,
                nameAr: state.product.nameAr,
                price: new Decimal(state.product.price).toNumber(),
                quantity: 2,
            },
        ],
    };

    const orderResult = await salesHelper.createOrder(orderPayload);
    if (!orderResult.success || !orderResult.data?.id) {
        throw new Error(orderResult.error ?? 'Failed to create order');
    }

    const orderId = orderResult.data.id;

    const confirmResult = await salesHelper.confirmOrder(orderId);
    if (!confirmResult.success) {
        logInfo(`Confirm skipped or failed: ${confirmResult.error ?? 'unknown'}`);
    }

    const orderDetailsResponse = await ctx.api.get<Order>(`/orders/${orderId}`);
    const orderDetails = orderDetailsResponse.data as Order;
    if (!orderDetails?.grandTotal) {
        throw new Error('Order total missing');
    }

    const total = new Decimal(orderDetails.grandTotal).toNumber();

    const paymentPayload: CreatePaymentDto = {
        orderId,
        sessionId: state.sessionId,
        method: 'CASH',
        amount: total,
        receivedAmount: total,
        createdBy: adminId,
    };

    await ctx.api.post('/payments', paymentPayload);

    const payments = await fetchArray<Payment>(ctx, `/payments/order/${orderId}`);
    if (payments.length === 0) {
        throw new Error('Payment not recorded for order');
    }
    if (payments[0].status !== 'COMPLETED') {
        throw new Error(`Payment not completed (status: ${payments[0].status})`);
    }

    const finalOrderResponse = await ctx.api.get<Order>(`/orders/${orderId}`);
    const finalOrder = finalOrderResponse.data as Order;
    const allowedStatuses = new Set(['CONFIRMED', 'PREPARING', 'READY', 'PAID', 'COMPLETED']);
    if (!allowedStatuses.has(finalOrder.status)) {
        throw new Error(`Unexpected order status after payment (status: ${finalOrder.status})`);
    }
    logInfo(`Order status after payment: ${finalOrder.status}, paymentStatus: ${finalOrder.paymentStatus ?? 'n/a'}`);

    const afterStock = await inventoryHelper.checkStock(state.product.id, state.warehouse.id);
    if (!afterStock.success || !afterStock.data) {
        throw new Error(afterStock.error ?? 'Failed to read stock after sale');
    }

    const expectedMax = state.initialStock - 2;
    if (afterStock.data.quantity > expectedMax) {
        throw new Error('Stock did not decrease after sale');
    }
}

async function runDineInOrder(ctx: TestContext, state: SetupState): Promise<void> {
    const adminId = ctx.ids.adminId;
    if (!adminId) {
        throw new Error('Admin user id missing from context');
    }

    const salesHelper = new SalesHelper(ctx.tokens.admin);

    const orderPayload: CreateOrderDto = {
        type: 'DINE_IN',
        tableId: state.table.id,
        sessionId: state.sessionId,
        items: [
            {
                productId: state.product.id,
                name: state.product.nameEn,
                nameAr: state.product.nameAr,
                price: new Decimal(state.product.price).toNumber(),
                quantity: 1,
            },
        ],
    };

    const orderResult = await salesHelper.createOrder(orderPayload);
    if (!orderResult.success || !orderResult.data?.id) {
        throw new Error(orderResult.error ?? 'Failed to create dine-in order');
    }

    const orderId = orderResult.data.id;
    const confirmResult = await salesHelper.confirmOrder(orderId);
    if (!confirmResult.success || !confirmResult.data) {
        throw new Error(confirmResult.error ?? 'Failed to confirm order');
    }

    if (confirmResult.data.status !== 'CONFIRMED') {
        throw new Error(`Order not confirmed (status: ${confirmResult.data.status})`);
    }

    const orderDetailsResponse = await ctx.api.get<Order>(`/orders/${orderId}`);
    const orderDetails = orderDetailsResponse.data as Order;
    if (!orderDetails?.grandTotal) {
        throw new Error('Order total missing');
    }

    const payments = await fetchArray<Payment>(ctx, `/payments/order/${orderId}`);
    if (payments.length > 0) {
        throw new Error('Unexpected payment recorded for pay-later order');
    }

    const finalOrderResponse = await ctx.api.get<Order>(`/orders/${orderId}`);
    const finalOrder = finalOrderResponse.data as Order;
    const allowedStatuses = new Set(['CONFIRMED', 'PREPARING', 'READY']);
    if (!allowedStatuses.has(finalOrder.status)) {
        throw new Error(`Unexpected order status for pay-later flow (status: ${finalOrder.status})`);
    }
    logInfo(`Order status for pay-later flow: ${finalOrder.status}`);

    await ctx.api.post(`/tables/${state.table.id}/release`);
    await ctx.api.post(`/tables/${state.table.id}/clean`);

    const availableTables = await fetchArray<Table>(ctx, '/tables/available');
    const found = availableTables.some((table) => table.id === state.table.id);
    if (!found) {
        throw new Error('Released table is not available');
    }
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
