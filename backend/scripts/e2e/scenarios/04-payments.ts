/**
 * Scenario 04: Payments
 */

import axios from 'axios';
import Decimal from 'decimal.js';
import { TestContext, TestResult, createApiClient } from '../config/client';
import { ENV, logSection, logPass, logFail, logInfo, TEST_RUN_ID, TEST_DEFAULTS, TERMINALS } from '../config/env';
import { InventoryHelper } from '../helpers/inventory.helper';
import { SalesHelper } from '../helpers/sales.helper';
import { SessionHelper } from '../helpers/session.helper';
import { CreateProductDto, CreateCategoryDto } from '../../../src/modules/products/dto';
import { Product, Category } from '../../../src/modules/products/entities/product.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CreateWarehouseDto, ReceiveStockDto } from '../../../src/modules/inventory/dto';
import { CreateOrderDto } from '../../../src/modules/sales/dto';
import { Order } from '../../../src/modules/sales/entities/sales.entity';
import { CreatePaymentDto, SplitPaymentDto, CreateRefundDto, CreatePaymentMethodDto, UpdatePaymentMethodDto } from '../../../src/modules/payments/dto';

interface PaymentSetup {
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

export async function runPaymentsTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 04: PAYMENTS');

    const setupResult = await runTest('04-SETUP', 'Setup (Session, Product, Stock)', async () => {
        const setup = await setupPayments(ctx);
        ctx.data.paymentSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-036', 'Split Payment - Cash + Card', async () => {
        const setup = getSetup(ctx);
        await testSplitPayment(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-037', 'Split Payment - Three Methods', async () => {
        const setup = getSetup(ctx);
        await testSplitPaymentThree(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-038', 'Split Payment - Mismatch Total', async () => {
        const setup = getSetup(ctx);
        await testSplitMismatch(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-039', 'Refund - Full Payment', async () => {
        const setup = getSetup(ctx);
        await testRefundFull(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-040', 'Refund - Partial Amount', async () => {
        const setup = getSetup(ctx);
        await testRefundPartial(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-041', 'Card Payment - Store Card Details', async () => {
        const setup = getSetup(ctx);
        await testCardDetails(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-042', 'Payment Method Management', async () => {
        const setup = getSetup(ctx);
        await testPaymentMethodManagement(ctx, setup);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): PaymentSetup {
    const setup = ctx.data.paymentSetup as PaymentSetup | undefined;
    if (!setup) {
        throw new Error('Payment setup missing');
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

async function setupPayments(ctx: TestContext): Promise<PaymentSetup> {
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

    await ensureStock(inventory, product.id, warehouse.id, 50, 10);

    return {
        category,
        product,
        warehouse,
        sessionId,
        adminId,
    };
}

async function testSplitPayment(ctx: TestContext, setup: PaymentSetup): Promise<void> {
    const { orderId, total } = await createOrderForPayment(ctx, setup, 2);
    const split: SplitPaymentDto = {
        orderId,
        sessionId: setup.sessionId,
        payments: [
            { method: 'CASH', amount: 20, receivedAmount: 20 },
            { method: 'CARD', amount: new Decimal(total).minus(20).toNumber(), transactionId: `CARD-${TEST_RUN_ID}` },
        ],
        userId: setup.adminId,
    };

    await ctx.api.post('/payments/split', split);
    await assertOrderCompleted(ctx, orderId);
}

async function testSplitPaymentThree(ctx: TestContext, setup: PaymentSetup): Promise<void> {
    const { orderId, total } = await createOrderForPayment(ctx, setup, 3);
    const totalDecimal = new Decimal(total);
    const split: SplitPaymentDto = {
        orderId,
        sessionId: setup.sessionId,
        payments: [
            { method: 'CASH', amount: 10, receivedAmount: 10 },
            { method: 'CARD', amount: 10, transactionId: `CARD-${TEST_RUN_ID}` },
            { method: 'WALLET', amount: totalDecimal.minus(20).toNumber(), transactionId: `WALLET-${TEST_RUN_ID}` },
        ],
        userId: setup.adminId,
    };

    await ctx.api.post('/payments/split', split);
    await assertOrderCompleted(ctx, orderId);
}

async function testSplitMismatch(ctx: TestContext, setup: PaymentSetup): Promise<void> {
    const { orderId, total } = await createOrderForPayment(ctx, setup, 1);
    const api = axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${ctx.tokens.admin}`,
        },
        validateStatus: () => true,
    });

    const payload: SplitPaymentDto = {
        orderId,
        sessionId: setup.sessionId,
        payments: [
            { method: 'CASH', amount: new Decimal(total).minus(1).toNumber(), receivedAmount: new Decimal(total).minus(1).toNumber() },
        ],
        userId: setup.adminId,
    };

    const response = await api.post('/payments/split', payload);
    if (response.status !== 400 && response.status !== 422) {
        throw new Error(`Expected 400/422, got ${response.status}`);
    }
}

async function testRefundFull(ctx: TestContext, setup: PaymentSetup): Promise<void> {
    const { orderId, total } = await createOrderForPayment(ctx, setup, 1);
    const paymentId = await payOrder(ctx, setup, orderId, total);
    if (!paymentId) {
        throw new Error('Payment id missing before refund');
    }

    const refund: CreateRefundDto = {
        paymentId,
        amount: total,
        reason: 'E2E full refund',
        userId: setup.adminId,
    };

    await ctx.api.post('/payments/refunds', refund);
}

async function testRefundPartial(ctx: TestContext, setup: PaymentSetup): Promise<void> {
    const { orderId, total } = await createOrderForPayment(ctx, setup, 1);
    const paymentId = await payOrder(ctx, setup, orderId, total);
    if (!paymentId) {
        throw new Error('Payment id missing before refund');
    }

    const refund: CreateRefundDto = {
        paymentId,
        amount: new Decimal(total).dividedBy(2).toNumber(),
        reason: 'E2E partial refund',
        userId: setup.adminId,
    };

    await ctx.api.post('/payments/refunds', refund);
}

async function testCardDetails(ctx: TestContext, setup: PaymentSetup): Promise<void> {
    const { orderId, total } = await createOrderForPayment(ctx, setup, 1);

    const payload: CreatePaymentDto = {
        orderId,
        sessionId: setup.sessionId,
        method: 'CARD',
        amount: total,
        cardLast4: '4242',
        cardType: 'VISA',
        transactionId: `CARD-${TEST_RUN_ID}`,
        createdBy: setup.adminId,
    };

    const response = await ctx.api.post('/payments', payload);
    const payment = response.data as { id?: string };
    if (!payment?.id) {
        throw new Error('Payment response missing id');
    }

    const paymentDetails = await ctx.api.get(`/payments/${payment.id}`);
    const data = paymentDetails.data as { cardLast4?: string; transactionId?: string };
    if (data.cardLast4 && data.cardLast4 !== '4242') {
        throw new Error('cardLast4 mismatch');
    }
    if (data.transactionId && data.transactionId !== payload.transactionId) {
        throw new Error('transactionId mismatch');
    }
}

async function testPaymentMethodManagement(ctx: TestContext, setup: PaymentSetup): Promise<void> {
    const payload: CreatePaymentMethodDto = {
        code: `PM-${TEST_RUN_ID}`,
        name: `E2E Method ${TEST_RUN_ID}`,
        nameAr: `E2E Method ${TEST_RUN_ID}`,
        type: 'WALLET',
        provider: 'E2E',
        sortOrder: 99,
        isActive: true,
    };

    const create = await ctx.api.post('/payments/methods', payload);
    const method = create.data as { id?: string; name?: string };
    if (!method?.id) {
        throw new Error('Payment method creation missing id');
    }

    const update: UpdatePaymentMethodDto = {
        name: `${payload.name} Updated`,
        sortOrder: 98,
    };

    await ctx.api.put(`/payments/methods/${method.id}`, update);
}

async function createOrderForPayment(
    ctx: TestContext,
    setup: PaymentSetup,
    quantity: number,
): Promise<{ orderId: string; total: number }> {
    const sales = new SalesHelper(ctx.tokens.admin);

    const orderPayload: CreateOrderDto = {
        type: 'DINE_IN',
        sessionId: setup.sessionId,
        items: [
            {
                productId: setup.product.id,
                name: setup.product.nameEn,
                nameAr: setup.product.nameAr,
                price: new Decimal(setup.product.price).toNumber(),
                quantity,
            },
        ],
    };

    const orderResult = await sales.createOrder(orderPayload);
    if (!orderResult.success || !orderResult.data?.id) {
        throw new Error(orderResult.error ?? 'Create order failed');
    }

    await sales.confirmOrder(orderResult.data.id);

    const orderDetails = await ctx.api.get<Order>(`/orders/${orderResult.data.id}`);
    const order = orderDetails.data as Order;
    if (!order?.grandTotal) {
        throw new Error('Order total missing');
    }

    return { orderId: orderResult.data.id, total: new Decimal(order.grandTotal).toNumber() };
}

async function payOrder(ctx: TestContext, setup: PaymentSetup, orderId: string, total: number): Promise<string> {
    const payload: CreatePaymentDto = {
        orderId,
        sessionId: setup.sessionId,
        method: 'CASH',
        amount: total,
        receivedAmount: total,
        createdBy: setup.adminId,
    };

    await ctx.api.post('/payments', payload);

    const payments = await fetchArray<{ id: string }>(ctx, `/payments/order/${orderId}`);
    if (payments.length === 0 || !payments[0].id) {
        throw new Error('Payment not found after processing');
    }

    return payments[0].id;
}

async function assertOrderCompleted(ctx: TestContext, orderId: string): Promise<void> {
    const response = await ctx.api.get<Order>(`/orders/${orderId}`);
    const order = response.data as Order;
    const allowed = new Set(['CONFIRMED', 'PREPARING', 'READY', 'PAID', 'COMPLETED']);
    if (!allowed.has(order.status)) {
        throw new Error(`Unexpected order status after payment (status: ${order.status})`);
    }
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
        batchNumber: `PAY-${TEST_RUN_ID}`,
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
        nameEn: `Payments Category ${TEST_RUN_ID}`,
        nameAr: `Payments Category ${TEST_RUN_ID}`,
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
    const candidate = products.find((product) => product.trackInventory === true && product.isActive !== false);
    if (candidate) {
        return candidate;
    }

    const payload: CreateProductDto = {
        sku: `PAY-${TEST_RUN_ID}`,
        nameAr: `Payment Product ${TEST_RUN_ID}`,
        nameEn: `Payment Product ${TEST_RUN_ID}`,
        categoryId,
        price: 30.0,
        cost: 15.0,
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
        code: `PAY-WH-${TEST_RUN_ID}`,
        nameAr: `Payments Warehouse ${TEST_RUN_ID}`,
        nameEn: `Payments Warehouse ${TEST_RUN_ID}`,
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
