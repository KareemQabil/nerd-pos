// Sales Service
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow
// Uses 7-step Calculation Pipeline

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { SalesRepository } from './sales.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { ICalculationStep, CalculationContext } from '../../core/calculation/calculation-step.interface';
import {
    CreateOrderDto,
    UpdateOrderStatusDto,
    AddOrderItemDto,
    UpdateOrderItemDto,
    ApplyDiscountDto,
} from './dto';
import {
    OrderCreatedEvent,
    OrderConfirmedEvent,
    OrderCompletedEvent,
    OrderCancelledEvent,
    OrderItemAddedEvent,
    OrderStatusChangedEvent,
    OrderCalculatedEvent,
} from './events/sales.events';
import { Order, OrderWithItems, CalculationResult } from './entities/sales.entity';
import Decimal from 'decimal.js';

// Import calculation steps
import {
    ItemSubtotalStep,
    ServiceChargeStep,
    DeliveryChargeStep,
    SubtotalBeforeTaxStep,
    TaxStep,
    DiscountStep,
    GrandTotalStep,
} from './calculation-steps';

@Injectable()
export class SalesService {
    private calculationSteps: ICalculationStep[];

    constructor(
        private readonly repo: SalesRepository,
        @Inject('IEventBus') private readonly eventBus: IEventBus,
        private readonly itemSubtotalStep: ItemSubtotalStep,
        private readonly serviceChargeStep: ServiceChargeStep,
        private readonly deliveryChargeStep: DeliveryChargeStep,
        private readonly subtotalBeforeTaxStep: SubtotalBeforeTaxStep,
        private readonly taxStep: TaxStep,
        private readonly discountStep: DiscountStep,
        private readonly grandTotalStep: GrandTotalStep,
    ) {
        // Sort steps by order
        this.calculationSteps = [
            itemSubtotalStep,
            serviceChargeStep,
            deliveryChargeStep,
            subtotalBeforeTaxStep,
            taxStep,
            discountStep,
            grandTotalStep,
        ].sort((a, b) => a.order - b.order);
    }

    // ==================== ORDER CREATION ====================

    async createOrder(dto: CreateOrderDto, createdBy: string): Promise<OrderWithItems> {
        // Build calculation context
        const context = this.buildCalculationContext(dto);

        // Execute 7-step pipeline
        const calculated = await this.executeCalculationPipeline(context);

        // Generate order number
        const orderNumber = await this.generateOrderNumber();

        // Calculate item subtotals
        const itemsWithSubtotals = dto.items.map((item) => {
            const modifierTotal = (item.modifiers || []).reduce(
                (sum, mod) => sum + mod.price,
                0,
            );
            const subtotal = (item.price + modifierTotal) * item.quantity;
            return {
                ...item,
                subtotal,
                status: 'PENDING' as const,
            };
        });

        // Create order with items
        const order = await this.repo.createWithItems(
            {
                orderNumber,
                type: dto.type,
                status: 'DRAFT',
                customerId: dto.customerId,
                tableId: dto.tableId,
                guestCount: dto.guestCount,
                sessionId: dto.sessionId,
                discountCode: dto.discountCode,
                itemSubtotal: calculated.itemSubtotal.toNumber(),
                serviceCharge: calculated.serviceCharge.toNumber(),
                serviceChargePercent: calculated.serviceChargePercent.toNumber(),
                deliveryCharge: calculated.deliveryCharge.toNumber(),
                subtotalBeforeTax: calculated.subtotalBeforeTax.toNumber(),
                taxAmount: calculated.taxAmount.toNumber(),
                taxPercent: calculated.taxPercent.toNumber(),
                discountAmount: calculated.discountAmount.toNumber(),
                grandTotal: calculated.grandTotal.toNumber(),
                paidAmount: 0,
                changeAmount: 0,
                createdBy,
            },
            itemsWithSubtotals,
        );

        // Publish event
        await this.eventBus.publish(
            'OrderCreated',
            new OrderCreatedEvent(
                order.id,
                order.orderNumber,
                order.type,
                calculated.grandTotal.toNumber(),
            ),
        );

        return order;
    }

    // ==================== ORDER STATUS ====================

