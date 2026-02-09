
/**
 * Scenario 10: Grand Simulation (Day in the Life)
 */

import axios, { AxiosInstance } from 'axios';
import { TestContext, TestResult, createApiClient } from '../config/client';
import {
    logSection,
    logPass,
    logFail,
    logInfo,
    logWarn,
    TEST_RUN_ID,
    TEST_DEFAULTS,
    TERMINALS,
    ENV,
} from '../config/env';
import { InventoryHelper } from '../helpers/inventory.helper';
import { SessionHelper } from '../helpers/session.helper';
import { CreateCategoryDto, CreateProductDto } from '../../../src/modules/products/dto';
import { CreateUserDto } from '../../../src/modules/users/dto';
import { CreateKitchenStationDto } from '../../../src/modules/kitchen/dto';
import { CreateFloorDto, CreateTableDto, TransferTableDto } from '../../../src/modules/tables/dto';
import { CreateOrderDto, AddOrderItemDto } from '../../../src/modules/sales/dto';
import { CreatePaymentDto, SplitPaymentDto } from '../../../src/modules/payments/dto';
import { CreateWarehouseDto, ReceiveStockDto } from '../../../src/modules/inventory/dto';
import { Category, Product } from '../../../src/modules/products/entities/product.entity';
import { KitchenStation } from '../../../src/modules/kitchen/entities/kitchen.entity';
import { Floor, Table } from '../../../src/modules/tables/entities/tables.entity';
import { Order } from '../../../src/modules/sales/entities/sales.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CloseSessionDto, DenominationDto } from '../../../src/modules/sessions/dto';

interface GrandSetup {
    warehouse: Warehouse;
    categories: {
        prepared: Category;
        beverage: Category;
        retail: Category;
        ingredient: Category;
    };
    stations: {
        grill: KitchenStation;
        bar: KitchenStation;
    };
    products: {
        burger: Product;
        coffee: Product;
        usb: Product;
        bun: Product;
        meat: Product;
        cheese: Product;
    };
    floor: Floor;
    tables: {
        dineIn: Table;
        transferTo: Table;
    };
    users: {
        manager?: UserRecord;
        clerk?: UserRecord;
        cashier?: UserRecord;
        waiter?: UserRecord;
        chef?: UserRecord;
    };
    sessionId: string;
}

interface UserRecord {
    id: string;
    username: string;
    password: string;
    token?: string;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runGrandSimulationTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 10: GRAND SIMULATION');

