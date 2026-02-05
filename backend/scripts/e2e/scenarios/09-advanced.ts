/**
 * Scenario 09: Advanced / Reports
 */

import { TestContext, TestResult } from '../config/client';
import { logSection, logPass, logFail, logInfo, TEST_RUN_ID, TEST_DEFAULTS, TERMINALS } from '../config/env';
import { SalesHelper } from '../helpers/sales.helper';
import { SessionHelper } from '../helpers/session.helper';
import { InventoryHelper } from '../helpers/inventory.helper';
import { CreateProductDto, CreateCategoryDto } from '../../../src/modules/products/dto';
import { Product, Category } from '../../../src/modules/products/entities/product.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CreateWarehouseDto, ReceiveStockDto } from '../../../src/modules/inventory/dto';
import { CreateFloorDto, CreateTableDto, TransferTableDto } from '../../../src/modules/tables/dto';
import { Floor, Table } from '../../../src/modules/tables/entities/tables.entity';
import { CreateOrderDto } from '../../../src/modules/sales/dto';
import { Order } from '../../../src/modules/sales/entities/sales.entity';

interface AdvancedSetup {
    category: Category;
    product: Product;
    warehouse: Warehouse;
    sessionId: string;
    tableA: Table;
    tableB: Table;
    orderId: string;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runAdvancedTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 09: ADVANCED');

    const setupResult = await runTest('09-SETUP', 'Setup (Tables, Order, Stock)', async () => {
        const setup = await setupAdvanced(ctx);
        ctx.data.advancedSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-076', 'Table Transfer', async () => {
        const setup = getSetup(ctx);
        await testTableTransfer(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-079', 'Daily Sales Report', async () => {
        await testDailySales(ctx);
        return { passed: true };
    }));

    results.push(await runTest('TEST-080', 'Top Selling Products Report', async () => {
        await testTopSelling(ctx);
        return { passed: true };
    }));