    async confirmOrder(orderId: string): Promise<Order> {
        const order = await this.findOrderById(orderId);

        if (order.status !== 'DRAFT') {
            throw new BadRequestException('Only DRAFT orders can be confirmed');
        }

        const updated = await this.repo.update(orderId, {
            status: 'CONFIRMED',
            confirmedAt: new Date(),
        });

        await this.eventBus.publish(
            'OrderConfirmed',
            new OrderConfirmedEvent(orderId, order.orderNumber),
        );

        await this.eventBus.publish(
            'OrderStatusChanged',
            new OrderStatusChangedEvent(orderId, 'DRAFT', 'CONFIRMED'),
        );

        return updated;
    }

    async updateStatus(orderId: string, dto: UpdateOrderStatusDto): Promise<Order> {
        const order = await this.findOrderById(orderId);
        const previousStatus = order.status;

        const updated = await this.repo.update(orderId, {
            status: dto.status,
            ...(dto.status === 'COMPLETED' && { completedAt: new Date() }),
            ...(dto.status === 'CANCELLED' && { cancelledAt: new Date() }),
        });

        await this.eventBus.publish(
            'OrderStatusChanged',
            new OrderStatusChangedEvent(orderId, previousStatus, dto.status),
        );

        if (dto.status === 'COMPLETED') {
            await this.eventBus.publish(
                'OrderCompleted',
                new OrderCompletedEvent(orderId, order.orderNumber, order.grandTotal),
            );
        }

        if (dto.status === 'CANCELLED') {
            await this.eventBus.publish(
                'OrderCancelled',
                new OrderCancelledEvent(orderId, order.orderNumber),
            );
        }

        return updated;
    }

    async cancelOrder(orderId: string, reason?: string): Promise<Order> {
        const order = await this.findOrderById(orderId);

        if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
            throw new BadRequestException('Cannot cancel completed or already cancelled order');
        }

        const updated = await this.repo.update(orderId, {
            status: 'CANCELLED',
            cancelledAt: new Date(),
        });

        await this.eventBus.publish(
            'OrderCancelled',
            new OrderCancelledEvent(orderId, order.orderNumber, reason),
        );