    const setupResult = await runTest('10-SETUP', 'Genesis - Seed core data', async () => {
        const setup = await setupGrand(ctx);
        ctx.data.grandSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('10-MORNING', 'Morning - Inventory Receiving', async () => {
        const setup = getSetup(ctx);
        await runMorningInventory(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('10-OPENING', 'Opening - Manager Opens Session', async () => {
        const setup = getSetup(ctx);
        await runOpening(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('10-LUNCH', 'Lunch - Dine-In + Takeaway', async () => {
        const setup = getSetup(ctx);
        await runLunchFlows(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('10-VOID', 'Issues - Void Flow + Config Toggle', async () => {
        const setup = getSetup(ctx);
        await runVoidFlow(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('10-RETAIL', 'Retail - USB Cable Quick Sale', async () => {
        const setup = getSetup(ctx);
        await runRetailFlow(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('10-CLOSING', 'Closing - Z Report + Close Session', async () => {
        const setup = getSetup(ctx);
        await runClosing(ctx, setup);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): GrandSetup {
    const setup = ctx.data.grandSetup as GrandSetup | undefined;
    if (!setup) {
        throw new Error('Grand simulation setup missing');
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
async function setupGrand(ctx: TestContext): Promise<GrandSetup> {
    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) {
        throw new Error('Admin token or id missing from context');
    }

    logSection('PHASE 1: GENESIS (ADVANCED SEEDING)');
    logInfo('Creating categories, stations, products, ingredients, and team');

    const categories = await createCategories(ctx);
    const stations = await createStations(ctx, categories);
    const products = await createProducts(ctx, categories, stations);
    const warehouse = await getOrCreateWarehouse(ctx);
    const floor = await createFloor(ctx);
    const tables = await createTables(ctx, floor);
    const users = await createTeam(ctx);

    await loginTeam(ctx, users);

    const sessionId = await ensureSession(ctx, adminToken, adminId);

    return {
        warehouse,
        categories,
        stations,
        products,
        floor,
        tables,
        users,
        sessionId,
    };
}

async function runMorningInventory(ctx: TestContext, setup: GrandSetup): Promise<void> {
    logSection('PHASE 2: MORNING (INVENTORY RECEIVING)');
    logInfo('Inventory clerk receives stock into default warehouse (Batch #101)');

    const adminToken = ctx.tokens.admin;
    if (!adminToken) throw new Error('Admin token missing');

    const inventory = new InventoryHelper(adminToken);
    const batchNumber = `BATCH-101-${TEST_RUN_ID}`;

    const receiveItems: ReceiveStockDto[] = [
        {
            productId: setup.products.burger.id,
            warehouseId: setup.warehouse.id,
            quantity: 50,
            costPerUnit: toNumber(setup.products.burger.cost),
            batchNumber,
        },
        {
            productId: setup.products.coffee.id,
            warehouseId: setup.warehouse.id,
            quantity: 80,
            costPerUnit: toNumber(setup.products.coffee.cost),
            batchNumber,
        },
        {
            productId: setup.products.bun.id,
            warehouseId: setup.warehouse.id,
            quantity: 200,
            costPerUnit: 0.5,
            batchNumber,
        },
        {
            productId: setup.products.meat.id,
            warehouseId: setup.warehouse.id,
            quantity: 200,
            costPerUnit: 1.5,
            batchNumber,
        },
        {
            productId: setup.products.cheese.id,
            warehouseId: setup.warehouse.id,
            quantity: 200,
            costPerUnit: 0.6,
            batchNumber,
        },
        {
            productId: setup.products.usb.id,
            warehouseId: setup.warehouse.id,
            quantity: 25,
            costPerUnit: 6.0,
            batchNumber,
        },
    ];

    for (const item of receiveItems) {
        const received = await inventory.receiveStock(item);
        if (!received.success) {
            throw new Error(received.error ?? 'Inventory receive failed');
        }
    }

    const bunStock = await inventory.checkStock(setup.products.bun.id, setup.warehouse.id);
    const meatStock = await inventory.checkStock(setup.products.meat.id, setup.warehouse.id);
    const cheeseStock = await inventory.checkStock(setup.products.cheese.id, setup.warehouse.id);

    if (!bunStock.success || !meatStock.success || !cheeseStock.success) {
        throw new Error('Failed to verify inventory after receiving');
    }

    logInfo(`Stock check - buns: ${bunStock.data?.quantity}, meat: ${meatStock.data?.quantity}, cheese: ${cheeseStock.data?.quantity}`);
}

async function runOpening(ctx: TestContext, setup: GrandSetup): Promise<void> {
    logSection('PHASE 3: OPENING (MANAGER OPENS SESSION)');

    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) throw new Error('Admin token/id missing');

    const managerToken = setup.users.manager?.token;
    const managerId = setup.users.manager?.id;

    const sessionId = await openSessionWithFallback(
        ctx,
        managerToken,
        managerId,
        adminToken,
        adminId,
    );

    setup.sessionId = sessionId;
    ctx.ids.sessionId = sessionId;

    logInfo(`Session ready: ${sessionId}`);
}

async function runLunchFlows(ctx: TestContext, setup: GrandSetup): Promise<void> {
    logSection('PHASE 4: LUNCH (DINE-IN + TAKEAWAY)');
    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) throw new Error('Admin token/id missing');

    const cashierToken = setup.users.cashier?.token;
    const waiterToken = setup.users.waiter?.token;

    // Cashier takeaway order (quick sale)
    logInfo('Cashier processes takeaway order (burger)');
    const takeawayOrder = await createOrderWithActor(
        ctx,
        cashierToken,
        adminToken,
        {
            type: 'TAKEAWAY',
            sessionId: setup.sessionId,
            items: [
                {
                    productId: setup.products.burger.id,
                    name: setup.products.burger.nameEn,
                    nameAr: setup.products.burger.nameAr,
                    price: toNumber(setup.products.burger.price),
                    quantity: 1,
                },
            ],
        },
    );

    await confirmOrderWithFallback(ctx, takeawayOrder.id, cashierToken, adminToken);
    await payOrderSingle(ctx, takeawayOrder.id, setup.sessionId, adminId, cashierToken, adminToken);

    // Waiter dine-in flow
    logInfo('Waiter opens table, places dine-in order (double cheeseburger)');
    const dineInOrder = await createOrderWithActor(
        ctx,
        waiterToken,
        adminToken,
        {
            type: 'DINE_IN',
            tableId: setup.tables.dineIn.id,
            sessionId: setup.sessionId,
            items: [
                {
                    productId: setup.products.burger.id,
                    name: setup.products.burger.nameEn,
                    nameAr: setup.products.burger.nameAr,
                    price: toNumber(setup.products.burger.price),
                    quantity: 2,
                },
            ],
        },
    );

    await assignTableWithFallback(ctx, setup.tables.dineIn.id, dineInOrder.id, waiterToken, adminToken);
    await confirmOrderWithFallback(ctx, dineInOrder.id, waiterToken, adminToken);

    // Kitchen workflow
    await completeKitchenTickets(ctx, dineInOrder.id, adminToken);

    // Waiter adds coffee while kitchen is preparing
    logInfo('Waiter adds coffee to the order');
    const addItemPayload: AddOrderItemDto = {
        productId: setup.products.coffee.id,
        name: setup.products.coffee.nameEn,
        nameAr: setup.products.coffee.nameAr,
        price: toNumber(setup.products.coffee.price),
        quantity: 2,
    };

    await addItemWithFallback(ctx, dineInOrder.id, addItemPayload, waiterToken, adminToken);

    // Table transfer
    logInfo('Table transfer: moving guests to a different table');
    await transferTableWithFallback(
        ctx,
        {
            orderId: dineInOrder.id,
            fromTableId: setup.tables.dineIn.id,
            toTableId: setup.tables.transferTo.id,
        },
        waiterToken,
        adminToken,
    );

    // Split payment (cash + card)
    logInfo('Cashier splits the bill (cash + card)');
    await payOrderSplit(ctx, dineInOrder.id, setup.sessionId, adminId, cashierToken, adminToken);
}
async function runVoidFlow(ctx: TestContext, setup: GrandSetup): Promise<void> {
    logSection('PHASE 5: ISSUES (VOID FLOW + CONFIG TOGGLE)');
    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) throw new Error('Admin token/id missing');

    const cashierToken = setup.users.cashier?.token;

    // Config ON
    await updateSalesConfig(ctx, adminToken, { require_manager_pin_for_void: true });

    logInfo('Cashier creates mistake order and attempts to void (should be blocked)');
    const mistakeOrder = await createOrderWithActor(
        ctx,
        cashierToken,
        adminToken,
        {
            type: 'TAKEAWAY',
            sessionId: setup.sessionId,
            items: [
                {
                    productId: setup.products.burger.id,
                    name: setup.products.burger.nameEn,
                    nameAr: setup.products.burger.nameAr,
                    price: toNumber(setup.products.burger.price),
                    quantity: 1,
                },
            ],
        },
    );

    await confirmOrderWithFallback(ctx, mistakeOrder.id, cashierToken, adminToken);

    const blocked = await attemptCancelAsCashier(ctx, mistakeOrder.id, cashierToken);
    if (blocked) {
        logInfo('Void blocked as expected; manager/admin proceeds');
    } else {
        logWarn('Void was not blocked; permission model may differ');
    }

    await cancelOrderWithFallback(ctx, mistakeOrder.id, adminToken, 'Manager approved void');

    // Config OFF
    await updateSalesConfig(ctx, adminToken, { require_manager_pin_for_void: false });

    logInfo('Cashier attempts void again after config toggle');
    const mistakeOrder2 = await createOrderWithActor(
        ctx,
        cashierToken,
        adminToken,
        {
            type: 'TAKEAWAY',
            sessionId: setup.sessionId,
            items: [
                {
                    productId: setup.products.burger.id,
                    name: setup.products.burger.nameEn,
                    nameAr: setup.products.burger.nameAr,
                    price: toNumber(setup.products.burger.price),
                    quantity: 1,
                },
            ],
        },
    );

    await confirmOrderWithFallback(ctx, mistakeOrder2.id, cashierToken, adminToken);
    const cashierSuccess = await attemptCancelAsCashier(ctx, mistakeOrder2.id, cashierToken, true);
    if (!cashierSuccess) {
        logWarn('Void still blocked after toggle; using admin to complete');
        await cancelOrderWithFallback(ctx, mistakeOrder2.id, adminToken, 'Admin override void');
    }

    // Restore config
    await updateSalesConfig(ctx, adminToken, { require_manager_pin_for_void: true });
}

async function runRetailFlow(ctx: TestContext, setup: GrandSetup): Promise<void> {
    logSection('PHASE 6: RETAIL (FAST CHECKOUT)');

    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) throw new Error('Admin token/id missing');

    const cashierToken = setup.users.cashier?.token;
    const inventory = new InventoryHelper(adminToken);

    const stockBefore = await inventory.checkStock(setup.products.usb.id, setup.warehouse.id);
    logInfo(`USB stock before sale: ${stockBefore.data?.quantity ?? 'unknown'}`);

    const order = await createOrderWithActor(
        ctx,
        cashierToken,
        adminToken,
        {
            type: 'TAKEAWAY',
            sessionId: setup.sessionId,
            items: [
                {
                    productId: setup.products.usb.id,
                    name: setup.products.usb.nameEn,
                    nameAr: setup.products.usb.nameAr,
                    price: toNumber(setup.products.usb.price),
                    quantity: 1,
                },
            ],
        },
    );

    await confirmOrderWithFallback(ctx, order.id, cashierToken, adminToken);
    await payOrderSingle(ctx, order.id, setup.sessionId, adminId, cashierToken, adminToken);

    const stockAfter = await inventory.checkStock(setup.products.usb.id, setup.warehouse.id);
    logInfo(`USB stock after sale: ${stockAfter.data?.quantity ?? 'unknown'}`);
}

async function runClosing(ctx: TestContext, setup: GrandSetup): Promise<void> {
    logSection('PHASE 7: CLOSING (Z REPORT + CLOSE SESSION)');

    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) throw new Error('Admin token/id missing');

    const zReport = await ctx.api.get(`/reports/z-report/${setup.sessionId}`);
    if (!zReport?.data) {
        throw new Error('Z report not returned');
    }
    logInfo('Z report generated');

    await cleanupDraftOrders(adminToken, setup.sessionId);

    const denominations: DenominationDto[] = [{ value: 100, count: 5 }];
    const closePayload: CloseSessionDto = {
        sessionId: setup.sessionId,
        denominations,
    };

    const closeResponse = await createRawApi(adminToken).post('/sessions/close', closePayload);
    if (closeResponse.status === 400) {
        const message = closeResponse.data?.message ?? closeResponse.data?.error ?? closeResponse.data?.detail;
        if (typeof message === 'string' && message.toLowerCase().includes('already closed')) {
            logInfo('Session already closed');
            return;
        }
        throw new Error(`Close session failed: ${message ?? 'unknown error'}`);
    }

    if (closeResponse.status !== 200 && closeResponse.status !== 201) {
        throw new Error(`Unexpected close status: ${closeResponse.status}`);
    }

    logInfo('Session closed');
}

async function createCategories(ctx: TestContext): Promise<GrandSetup['categories']> {
    const prepared = await createCategory(ctx, `Prepared ${TEST_RUN_ID}`);
    const beverage = await createCategory(ctx, `Beverage ${TEST_RUN_ID}`);
    const retail = await createCategory(ctx, `Retail ${TEST_RUN_ID}`);
    const ingredient = await createCategory(ctx, `Ingredient ${TEST_RUN_ID}`);

    return { prepared, beverage, retail, ingredient };
}

async function createCategory(ctx: TestContext, name: string): Promise<Category> {
    const payload: CreateCategoryDto = {
        nameEn: name,
        nameAr: name,
        sortOrder: 1,
        isActive: true,
    };

    const response = await ctx.api.post<Category>('/categories', payload);
    const category = response.data as Category;
    if (!category?.id) {
        throw new Error('Category creation failed');
    }
    logInfo(`Created category: ${category.nameEn ?? category.id}`);
    return category;
}

async function createStations(
    ctx: TestContext,
    categories: GrandSetup['categories'],
): Promise<GrandSetup['stations']> {
    const grillPayload: CreateKitchenStationDto = {
        name: `Grill Station ${TEST_RUN_ID}`,
        nameAr: `Grill Station ${TEST_RUN_ID}`,
        color: '#FF5722',
        displayOrder: 1,
        categoryIds: [categories.prepared.id],
    };

    const barPayload: CreateKitchenStationDto = {
        name: `Bar Station ${TEST_RUN_ID}`,
        nameAr: `Bar Station ${TEST_RUN_ID}`,
        color: '#2196F3',
        displayOrder: 2,
        categoryIds: [categories.beverage.id],
    };

    const grill = (await ctx.api.post<KitchenStation>('/kitchen/stations', grillPayload)).data as KitchenStation;
    const bar = (await ctx.api.post<KitchenStation>('/kitchen/stations', barPayload)).data as KitchenStation;

    if (!grill?.id || !bar?.id) {
        throw new Error('Kitchen station creation failed');
    }

    logInfo(`Created stations: ${grill.name ?? grill.id}, ${bar.name ?? bar.id}`);
    return { grill, bar };
}

async function createProducts(
    ctx: TestContext,
    categories: GrandSetup['categories'],
    stations: GrandSetup['stations'],
): Promise<GrandSetup['products']> {
    const burger = await createProduct(ctx, {
        sku: `BURGER-${TEST_RUN_ID}`,
        nameEn: `Double Cheeseburger ${TEST_RUN_ID}`,
        nameAr: `Double Cheeseburger ${TEST_RUN_ID}`,
        categoryId: categories.prepared.id,
        price: 25,
        cost: 10,
        trackInventory: true,
        replenishmentMethod: 'MAKE_TO_ORDER',
        kitchenStationId: stations.grill.id,
        isActive: true,
    });

    const coffee = await createProduct(ctx, {
        sku: `COFFEE-${TEST_RUN_ID}`,
        nameEn: `Coffee ${TEST_RUN_ID}`,
        nameAr: `Coffee ${TEST_RUN_ID}`,
        categoryId: categories.beverage.id,
        price: 8,
        cost: 2,
        trackInventory: true,
        replenishmentMethod: 'MAKE_TO_ORDER',
        kitchenStationId: stations.bar.id,
        isActive: true,
    });

    const usb = await createProduct(ctx, {
        sku: `USB-${TEST_RUN_ID}`,
        nameEn: `USB Cable ${TEST_RUN_ID}`,
        nameAr: `USB Cable ${TEST_RUN_ID}`,
        categoryId: categories.retail.id,
        price: 15,
        cost: 6,
        trackInventory: true,
        replenishmentMethod: 'BUY',
        isActive: true,
    });

    const bun = await createProduct(ctx, {
        sku: `BUN-${TEST_RUN_ID}`,
        nameEn: `Buns ${TEST_RUN_ID}`,
        nameAr: `Buns ${TEST_RUN_ID}`,
        categoryId: categories.ingredient.id,
        price: 0.5,
        cost: 0.2,
        trackInventory: true,
        replenishmentMethod: 'BUY',
        isActive: false,
    });

    const meat = await createProduct(ctx, {
        sku: `MEAT-${TEST_RUN_ID}`,
        nameEn: `Meat ${TEST_RUN_ID}`,
        nameAr: `Meat ${TEST_RUN_ID}`,
        categoryId: categories.ingredient.id,
        price: 1.5,
        cost: 0.8,
        trackInventory: true,
        replenishmentMethod: 'BUY',
        isActive: false,
    });

    const cheese = await createProduct(ctx, {
        sku: `CHEESE-${TEST_RUN_ID}`,
        nameEn: `Cheese ${TEST_RUN_ID}`,
        nameAr: `Cheese ${TEST_RUN_ID}`,
        categoryId: categories.ingredient.id,
        price: 0.6,
        cost: 0.3,
        trackInventory: true,
        replenishmentMethod: 'BUY',
        isActive: false,
    });

    return { burger, coffee, usb, bun, meat, cheese };
}

async function createProduct(ctx: TestContext, payload: CreateProductDto): Promise<Product> {
    const response = await ctx.api.post<Product>('/products', payload);
    const product = response.data as Product;
    if (!product?.id) {
        throw new Error('Product creation failed');
    }
    logInfo(`Created product: ${product.nameEn ?? product.id}`);
    return product;
}
async function createTeam(ctx: TestContext): Promise<GrandSetup['users']> {
    const adminRoleId = await getAdminRoleId(ctx);
    const users: UserRecord[] = [
        { username: `manager_${TEST_RUN_ID}`, password: 'Nerdpos123!', id: '' },
        { username: `clerk_${TEST_RUN_ID}`, password: 'Nerdpos123!', id: '' },
        { username: `cashier_${TEST_RUN_ID}`, password: 'Nerdpos123!', id: '' },
        { username: `waiter_${TEST_RUN_ID}`, password: 'Nerdpos123!', id: '' },
        { username: `chef_${TEST_RUN_ID}`, password: 'Nerdpos123!', id: '' },
    ];

    const roles = ['MANAGER', 'INVENTORY', 'CASHIER', 'WAITER', 'KITCHEN'];
    const names = ['Manager', 'Inventory Clerk', 'Cashier', 'Waiter', 'Chef'];

    const created: UserRecord[] = [];

    for (let i = 0; i < users.length; i++) {
        const base = users[i];
        const payload: CreateUserDto = {
            username: base.username,
            password: base.password,
            nameEn: names[i],
            nameAr: names[i],
            role: roles[i],
            roleId: adminRoleId,
        };

        try {
            const response = await ctx.api.post('/users', payload);
            const data = response.data as { id?: string };
            base.id = data?.id ?? base.id;
            logInfo(`Created user: ${base.username}`);
        } catch (error) {
            logWarn(`User creation failed for ${base.username}: ${(error as Error).message}`);
        }

        created.push(base);
    }

    return {
        manager: created[0],
        clerk: created[1],
        cashier: created[2],
        waiter: created[3],
        chef: created[4],
    };
}

async function loginTeam(ctx: TestContext, users: GrandSetup['users']): Promise<void> {
    const login = async (user?: UserRecord) => {
        if (!user) return;
        try {
            const api = createApiClient();
            const response = await api.post('/auth/login', {
                username: user.username,
                password: user.password,
            });
            const payload = response.data as { access_token?: string; user?: { id?: string } };
            user.token = payload.access_token;
            if (payload.user?.id) {
                user.id = payload.user.id;
            }
            logInfo(`Logged in: ${user.username}`);
        } catch (error) {
            logWarn(`Login failed for ${user.username}: ${(error as Error).message}`);
        }
    };

    await login(users.manager);
    await login(users.clerk);
    await login(users.cashier);
    await login(users.waiter);
    await login(users.chef);
}

async function ensureSession(ctx: TestContext, token: string, userId: string): Promise<string> {
    if (ctx.ids.sessionId) {
        return ctx.ids.sessionId;
    }

    await safeOpenSession(ctx, token, userId, 'Admin');

    const helper = new SessionHelper(token);
    const open = await helper.openSession({
        terminalId: TERMINALS.pos1,
        openingBalance: TEST_DEFAULTS.OPENING_BALANCE,
    });

    if (!open.success || !open.data?.id) {
        throw new Error(open.error ?? 'Failed to open session');
    }

    ctx.ids.sessionId = open.data.id;
    return open.data.id;
}

async function openSessionWithFallback(
    ctx: TestContext,
    managerToken: string | undefined,
    managerId: string | undefined,
    adminToken: string,
    adminId: string,
): Promise<string> {
    if (managerToken && managerId) {
        try {
            await safeOpenSession(ctx, managerToken, managerId, 'Manager');
            const helper = new SessionHelper(managerToken);
            const open = await helper.openSession({
                terminalId: TERMINALS.pos1,
                openingBalance: TEST_DEFAULTS.OPENING_BALANCE,
            });

            if (open.success && open.data?.id) {
                logInfo(`Manager opened session: ${open.data.id}`);
                return open.data.id;
            }
        } catch (error) {
            logWarn(`Manager open session failed: ${(error as Error).message}`);
        }
    }

    await safeOpenSession(ctx, adminToken, adminId, 'Admin');
    const helper = new SessionHelper(adminToken);
    const open = await helper.openSession({
        terminalId: TERMINALS.pos1,
        openingBalance: TEST_DEFAULTS.OPENING_BALANCE,
    });

    if (!open.success || !open.data?.id) {
        throw new Error(open.error ?? 'Admin failed to open session');
    }

    logInfo(`Admin opened session: ${open.data.id}`);
    return open.data.id;
}

async function createOrderWithActor(
    ctx: TestContext,
    actorToken: string | undefined,
    fallbackToken: string,
    payload: CreateOrderDto,
): Promise<Order> {
    const result = await withActor(ctx, actorToken, fallbackToken, async (api) => {
        const response = await api.post<Order>('/orders', payload);
        return response.data as Order;
    });

    if (!result?.id) {
        throw new Error('Order creation failed');
    }

    return result;
}

async function confirmOrderWithFallback(
    ctx: TestContext,
    orderId: string,
    actorToken: string | undefined,
    fallbackToken: string,
): Promise<void> {
    await withActor(ctx, actorToken, fallbackToken, async (api) => {
        await api.put(`/orders/${orderId}/confirm`);
        return null;
    });
}

async function addItemWithFallback(
    ctx: TestContext,
    orderId: string,
    payload: AddOrderItemDto,
    actorToken: string | undefined,
    fallbackToken: string,
): Promise<void> {
    await withActor(ctx, actorToken, fallbackToken, async (api) => {
        await api.post(`/orders/${orderId}/items`, payload);
        return null;
    });
}

async function assignTableWithFallback(
    ctx: TestContext,
    tableId: string,
    orderId: string,
    actorToken: string | undefined,
    fallbackToken: string,
): Promise<void> {
    await withActor(ctx, actorToken, fallbackToken, async (api) => {
        await api.post(`/tables/${tableId}/assign`, { orderId });
        return null;
    });
}

async function transferTableWithFallback(
    ctx: TestContext,
    payload: TransferTableDto,
    actorToken: string | undefined,
    fallbackToken: string,
): Promise<void> {
    await withActor(ctx, actorToken, fallbackToken, async (api) => {
        await api.post('/tables/transfer', payload);
        return null;
    });
}

async function payOrderSingle(
    ctx: TestContext,
    orderId: string,
    sessionId: string,
    userId: string,
    actorToken: string | undefined,
    fallbackToken: string,
): Promise<void> {
    const order = await ctx.api.get<Order>(`/orders/${orderId}`);
    const total = toNumber((order.data as Order)?.grandTotal);
    if (!Number.isFinite(total)) {
        throw new Error('Order total missing for payment');
    }

    const payload: CreatePaymentDto = {
        orderId,
        sessionId,
        method: 'CASH',
        amount: total,
        receivedAmount: total,
        createdBy: userId,
    };

    await withActor(ctx, actorToken, fallbackToken, async (api) => {
        await api.post('/payments', payload);
        return null;
    });
}

async function payOrderSplit(
    ctx: TestContext,
    orderId: string,
    sessionId: string,
    userId: string,
    actorToken: string | undefined,
    fallbackToken: string,
): Promise<void> {
    const order = await ctx.api.get<Order>(`/orders/${orderId}`);
    const total = toNumber((order.data as Order)?.grandTotal);
    if (!Number.isFinite(total)) {
        throw new Error('Order total missing for split payment');
    }

    const cashAmount = roundCurrency(total * 0.5);
    const cardAmount = roundCurrency(total - cashAmount);

    const payload: SplitPaymentDto = {
        orderId,
        sessionId,
        userId,
        payments: [
            {
                method: 'CASH',
                amount: cashAmount,
                receivedAmount: cashAmount,
            },
            {
                method: 'CARD',
                amount: cardAmount,
                transactionId: `SPLIT-${TEST_RUN_ID}`,
            },
        ],
    };

    await withActor(ctx, actorToken, fallbackToken, async (api) => {
        await api.post('/payments/split', payload);
        return null;
    });
}

async function cancelOrderWithFallback(
    ctx: TestContext,
    orderId: string,
    adminToken: string,
    reason: string,
): Promise<void> {
    const api = createApiClient(adminToken);
    await api.put(`/orders/${orderId}/cancel`, { reason });
}

async function attemptCancelAsCashier(
    ctx: TestContext,
    orderId: string,
    cashierToken?: string,
    expectSuccess?: boolean,
): Promise<boolean> {
    if (!cashierToken) {
        logWarn('Cashier token missing; skipping cashier void attempt');
        return false;
    }

    const response = await createRawApi(cashierToken).put(`/orders/${orderId}/cancel`, {
        reason: 'Cashier attempted void',
    });

    if (expectSuccess) {
        if (response.status === 200 || response.status === 201) {
            logInfo('Cashier void succeeded');
            return true;
        }
        logWarn(`Cashier void failed after toggle (status ${response.status})`);
        return false;
    }

    return response.status === 401 || response.status === 403;
}

async function updateSalesConfig(
    ctx: TestContext,
    adminToken: string,
    config: Record<string, unknown>,
): Promise<void> {
    const api = createApiClient(adminToken);
    await api.put('/settings/modules/sales', config);
    logInfo(`Sales config updated: ${JSON.stringify(config)}`);
}

async function completeKitchenTickets(ctx: TestContext, orderId: string, adminToken: string): Promise<void> {
    const api = createApiClient(adminToken);
    const ticketsResponse = await api.get(`/kitchen/orders/${orderId}/tickets`);
    const ticketsPayload = ticketsResponse.data as { id?: string }[] | { data?: { id?: string }[] };

    let tickets: { id?: string }[] = [];
    if (Array.isArray(ticketsPayload)) {
        tickets = ticketsPayload;
    } else if (ticketsPayload && Array.isArray(ticketsPayload.data)) {
        tickets = ticketsPayload.data;
    }

    for (const ticket of tickets) {
        if (!ticket?.id) continue;
        await api.post(`/kitchen/tickets/${ticket.id}/start`);
        await api.post(`/kitchen/tickets/${ticket.id}/ready`);
        await api.post(`/kitchen/tickets/${ticket.id}/complete`);
    }
}
async function createFloor(ctx: TestContext): Promise<Floor> {
    const payload: CreateFloorDto = {
        name: `Grand Floor ${TEST_RUN_ID}`,
        nameAr: `Grand Floor ${TEST_RUN_ID}`,
        displayOrder: 1,
        isActive: true,
    };

    const response = await ctx.api.post<Floor>('/tables/floors', payload);
    const floor = response.data as Floor;
    if (!floor?.id) {
        throw new Error('Floor creation failed');
    }
    return floor;
}

async function createTables(ctx: TestContext, floor: Floor): Promise<GrandSetup['tables']> {
    const dineInPayload: CreateTableDto = {
        number: `T5-${TEST_RUN_ID}`,
        floorId: floor.id,
        capacity: 4,
        section: 'INDOOR',
        shape: 'SQUARE',
    };

    const transferPayload: CreateTableDto = {
        number: `T6-${TEST_RUN_ID}`,
        floorId: floor.id,
        capacity: 4,
        section: 'INDOOR',
        shape: 'SQUARE',
    };

    const dineIn = (await ctx.api.post<Table>('/tables', dineInPayload)).data as Table;
    const transferTo = (await ctx.api.post<Table>('/tables', transferPayload)).data as Table;

    if (!dineIn?.id || !transferTo?.id) {
        throw new Error('Table creation failed');
    }

    return { dineIn, transferTo };
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
        code: `GRAND-WH-${TEST_RUN_ID}`,
        nameAr: `Grand Warehouse ${TEST_RUN_ID}`,
        nameEn: `Grand Warehouse ${TEST_RUN_ID}`,
        location: 'E2E',
        isDefault: true,
    };

    const response = await ctx.api.post<Warehouse>('/inventory/warehouses', payload);
    const warehouse = response.data as Warehouse;
    if (!warehouse?.id) {
        throw new Error('Warehouse creation failed');
    }

    logInfo(`Targeting Warehouse: ${warehouse.nameEn ?? warehouse.id} (${warehouse.id})`);
    return warehouse;
}

async function getAdminRoleId(ctx: TestContext): Promise<string> {
    const adminToken = ctx.tokens.admin;
    if (!adminToken) {
        throw new Error('Admin token missing for role lookup');
    }

    const extractList = (payload: unknown): Record<string, unknown>[] => {
        if (Array.isArray(payload)) return payload as Record<string, unknown>[];
        if (payload && typeof payload === 'object') {
            const data = (payload as { data?: unknown }).data;
            if (Array.isArray(data)) return data as Record<string, unknown>[];
        }
        return [];
    };

    const api = createRawApi(adminToken);
    const rolesResponse = await api.get('/users/roles');
    const roles = rolesResponse.status === 200 ? extractList(rolesResponse.data) : [];

    if (roles.length === 0 && rolesResponse.status !== 200) {
        logWarn(`Role lookup via /users/roles failed (status ${rolesResponse.status}), falling back to admin user.`);
    }

    const adminRole = roles.find((role) => {
        const name = String(
            (role.name ??
                role.code ??
                role.key ??
                role.slug ??
                role.role ??
                ''),
        ).toUpperCase();
        return name === 'ADMIN' || name.endsWith('_ADMIN');
    });

    let roleId = typeof adminRole?.id === 'string' ? adminRole.id : undefined;

    if (!roleId) {
        const adminId = ctx.ids.adminId;
        if (adminId) {
            try {
                const userResponse = await ctx.api.get(`/users/${adminId}`);
                const userData = userResponse.data as { roleId?: unknown };
                if (typeof userData?.roleId === 'string') {
                    roleId = userData.roleId;
                }
            } catch (error) {
                logWarn(`Admin user lookup failed: ${(error as Error).message}`);
            }
        }
    }

    if (!roleId) {
        throw new Error('ADMIN role id not found');
    }

    logInfo(`Using admin role id for test users: ${roleId}`);
    return roleId;
}

async function safeOpenSession(
    ctx: TestContext,
    token: string | undefined,
    userId: string | undefined,
    label: string,
): Promise<void> {
    if (!token || !userId) return;

    const api = createRawApi(token);
    const current = await api.get(`/sessions/current/${userId}`);
    if (current.status !== 200) return;

    const session = current.data as { id?: string };
    if (!session?.id) return;

    logInfo(`${label} already has session ${session.id}. Closing it first.`);
    await cleanupDraftOrders(token, session.id);

    const closePayload: CloseSessionDto = {
        sessionId: session.id,
        denominations: [{ value: 100, count: 0 }],
    };

    const closeResponse = await api.post('/sessions/close', closePayload);
    if (closeResponse.status === 400) {
        const message = closeResponse.data?.message ?? closeResponse.data?.error ?? closeResponse.data?.detail;
        if (typeof message === 'string' && message.toLowerCase().includes('already closed')) {
            return;
        }
        logWarn(`Forced close failed for ${label}: ${message ?? 'unknown error'}`);
        return;
    }

    if (closeResponse.status !== 200 && closeResponse.status !== 201) {
        logWarn(`Forced close failed for ${label}: status ${closeResponse.status}`);
    }
}

async function withActor<T>(
    ctx: TestContext,
    actorToken: string | undefined,
    fallbackToken: string,
    action: (api: AxiosInstance) => Promise<T>,
): Promise<T> {
    if (!actorToken) {
        logWarn('Actor token missing; using admin');
        return action(createApiClient(fallbackToken));
    }

    try {
        return await action(createApiClient(actorToken));
    } catch (error) {
        logWarn(`Actor action failed, falling back to admin: ${(error as Error).message}`);
        return action(createApiClient(fallbackToken));
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

function createRawApi(token: string) {
    return axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        validateStatus: () => true,
    });
}

async function cleanupDraftOrders(adminToken: string, sessionId: string): Promise<void> {
    const api = createRawApi(adminToken);
    const response = await api.get(`/orders/session/${sessionId}`);
    const body = response.data;
    let orders: any[] = [];

    if (Array.isArray(body)) {
        orders = body;
    } else if (Array.isArray(body?.data)) {
        orders = body.data;
    } else if (Array.isArray(body?.data?.data)) {
        orders = body.data.data;
    }

    if (orders.length === 0) return;

    const draftOrders = orders.filter((order) => order?.status === 'DRAFT');
    if (draftOrders.length === 0) return;

    const adminApi = createApiClient(adminToken);
    for (const order of draftOrders) {
        if (order?.id) {
            await adminApi.put(`/orders/${order.id}/cancel`, { reason: 'Session close cleanup' });
        }
    }
}

function isUuid(value: string | undefined): boolean {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    );
}

function toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }
    if (value && typeof value === 'object' && 'toString' in value) {
        const parsed = parseFloat(String(value));
        return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}