    results.push(await runTest('TEST-081', 'Inventory Movements Report', async () => {
        const setup = getSetup(ctx);
        await testInventoryMovements(ctx, setup);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): AdvancedSetup {
    const setup = ctx.data.advancedSetup as AdvancedSetup | undefined;
    if (!setup) {
        throw new Error('Advanced setup missing');
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

async function setupAdvanced(ctx: TestContext): Promise<AdvancedSetup> {
    const adminToken = ctx.tokens.admin;
    if (!adminToken) {
        throw new Error('Admin token missing from context');
    }

    const inventory = new InventoryHelper(adminToken);
    const sessionHelper = new SessionHelper(adminToken);
    const sales = new SalesHelper(adminToken);

    const category = await getOrCreateCategory(ctx);
    const product = await getOrCreateProduct(ctx, category.id);
    const warehouse = await getOrCreateWarehouse(ctx);
    const sessionId = await ensureSession(ctx, sessionHelper);
    await ensureStock(inventory, product.id, warehouse.id, 10, 10);

    const tables = await getOrCreateTables(ctx);
    const orderId = await createOrderWithTable(ctx, sales, sessionId, product, tables.tableA.id);

    return {
        category,
        product,
        warehouse,
        sessionId,
        tableA: tables.tableA,
        tableB: tables.tableB,
        orderId,
    };
}

async function testTableTransfer(ctx: TestContext, setup: AdvancedSetup): Promise<void> {
    const payload: TransferTableDto = {
        orderId: setup.orderId,
        fromTableId: setup.tableA.id,
        toTableId: setup.tableB.id,
    };

    await ctx.api.post('/tables/transfer', payload);
    const order = await ctx.api.get<Order>(`/orders/${setup.orderId}`);
    const updated = order.data as Order;
    if (updated.tableId !== setup.tableB.id) {
        throw new Error('Order tableId not updated after transfer');
    }
}

async function testDailySales(ctx: TestContext): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const response = await ctx.api.get(`/reports/daily-sales?date=${date}`);
    const report = response.data as { date?: string };
    if (!report) {
        throw new Error('Daily sales report missing');
    }
}

async function testTopSelling(ctx: TestContext): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const response = await ctx.api.get(`/reports/top-selling?startDate=${date}&endDate=${date}&limit=10`);
    const list = response.data as unknown;
    if (!Array.isArray(list)) {
        throw new Error('Top selling response is not an array');
    }
    logInfo(`Top selling items: ${list.length}`);
}

async function testInventoryMovements(ctx: TestContext, setup: AdvancedSetup): Promise<void> {
    const response = await ctx.api.get(`/inventory/movements/${setup.product.id}?warehouseId=${setup.warehouse.id}`);
    const list = response.data as unknown;
    if (!Array.isArray(list)) {
        throw new Error('Inventory movements response is not an array');
    }
}

async function createOrderWithTable(
    ctx: TestContext,
    sales: SalesHelper,
    sessionId: string,
    product: Product,
    tableId: string,
): Promise<string> {
    const payload: CreateOrderDto = {
        type: 'DINE_IN',
        tableId,
        sessionId,
        items: [
            {
                productId: product.id,
                name: product.nameEn,
                nameAr: product.nameAr,
                price: product.price,
                quantity: 1,
            },
        ],
    };

    const orderResult = await sales.createOrder(payload);
    if (!orderResult.success || !orderResult.data?.id) {
        throw new Error(orderResult.error ?? 'Create order failed');
    }
    await sales.confirmOrder(orderResult.data.id);
    return orderResult.data.id;
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
        batchNumber: `ADV-${TEST_RUN_ID}`,
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
        nameEn: `Advanced Category ${TEST_RUN_ID}`,
        nameAr: `Advanced Category ${TEST_RUN_ID}`,
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
        sku: `ADV-${TEST_RUN_ID}`,
        nameAr: `Advanced Product ${TEST_RUN_ID}`,
        nameEn: `Advanced Product ${TEST_RUN_ID}`,
        categoryId,
        price: 30.0,
        cost: 12.0,
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
        code: `ADV-WH-${TEST_RUN_ID}`,
        nameAr: `Advanced Warehouse ${TEST_RUN_ID}`,
        nameEn: `Advanced Warehouse ${TEST_RUN_ID}`,
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

async function getOrCreateTables(ctx: TestContext): Promise<{ tableA: Table; tableB: Table }> {
    const available = await fetchArray<Table>(ctx, '/tables/available');
    if (available.length >= 2) {
        return { tableA: available[0], tableB: available[1] };
    }

    const floors = await fetchArray<Floor>(ctx, '/tables/floors');
    const floor = floors.length > 0 ? floors[0] : await createFloor(ctx);

    const tableA = await createTable(ctx, floor.id, `ADV-A-${TEST_RUN_ID}`);
    const tableB = await createTable(ctx, floor.id, `ADV-B-${TEST_RUN_ID}`);
    return { tableA, tableB };
}

async function createFloor(ctx: TestContext): Promise<Floor> {
    const payload: CreateFloorDto = {
        name: `Advanced Floor ${TEST_RUN_ID}`,
        nameAr: `Advanced Floor ${TEST_RUN_ID}`,
        displayOrder: 1,
        isActive: true,
    };

    const response = await ctx.api.post<Floor>('/tables/floors', payload);
    const floor = response.data as Floor;
    if (!floor?.id) {
        throw new Error('Floor creation did not return an id');
    }
    return floor;
}

async function createTable(ctx: TestContext, floorId: string, number: string): Promise<Table> {
    const payload: CreateTableDto = {
        number,
        floorId,
        capacity: 4,
        section: 'INDOOR',
        shape: 'SQUARE',
    };

    const response = await ctx.api.post<Table>('/tables', payload);
    const table = response.data as Table;
    if (!table?.id) {
        throw new Error('Table creation did not return an id');
    }
    return table;
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