        return updated;
    }

    // ==================== ORDER ITEMS ====================

    async addItem(orderId: string, dto: AddOrderItemDto): Promise<OrderWithItems> {
        const order = await this.findOrderById(orderId);

        if (order.status !== 'DRAFT') {
            throw new BadRequestException('Can only add items to DRAFT orders');
        }

        // Calculate subtotal
        const modifierTotal = (dto.modifiers || []).reduce(
            (sum, mod) => sum + mod.price,
            0,
        );
        const subtotal = (dto.price + modifierTotal) * dto.quantity;

        const item = await this.repo.addItem(orderId, {
            ...dto,
            subtotal,
            status: 'PENDING',
        });

        // Recalculate order
        await this.recalculateOrder(orderId);

        await this.eventBus.publish(
            'OrderItemAdded',
            new OrderItemAddedEvent(orderId, item.id, dto.productId, dto.quantity),
        );

        return this.findOrderByIdWithItems(orderId);
    }

    async updateItem(
        orderId: string,
        itemId: string,
        dto: UpdateOrderItemDto,
    ): Promise<OrderWithItems> {
        const order = await this.findOrderById(orderId);

        if (order.status !== 'DRAFT') {
            throw new BadRequestException('Can only modify items in DRAFT orders');
        }

        await this.repo.updateItem(itemId, dto);
        await this.recalculateOrder(orderId);

        return this.findOrderByIdWithItems(orderId);
    }

    async removeItem(orderId: string, itemId: string): Promise<OrderWithItems> {
        const order = await this.findOrderById(orderId);

        if (order.status !== 'DRAFT') {
            throw new BadRequestException('Can only remove items from DRAFT orders');
        }

        await this.repo.removeItem(itemId);
        await this.recalculateOrder(orderId);

        return this.findOrderByIdWithItems(orderId);
    }

    // ==================== QUERIES ====================

    async findOrderById(id: string): Promise<Order> {
        const order = await this.repo.findById(id);
        if (!order) {
            throw new NotFoundException(`Order ${id} not found`);
        }
        return order;
    }

    async findOrderByIdWithItems(id: string): Promise<OrderWithItems> {
        const order = await this.repo.findWithItems(id);
        if (!order) {
            throw new NotFoundException(`Order ${id} not found`);
        }
        return order;
    }

    async findOrderByNumber(orderNumber: string): Promise<OrderWithItems> {
        const order = await this.repo.findByOrderNumber(orderNumber);
        if (!order) {
            throw new NotFoundException(`Order ${orderNumber} not found`);
        }
        return order;
    }

    async findOrdersBySession(sessionId: string): Promise<Order[]> {
        return this.repo.findBySession(sessionId);
    }

    async findOrdersByStatus(status: string): Promise<Order[]> {
        return this.repo.findByStatus(status);
    }

    async findOrdersByCustomer(customerId: string): Promise<Order[]> {
        return this.repo.findByCustomer(customerId);
    }

    // ==================== PRIVATE METHODS ====================

    private buildCalculationContext(dto: CreateOrderDto): CalculationContext {
        return {
            items: dto.items.map((item) => ({
                productId: item.productId,
                name: item.name,
                price: new Decimal(item.price),
                quantity: item.quantity,
                modifiers: item.modifiers?.map((m) => ({ price: new Decimal(m.price) })),
            })),
            orderType: dto.type,
            customerId: dto.customerId || null,
            discountCode: dto.discountCode || null,
            discount: null, // Will be set by discount step if code exists
            deliveryZoneCharge: null, // Will come from delivery address
            itemSubtotal: new Decimal(0),
            serviceCharge: new Decimal(0),
            serviceChargePercent: new Decimal(0),
            deliveryCharge: new Decimal(0),
            subtotalBeforeTax: new Decimal(0),
            taxAmount: new Decimal(0),
            taxPercent: new Decimal(15),
            discountAmount: new Decimal(0),
            grandTotal: new Decimal(0),
            metadata: {},
        };
    }

    private async executeCalculationPipeline(
        context: CalculationContext,
    ): Promise<CalculationContext> {
        let ctx = context;

        for (const step of this.calculationSteps) {
            ctx = await step.execute(ctx);
        }

        return ctx;
    }

    private async recalculateOrder(orderId: string): Promise<void> {
        const order = await this.repo.findWithItems(orderId);
        if (!order) return;

        // Build context from existing order
        const context: CalculationContext = {
            items: order.items.map((item) => ({
                productId: item.productId,
                name: item.name,
                price: new Decimal(item.price),
                quantity: item.quantity,
                modifiers: item.modifiers?.map((m) => ({ price: new Decimal(m.price) })),
            })),
            orderType: order.type,
            customerId: order.customerId || null,
            discountCode: order.discountCode || null,
            discount: null,
            deliveryZoneCharge: null,
            itemSubtotal: new Decimal(0),
            serviceCharge: new Decimal(0),
            serviceChargePercent: new Decimal(0),
            deliveryCharge: new Decimal(0),
            subtotalBeforeTax: new Decimal(0),
            taxAmount: new Decimal(0),
            taxPercent: new Decimal(15),
            discountAmount: new Decimal(0),
            grandTotal: new Decimal(0),
            metadata: {},
        };

        const calculated = await this.executeCalculationPipeline(context);

        await this.repo.update(orderId, {
            itemSubtotal: calculated.itemSubtotal.toNumber(),
            serviceCharge: calculated.serviceCharge.toNumber(),
            serviceChargePercent: calculated.serviceChargePercent.toNumber(),
            deliveryCharge: calculated.deliveryCharge.toNumber(),
            subtotalBeforeTax: calculated.subtotalBeforeTax.toNumber(),
            taxAmount: calculated.taxAmount.toNumber(),
            taxPercent: calculated.taxPercent.toNumber(),
            discountAmount: calculated.discountAmount.toNumber(),
            grandTotal: calculated.grandTotal.toNumber(),
        });

        await this.eventBus.publish(
            'OrderCalculated',
            new OrderCalculatedEvent(
                orderId,
                calculated.itemSubtotal.toNumber(),
                calculated.grandTotal.toNumber(),
            ),
        );
    }

    private async generateOrderNumber(): Promise<string> {
        const date = new Date();
        const prefix = `ORD${date.getFullYear()}${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;
        const count = await this.repo.countByPrefix(prefix);
        return `${prefix}${(count + 1).toString().padStart(4, '0')}`;
    }
}
