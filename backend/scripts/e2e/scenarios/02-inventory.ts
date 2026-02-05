/**
 * Scenario 02: Inventory Management
 */

import axios from 'axios';
import Decimal from 'decimal.js';
import { TestContext, TestResult } from '../config/client';
import {
    ENV,
    logSection,
    logPass,
    logFail,
    logInfo,
    TEST_RUN_ID,
} from '../config/env';
import { AuthHelper } from '../helpers/auth.helper';
import { InventoryHelper } from '../helpers/inventory.helper';
import { CreateProductDto, CreateCategoryDto } from '../../../src/modules/products/dto';
import { Product, Category } from '../../../src/modules/products/entities/product.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CreateWarehouseDto } from '../../../src/modules/inventory/dto';
import { AdjustStockDto, TransferStockDto, ReceiveStockDto } from '../../../src/modules/inventory/dto';

interface InventorySetup {
    category: Category;
    productA: Product;
    productB: Product;
    warehousePrimary: Warehouse;
    warehouseSecondary: Warehouse;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runInventoryTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 02: INVENTORY');

    const setupResult = await runTest('02-SETUP', 'Setup (Products, Warehouses)', async () => {
        const setup = await setupInventory(ctx);
        ctx.data.inventorySetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-016', 'Receive Stock (GRN)', async () => {
        const setup = getSetup(ctx);
        await testReceiveStock(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-017', 'Receive Stock - Multiple Products', async () => {
        const setup = getSetup(ctx);
        await testReceiveMultiple(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-018', 'Movement History After Batches', async () => {
        const setup = getSetup(ctx);
        await testMovementHistory(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-019', 'Stock Adjustment - Increase', async () => {
        const setup = getSetup(ctx);
        await testAdjustIncrease(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-020', 'Stock Adjustment - Decrease', async () => {
        const setup = getSetup(ctx);
        await testAdjustDecrease(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-021', 'Stock Adjustment - Manager Only', async () => {
        const setup = getSetup(ctx);
        await testAdjustRequiresManager(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-022', 'Stock Transfer Between Warehouses', async () => {
        const setup = getSetup(ctx);
        await testTransfer(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-023', 'Low Stock Alerts', async () => {
        await testLowStock(ctx);
        return { passed: true };
    }));

    results.push(await runTest('TEST-024', 'Expiring Stock Alerts', async () => {
        const setup = getSetup(ctx);
        await testExpiringStock(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-025', 'Inventory Valuation Report', async () => {
        await testInventoryValuation(ctx);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): InventorySetup {
    const setup = ctx.data.inventorySetup as InventorySetup | undefined;
    if (!setup) {
        throw new Error('Inventory setup missing');
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

async function setupInventory(ctx: TestContext): Promise<InventorySetup> {
    const adminToken = ctx.tokens.admin;
    if (!adminToken) {
        throw new Error('Admin token missing from context');
    }

    const category = await getOrCreateCategory(ctx);
    const productA = await getOrCreateProduct(ctx, category.id, 'INV-A');
    const productB = await getOrCreateProduct(ctx, category.id, 'INV-B');
    const warehouses = await getOrCreateWarehouses(ctx);

    return {
        category,
        productA,
        productB,
        warehousePrimary: warehouses.primary,
        warehouseSecondary: warehouses.secondary,
    };
}

async function getOrCreateCategory(ctx: TestContext): Promise<Category> {
    const categories = await fetchArray<Category>(ctx, '/categories');
    if (categories.length > 0) {
        logInfo(`Using category: ${categories[0].nameEn ?? categories[0].id}`);
        return categories[0];
    }

    const payload: CreateCategoryDto = {
        nameEn: `Inventory Category ${TEST_RUN_ID}`,
        nameAr: `Inventory Category ${TEST_RUN_ID}`,
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

async function getOrCreateProduct(
    ctx: TestContext,
    categoryId: string,
    suffix: string,
): Promise<Product> {
    const key = `inventoryProduct_${suffix}`;
    const storedId = ctx.data[key] as string | undefined;
    if (storedId) {
        const existing = await ctx.api.get<Product>(`/products/${storedId}`);
        return existing.data as Product;
    }

    const payload: CreateProductDto = {
        sku: `${suffix}-${TEST_RUN_ID}`,
        nameAr: `Inventory ${suffix} ${TEST_RUN_ID}`,
        nameEn: `Inventory ${suffix} ${TEST_RUN_ID}`,
        categoryId,
        price: 25.0,
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

    ctx.data[key] = product.id;
    logInfo(`Created product: ${product.nameEn ?? product.id}`);
    return product;
}

async function getOrCreateWarehouses(ctx: TestContext): Promise<{
    primary: Warehouse;
    secondary: Warehouse;
}> {
    const primary = await getOrCreateDefaultWarehouse(ctx);

    const warehouses = await fetchArray<Warehouse>(ctx, '/inventory/warehouses');
    const secondary =
        warehouses.find((wh) => wh.id && wh.id !== primary.id && isUuid(wh.id)) ??
        await createWarehouse(ctx, `E2E-WH-ALT-${TEST_RUN_ID}`, false);

    return { primary, secondary };
}

async function getOrCreateDefaultWarehouse(ctx: TestContext): Promise<Warehouse> {
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

    const created = await createWarehouse(ctx, `E2E-WH-${TEST_RUN_ID}`, true);
    logInfo(`Targeting Warehouse: ${created.nameEn ?? created.id} (${created.id})`);
    return created;
}

async function createWarehouse(ctx: TestContext, code: string, isDefault: boolean): Promise<Warehouse> {
    const payload: CreateWarehouseDto = {
        code,
        nameAr: `Warehouse ${code}`,
        nameEn: `Warehouse ${code}`,
        location: 'E2E',
        isDefault,
    };

    const response = await ctx.api.post<Warehouse>('/inventory/warehouses', payload);
    const warehouse = response.data as Warehouse;

    if (!warehouse?.id) {
        throw new Error('Warehouse creation did not return an id');
    }

    logInfo(`Created warehouse: ${warehouse.nameEn ?? warehouse.id}`);
    return warehouse;
}

async function testReceiveStock(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const inventory = new InventoryHelper(ctx.tokens.admin);
    const before = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);

    const receivePayload: ReceiveStockDto = {
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: 25,
        costPerUnit: 10,
        batchNumber: `GRN-${TEST_RUN_ID}`,
    };

    const receive = await inventory.receiveStock(receivePayload);
    if (!receive.success) {
        throw new Error(receive.error ?? 'Receive stock failed');
    }

    const after = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);
    const expected = new Decimal(before).plus(receivePayload.quantity).toNumber();
    if (after < expected) {
        throw new Error(`Stock did not increase (expected >= ${expected}, got ${after})`);
    }
}

async function testReceiveMultiple(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const inventory = new InventoryHelper(ctx.tokens.admin);
    const beforeA = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);
    const beforeB = await getStock(inventory, setup.productB.id, setup.warehousePrimary.id);

    const receiveA = await inventory.receiveStock({
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: 10,
        costPerUnit: 9,
        batchNumber: `MULTI-A-${TEST_RUN_ID}`,
    });
    if (!receiveA.success) {
        throw new Error(receiveA.error ?? 'Receive stock (A) failed');
    }
    const receiveB = await inventory.receiveStock({
        productId: setup.productB.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: 10,
        costPerUnit: 9,
        batchNumber: `MULTI-B-${TEST_RUN_ID}`,
    });
    if (!receiveB.success) {
        throw new Error(receiveB.error ?? 'Receive stock (B) failed');
    }

    const afterA = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);
    const afterB = await getStock(inventory, setup.productB.id, setup.warehousePrimary.id);

    if (afterA <= beforeA) {
        throw new Error('Product A stock did not increase');
    }
    if (afterB <= beforeB) {
        throw new Error('Product B stock did not increase');
    }
}

async function testMovementHistory(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const inventory = new InventoryHelper(ctx.tokens.admin);
    const receive1 = await inventory.receiveStock({
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: 10,
        costPerUnit: 9,
        batchNumber: `B1-${TEST_RUN_ID}`,
    });
    if (!receive1.success) {
        throw new Error(receive1.error ?? 'Receive stock batch 1 failed');
    }
    const receive2 = await inventory.receiveStock({
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: 15,
        costPerUnit: 11,
        batchNumber: `B2-${TEST_RUN_ID}`,
    });
    if (!receive2.success) {
        throw new Error(receive2.error ?? 'Receive stock batch 2 failed');
    }

    const movements = await fetchArray<unknown>(
        ctx,
        `/inventory/movements/${setup.productA.id}?warehouseId=${setup.warehousePrimary.id}`,
    );
    if (movements.length === 0) {
        throw new Error('Movement history empty');
    }
}

async function testAdjustIncrease(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const inventory = new InventoryHelper(ctx.tokens.admin);
    await ensureStock(inventory, setup.productA.id, setup.warehousePrimary.id, 10, 10);
    const before = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);

    const payload: AdjustStockDto = {
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: 5,
        reason: 'COUNT_CORRECTION',
        notes: 'E2E increase adjustment',
    };
    await ctx.api.post('/inventory/adjust', payload);

    const after = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);
    const expected = new Decimal(before).plus(payload.quantity).toNumber();
    if (after < expected) {
        throw new Error(`Stock did not increase (expected >= ${expected}, got ${after})`);
    }
}

async function testAdjustDecrease(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const inventory = new InventoryHelper(ctx.tokens.admin);
    await ensureStock(inventory, setup.productA.id, setup.warehousePrimary.id, 10, 10);
    const before = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);

    const payload: AdjustStockDto = {
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: -3,
        reason: 'DAMAGE',
        notes: 'E2E decrease adjustment',
    };
    await ctx.api.post('/inventory/adjust', payload);

    const after = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);
    const expected = new Decimal(before).minus(Math.abs(payload.quantity)).toNumber();
    if (after > expected) {
        throw new Error(`Stock did not decrease (expected <= ${expected}, got ${after})`);
    }
}

async function testAdjustRequiresManager(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const auth = new AuthHelper();
    const login = await auth.loginAsCashier();
    if (!login.success || !login.token) {
        throw new Error(login.error ?? 'Cashier login failed');
    }

    const api = axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${login.token}`,
        },
        validateStatus: () => true,
    });

    const payload: AdjustStockDto = {
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: -1,
        reason: 'DAMAGE',
        notes: 'E2E permission check',
    };

    const response = await api.post('/inventory/adjust', payload);
    if (response.status !== 401 && response.status !== 403) {
        throw new Error(`Expected 401/403, got ${response.status}`);
    }
}

async function testTransfer(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const inventory = new InventoryHelper(ctx.tokens.admin);
    await ensureStock(inventory, setup.productA.id, setup.warehousePrimary.id, 20, 10);

    const beforePrimary = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);
    const beforeSecondary = await getStock(inventory, setup.productA.id, setup.warehouseSecondary.id);

    const payload: TransferStockDto = {
        productId: setup.productA.id,
        fromWarehouseId: setup.warehousePrimary.id,
        toWarehouseId: setup.warehouseSecondary.id,
        quantity: 5,
        notes: 'E2E transfer',
    };

    await ctx.api.post('/inventory/transfer', payload);

    const afterPrimary = await getStock(inventory, setup.productA.id, setup.warehousePrimary.id);
    const afterSecondary = await getStock(inventory, setup.productA.id, setup.warehouseSecondary.id);

    if (afterPrimary > new Decimal(beforePrimary).minus(payload.quantity).toNumber()) {
        throw new Error('Source warehouse stock did not decrease after transfer');
    }
    if (afterSecondary < new Decimal(beforeSecondary).plus(payload.quantity).toNumber()) {
        throw new Error('Destination warehouse stock did not increase after transfer');
    }
}

async function testLowStock(ctx: TestContext): Promise<void> {
    const lowStock = await fetchArray<unknown>(ctx, '/inventory/low-stock');
    if (!Array.isArray(lowStock)) {
        throw new Error('Low stock response is not an array');
    }
    logInfo(`Low stock items: ${lowStock.length}`);
}

async function testExpiringStock(ctx: TestContext, setup: InventorySetup): Promise<void> {
    const inventory = new InventoryHelper(ctx.tokens.admin);
    const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const receive = await inventory.receiveStock({
        productId: setup.productA.id,
        warehouseId: setup.warehousePrimary.id,
        quantity: 5,
        costPerUnit: 10,
        batchNumber: `EXP-${TEST_RUN_ID}`,
        expiryDate: new Date(expiryDate),
    });
    if (!receive.success) {
        throw new Error(receive.error ?? 'Receive expiring stock failed');
    }

    const expiring = await fetchArray<unknown>(ctx, '/inventory/expiring?days=30');
    if (!Array.isArray(expiring)) {
        throw new Error('Expiring stock response is not an array');
    }
    logInfo(`Expiring batches: ${expiring.length}`);
}

async function testInventoryValuation(ctx: TestContext): Promise<void> {
    const response = await ctx.api.get('/reports/inventory-valuation');
    const payload = response.data as { totalValue?: number; itemCount?: number };

    if (payload.totalValue === undefined && payload.itemCount === undefined) {
        throw new Error('Inventory valuation missing expected fields');
    }
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
        batchNumber: `STOCK-${TEST_RUN_ID}`,
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
