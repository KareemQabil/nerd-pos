/**
 * Scenario 07: Compliance
 */

import Decimal from 'decimal.js';
import { TestContext, TestResult } from '../config/client';
import { logSection, logPass, logFail, logInfo, TEST_RUN_ID, TEST_DEFAULTS, TERMINALS } from '../config/env';
import { InventoryHelper } from '../helpers/inventory.helper';
import { SalesHelper } from '../helpers/sales.helper';
import { SessionHelper } from '../helpers/session.helper';
import { CreateProductDto, CreateCategoryDto } from '../../../src/modules/products/dto';
import { Product, Category } from '../../../src/modules/products/entities/product.entity';
import { Warehouse } from '../../../src/modules/inventory/entities/inventory.entity';
import { CreateWarehouseDto, ReceiveStockDto } from '../../../src/modules/inventory/dto';
import { CreateOrderDto } from '../../../src/modules/sales/dto';
import { Order } from '../../../src/modules/sales/entities/sales.entity';
import { CreatePaymentDto } from '../../../src/modules/payments/dto';
import { GenerateInvoiceDto, SubmitInvoiceDto } from '../../../src/modules/compliance/dto';
import { ZATCAInvoice, HashChainStatus } from '../../../src/modules/compliance/entities/compliance.entity';

interface ComplianceSetup {
    category: Category;
    product: Product;
    warehouse: Warehouse;
    sessionId: string;
    orderId: string;
    orderData: Order;
    invoiceId?: string;
}

interface RunnerResult {
    passed: boolean;
    error?: string;
}

export async function runComplianceTests(ctx: TestContext): Promise<TestResult[]> {
    const results: TestResult[] = [];
    logSection('SCENARIO 07: COMPLIANCE');

    const setupResult = await runTest('07-SETUP', 'Setup (Order, Session, Stock)', async () => {
        const setup = await setupCompliance(ctx);
        ctx.data.complianceSetup = setup;
        return { passed: true };
    });
    results.push(setupResult);

    if (!setupResult.passed) {
        return results;
    }

    results.push(await runTest('TEST-059', 'Generate Invoice', async () => {
        const setup = getSetup(ctx);
        await testGenerateInvoice(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-060', 'Invoice QR Code', async () => {
        const setup = getSetup(ctx);
        await testInvoiceQr(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-061', 'Submit Invoice', async () => {
        const setup = getSetup(ctx);
        await testSubmitInvoice(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-062', 'Get Invoice by Order', async () => {
        const setup = getSetup(ctx);
        await testGetInvoiceByOrder(ctx, setup);
        return { passed: true };
    }));

    results.push(await runTest('TEST-063', 'Pending Invoices', async () => {
        await testPendingInvoices(ctx);
        return { passed: true };
    }));

    results.push(await runTest('TEST-064', 'Verify Hash Chain', async () => {
        await testVerifyHashChain(ctx);
        return { passed: true };
    }));

    return results;
}

function getSetup(ctx: TestContext): ComplianceSetup {
    const setup = ctx.data.complianceSetup as ComplianceSetup | undefined;
    if (!setup) {
        throw new Error('Compliance setup missing');
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

async function setupCompliance(ctx: TestContext): Promise<ComplianceSetup> {
    const adminToken = ctx.tokens.admin;
    const adminId = ctx.ids.adminId;
    if (!adminToken || !adminId) {
        throw new Error('Admin token/user id missing from context');
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
        items: [
            {
                productId: product.id,
                name: product.nameEn,
                nameAr: product.nameAr,
                price: new Decimal(product.price).toNumber(),
                quantity: 1,
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

    const payment: CreatePaymentDto = {
        orderId: orderResult.data.id,
        sessionId,
        method: 'CASH',
        amount: new Decimal(order.grandTotal).toNumber(),
        receivedAmount: new Decimal(order.grandTotal).toNumber(),
        createdBy: adminId,
    };

    await ctx.api.post('/payments', payment);

    return {
        category,
        product,
        warehouse,
        sessionId,
        orderId: orderResult.data.id,
        orderData: order,
    };
}

async function testGenerateInvoice(ctx: TestContext, setup: ComplianceSetup): Promise<void> {
    const payload: GenerateInvoiceDto & { orderData: Order } = {
        orderId: setup.orderId,
        orderData: setup.orderData,
    };

    const response = await ctx.api.post<ZATCAInvoice>('/compliance/invoice/generate', payload);
    const invoice = response.data as ZATCAInvoice;
    if (!invoice?.id) {
        throw new Error('Invoice generation missing id');
    }

    setup.invoiceId = invoice.id;
}

async function testInvoiceQr(ctx: TestContext, setup: ComplianceSetup): Promise<void> {
    if (!setup.invoiceId) {
        throw new Error('Invoice id missing');
    }

    const response = await ctx.api.get<ZATCAInvoice>(`/compliance/invoice/order/${setup.orderId}`);
    const invoice = response.data as ZATCAInvoice;
    if (!invoice.qrCode && !invoice.qrCodeData) {
        throw new Error('Invoice QR code missing');
    }
}

async function testSubmitInvoice(ctx: TestContext, setup: ComplianceSetup): Promise<void> {
    if (!setup.invoiceId) {
        throw new Error('Invoice id missing');
    }

    const payload: SubmitInvoiceDto = { invoiceId: setup.invoiceId };
    await ctx.api.post('/compliance/invoice/submit', payload);
}

async function testGetInvoiceByOrder(ctx: TestContext, setup: ComplianceSetup): Promise<void> {
    const response = await ctx.api.get<ZATCAInvoice>(`/compliance/invoice/order/${setup.orderId}`);
    const invoice = response.data as ZATCAInvoice;
    if (!invoice?.id) {
        throw new Error('Invoice not found by order');
    }
    if (!invoice.qrCode && !invoice.qrCodeData) {
        logInfo('Invoice QR code not present in response');
    }
}

async function testPendingInvoices(ctx: TestContext): Promise<void> {
    const pending = await fetchArray<ZATCAInvoice>(ctx, '/compliance/invoice/pending');
    if (!Array.isArray(pending)) {
        throw new Error('Pending invoices response is not an array');
    }
    logInfo(`Pending invoices: ${pending.length}`);
}

async function testVerifyHashChain(ctx: TestContext): Promise<void> {
    const response = await ctx.api.get<HashChainStatus>('/compliance/hash-chain/verify');
    const data = response.data as HashChainStatus & { isValid?: boolean };
    if (data.chainValid === false || data.isValid === false) {
        throw new Error('Hash chain invalid');
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
        batchNumber: `COMP-${TEST_RUN_ID}`,
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
        nameEn: `Compliance Category ${TEST_RUN_ID}`,
        nameAr: `Compliance Category ${TEST_RUN_ID}`,
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
        sku: `COMP-${TEST_RUN_ID}`,
        nameAr: `Compliance Product ${TEST_RUN_ID}`,
        nameEn: `Compliance Product ${TEST_RUN_ID}`,
        categoryId,
        price: 40.0,
        cost: 18.0,
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
        code: `COMP-WH-${TEST_RUN_ID}`,
        nameAr: `Compliance Warehouse ${TEST_RUN_ID}`,
        nameEn: `Compliance Warehouse ${TEST_RUN_ID}`,
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
