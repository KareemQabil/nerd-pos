/**
 * Scenario 06: Customers
 */

import { TestContext, TestResult } from '../config/client';
import { logSection, logPass, logFail, logInfo, TEST_RUN_ID, TEST_DEFAULTS, TERMINALS } from '../config/env';
import { CreateCustomerDto, AddAddressDto, UpdateCustomerDto } from '../../../src/modules/customers/dto';
import { InventoryHelper } from '../helpers/inventory.helper';
import { SalesHelper } from '../helpers/sales.helper';
import { SessionHelper } from '../helpers/session.helper';
import { CreateProductDto, CreateCategoryDto } from '../../../src/modules/products/dto';
import { Product, Category } from '../../../src/modules/products/entities/product.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CreateWarehouseDto, ReceiveStockDto } from '../../../src/modules/inventory/dto';
import { CreateOrderDto } from '../../../src/modules/sales/dto';

interface CustomerSetup {
    customerId: string;
    phone: string;
    orderId?: string;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runCustomersTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 06: CUSTOMERS');

    const setupResult = await runTest('06-SETUP', 'Setup (Create Customer)', async () => {
        const setup = await createCustomer(ctx);
        ctx.data.customerSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-053', 'Create Customer', async () => {
        const setup = getSetup(ctx);
        if (!setup.customerId) {
            throw new Error('Customer id missing');
        }
        return { passed: true };
    }));

    results.push(await runTest('TEST-054', 'Customer Search by Phone', async () => {
        const setup = getSetup(ctx);
        await testSearchByPhone(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-055', 'Customer Addresses', async () => {
        const setup = getSetup(ctx);
        await testAddresses(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-056', 'Get Customer Details', async () => {
        const setup = getSetup(ctx);
        await testCustomerDetails(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-057', 'Loyalty Tiers List', async () => {
        await testLoyaltyTiers(ctx);
        return { passed: true };
    }));

    results.push(await runTest('TEST-058', 'Update Customer Notes', async () => {
        const setup = getSetup(ctx);
        await testUpdateCustomer(ctx, setup);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): CustomerSetup {
    const setup = ctx.data.customerSetup as CustomerSetup | undefined;
    if (!setup) {
        throw new Error('Customer setup missing');
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

async function createCustomer(ctx: TestContext): Promise<CustomerSetup> {
    const phone = `+9665${Math.floor(10000000 + Math.random() * 90000000)}`;
    const payload: CreateCustomerDto = {
        name: `E2E Customer ${TEST_RUN_ID}`,
        nameAr: 'عميل تجريبي',
        phone,
        email: `e2e_${TEST_RUN_ID}@example.com`,
        preferredLanguage: 'en',
        notes: 'E2E test customer',
    };

    const response = await ctx.api.post('/customers', payload);
    const customer = response.data as { id?: string };
    if (!customer?.id) {
        throw new Error('Customer creation missing id');
    }

    const orderId = await createCustomerOrder(ctx, customer.id);
    logInfo(`Created customer: ${customer.id}`);
    return { customerId: customer.id, phone, orderId };
}

async function testSearchByPhone(ctx: TestContext, setup: CustomerSetup): Promise<void> {
    const response = await ctx.api.get(`/customers/phone/${encodeURIComponent(setup.phone)}`);
    const customer = response.data as { id?: string };
    if (!customer?.id) {
        throw new Error('Customer not found by phone');
    }
}

async function testAddresses(ctx: TestContext, setup: CustomerSetup): Promise<void> {
    const address: AddAddressDto = {
        customerId: setup.customerId,
        label: 'Home',
        street: 'King Fahd Road',
        city: 'Riyadh',
        district: 'Olaya',
        isDefault: true,
    };

    await ctx.api.post(`/customers/${setup.customerId}/addresses`, address);
    const addresses = await ctx.api.get(`/customers/${setup.customerId}/addresses`);
    const list = addresses.data as unknown;

    if (!Array.isArray(list)) {
        throw new Error('Addresses response is not an array');
    }
    if (list.length === 0) {
        throw new Error('Addresses list is empty');
    }
}

async function testCustomerDetails(ctx: TestContext, setup: CustomerSetup): Promise<void> {
    const response = await ctx.api.get(`/customers/${setup.customerId}`);
    const customer = response.data as { id?: string };
    if (!customer?.id) {
        throw new Error('Customer details missing id');
    }
}

async function testLoyaltyTiers(ctx: TestContext): Promise<void> {
    const response = await ctx.api.get('/customers/tiers');
    const tiers = response.data as unknown;
    if (!Array.isArray(tiers)) {
        throw new Error('Loyalty tiers response is not an array');
    }
    logInfo(`Loyalty tiers: ${tiers.length}`);
}

async function testUpdateCustomer(ctx: TestContext, setup: CustomerSetup): Promise<void> {
    const payload: UpdateCustomerDto = {
        notes: `Updated notes ${TEST_RUN_ID}`,
    };

    await ctx.api.put(`/customers/${setup.customerId}`, payload);
}

async function createCustomerOrder(ctx: TestContext, customerId: string): Promise<string | undefined> {
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

    const orderPayload: CreateOrderDto = {
        type: 'DINE_IN',
        sessionId,
        customerId,
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

    const orderResult = await sales.createOrder(orderPayload);
    if (!orderResult.success || !orderResult.data?.id) {
        throw new Error(orderResult.error ?? 'Create order failed');
    }

    await ctx.api.put(`/orders/${orderResult.data.id}/cancel`, { reason: 'Customer scenario cleanup' });
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
    const payload: ReceiveStockDto = {
        productId,
        warehouseId,
        quantity: Math.max(minQty - current, minQty),
        costPerUnit,
        batchNumber: `CUS-${TEST_RUN_ID}-${Date.now()}`,
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
        nameEn: `Customer Category ${TEST_RUN_ID}`,
        nameAr: `Customer Category ${TEST_RUN_ID}`,
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
    const products = await fetchArray<Product>(ctx, '/products');
    const existing = products.find((product) => product.trackInventory === true && product.isActive !== false);
    if (existing) {
        return existing;
    }

    const payload: CreateProductDto = {
        sku: `CUS-${TEST_RUN_ID}`,
        nameAr: `Customer Product ${TEST_RUN_ID}`,
        nameEn: `Customer Product ${TEST_RUN_ID}`,
        categoryId,
        price: 20.0,
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
        code: `CUS-WH-${TEST_RUN_ID}`,
        nameAr: `Customer Warehouse ${TEST_RUN_ID}`,
        nameEn: `Customer Warehouse ${TEST_RUN_ID}`,
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
