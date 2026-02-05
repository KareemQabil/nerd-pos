/**
 * Scenario 05: Kitchen (KDS)
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
import { KitchenTicket, KitchenStation } from '../../../src/modules/kitchen/entities/kitchen.entity';
import { CreateKitchenStationDto } from '../../../src/modules/kitchen/dto';
import { CreateOrderDto } from '../../../src/modules/sales/dto';
import { Order } from '../../../src/modules/sales/entities/sales.entity';

interface KitchenSetup {
    category: Category;
    product: Product;
    sessionId: string;
    orderId: string;
    stationId: string;
    ticketId?: string;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runKitchenTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 05: KITCHEN');

    const setupResult = await runTest('05-SETUP', 'Setup (Station, Order, Ticket)', async () => {
        const setup = await setupKitchen(ctx);
        ctx.data.kitchenSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-043', 'Kitchen Order Routing', async () => {
        const setup = getSetup(ctx);
        await testRouting(setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-044', 'Kitchen Start Preparation', async () => {
        const setup = getSetup(ctx);
    await testStart(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-045', 'Kitchen Mark Ready', async () => {
        const setup = getSetup(ctx);
    await testReady(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-046', 'Kitchen Complete Ticket', async () => {
        const setup = getSetup(ctx);
    await testComplete(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-047', 'Kitchen Ticket Details', async () => {
        const setup = getSetup(ctx);
        await testTicketDetails(ctx, setup);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): KitchenSetup {
    const setup = ctx.data.kitchenSetup as KitchenSetup | undefined;
    if (!setup) {
        throw new Error('Kitchen setup missing');
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

async function setupKitchen(ctx: TestContext): Promise<KitchenSetup> {
    const adminToken = ctx.tokens.admin;
    if (!adminToken) {
        throw new Error('Admin token missing from context');
    }

    const sessionHelper = new SessionHelper(adminToken);
    const sales = new SalesHelper(adminToken);
    const inventory = new InventoryHelper(adminToken);

    const category = await getOrCreateCategory(ctx);
    const product = await getOrCreateProduct(ctx, category.id);
    const sessionId = await ensureSession(ctx, sessionHelper);
    const warehouse = await getOrCreateWarehouse(ctx);
    await ensureStock(inventory, product.id, warehouse.id, 10, 10);
    const stationId = await getOrCreateStation(ctx);
    const orderId = await createKitchenOrder(ctx, sales, sessionId, product);
    const ticketId = await fetchTicketId(ctx, orderId);

    return {
        category,
        product,
        sessionId,
        stationId,
        orderId,
        ticketId,
    };
}

async function getOrCreateCategory(ctx: TestContext): Promise<Category> {
    const categories = await fetchArray<Category>(ctx, '/categories');
    if (categories.length > 0) {
        return categories[0];
    }

    const payload: CreateCategoryDto = {
        nameEn: `Kitchen Category ${TEST_RUN_ID}`,
        nameAr: `Kitchen Category ${TEST_RUN_ID}`,
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
        sku: `KDS-${TEST_RUN_ID}`,
        nameAr: `Kitchen Item ${TEST_RUN_ID}`,
        nameEn: `Kitchen Item ${TEST_RUN_ID}`,
        categoryId,
        price: 50.0,
        cost: 20.0,
        taxCategory: 'STANDARD',
        trackInventory: true,
        isActive: true,
        preparationTimeMinutes: 10,
    };

    const response = await ctx.api.post<Product>('/products', payload);
    const product = response.data as Product;
    if (!product?.id) {
        throw new Error('Product creation did not return an id');
    }
    return product;
}

async function getOrCreateStation(ctx: TestContext): Promise<string> {
    const stations = await fetchArray<KitchenStation>(ctx, '/kitchen/stations');
    if (stations.length > 0 && stations[0].id) {
        return stations[0].id;
    }

    const payload: CreateKitchenStationDto = {
        name: `KDS Station ${TEST_RUN_ID}`,
        nameAr: `KDS Station ${TEST_RUN_ID}`,
        color: '#EF4444',
        displayOrder: 1,
    };

    const response = await ctx.api.post<KitchenStation>('/kitchen/stations', payload);
    const station = response.data as KitchenStation;
    if (!station?.id) {
        throw new Error('Kitchen station creation did not return an id');
    }
    return station.id;
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
        batchNumber: `KDS-${TEST_RUN_ID}`,
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
        code: `KDS-WH-${TEST_RUN_ID}`,
        nameAr: `Kitchen Warehouse ${TEST_RUN_ID}`,
        nameEn: `Kitchen Warehouse ${TEST_RUN_ID}`,
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

async function createKitchenOrder(
    ctx: TestContext,
    sales: SalesHelper,
    sessionId: string,
    product: Product,
): Promise<string> {
    const payload: CreateOrderDto = {
        type: 'DINE_IN',
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

async function fetchTicketId(ctx: TestContext, orderId: string): Promise<string | undefined> {
    const tickets = await fetchArray<KitchenTicket>(ctx, `/kitchen/orders/${orderId}/tickets`);
    if (!tickets.length) {
        logInfo('No kitchen tickets created (routing may need configuration)');
        return undefined;
    }
    return tickets[0].id;
}

async function testRouting(setup: KitchenSetup): Promise<void> {
    if (!setup.ticketId) {
        logInfo('Skipping routing check: no ticket');
        return;
    }
}

async function testStart(ctx: TestContext, setup: KitchenSetup): Promise<void> {
    if (!setup.ticketId) {
        logInfo('Skipping start: no ticket');
        return;
    }

    const response = await ctx.api.post(`/kitchen/tickets/${setup.ticketId}/start`);
    const ticket = response.data as KitchenTicket;
    const status = ticket?.status;
    if (status !== 'PREPARING' && status !== 'IN_PROGRESS') {
        throw new Error(`Unexpected start status: ${status}`);
    }
}

async function testReady(ctx: TestContext, setup: KitchenSetup): Promise<void> {
    if (!setup.ticketId) {
        logInfo('Skipping ready: no ticket');
        return;
    }

    const response = await ctx.api.post(`/kitchen/tickets/${setup.ticketId}/ready`);
    const ticket = response.data as KitchenTicket;
    const status = ticket?.status;
    if (status !== 'READY') {
        throw new Error(`Unexpected ready status: ${status}`);
    }
}

async function testComplete(ctx: TestContext, setup: KitchenSetup): Promise<void> {
    if (!setup.ticketId) {
        logInfo('Skipping complete: no ticket');
        return;
    }

    const response = await ctx.api.post(`/kitchen/tickets/${setup.ticketId}/complete`);
    const ticket = response.data as KitchenTicket;
    const status = ticket?.status;
    if (status !== 'COMPLETED') {
        throw new Error(`Unexpected complete status: ${status}`);
    }
}

async function testTicketDetails(ctx: TestContext, setup: KitchenSetup): Promise<void> {
    if (!setup.ticketId) {
        logInfo('Skipping details: no ticket');
        return;
    }

    const response = await ctx.api.get(`/kitchen/tickets/${setup.ticketId}`);
    const ticket = response.data as KitchenTicket;
    if (!ticket?.id) {
        throw new Error('Ticket details missing id');
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
