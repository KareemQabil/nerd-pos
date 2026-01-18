// Sales Service
// Source: FINAL/BACKEND/05-MODULE-SALES.md, 01-create-module workflow
// Uses 7-step Calculation Pipeline
// Sprint 4: Added $transaction wrapper for ACID compliance

import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { SalesRepository } from './sales.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
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
        private readonly prisma: PrismaService,  // 🆕 For $transaction
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
        // 1. Build calculation context (Outside TX - pure computation)
        const context = this.buildCalculationContext(dto);

        // 2. Execute 7-step pipeline (Outside TX - pure computation)
        const calculated = await this.executeCalculationPipeline(context);

        // 3. Generate order number (Outside TX - read only)
        const orderNumber = await this.generateOrderNumber();

        // 4. Calculate item data (Outside TX - pure computation)
        // Map DTO fields to Prisma OrderItem schema fields
        const itemsWithSubtotals = dto.items.map((item) => {
            const modifierTotal = (item.modifiers || []).reduce(
                (sum, mod) => sum + mod.price,
                0,
            );
            const lineTotal = (item.price + modifierTotal) * item.quantity;
            return {
                productId: item.productId,
                productNameEn: item.name,       // DTO name → schema productNameEn
                productNameAr: item.nameAr,     // DTO nameAr → schema productNameAr
                unitPrice: item.price,          // DTO price → schema unitPrice
                quantity: item.quantity,
                lineTotal,                      // Calculated field → schema lineTotal
                modifiersAmount: modifierTotal,
                notes: item.notes,
                status: 'NEW',  // Schema default value
            };
        });

        // 5. Database Write - ATOMIC TRANSACTION
        // Only include fields that exist in SalesOrder Prisma schema
        const order = await this.prisma.$transaction(async (tx) => {
            return this.repo.createWithItems(
                {
                    orderNumber,
                    orderType: dto.type,
                    businessDate: new Date(),
                    itemSubtotal: calculated.itemSubtotal.toNumber(),
                    serviceChargeRate: calculated.serviceChargePercent.dividedBy(100).toNumber(),
                    serviceChargeAmount: calculated.serviceCharge.toNumber(),
                    deliveryCharge: calculated.deliveryCharge.toNumber(),
                    subtotalBeforeTax: calculated.subtotalBeforeTax.toNumber(),
                    taxRate: calculated.taxPercent.dividedBy(100).toNumber(),
                    taxAmount: calculated.taxAmount.toNumber(),
                    discountAmount: calculated.discountAmount.toNumber(),
                    grandTotal: calculated.grandTotal.toNumber(),
                    // Note: customerId, tableId, sessionId, createdBy not in current schema
                },
                itemsWithSubtotals,
                tx,
            );
        });

        // 6. Event Emission - AFTER TRANSACTION COMMITS (cannot be rolled back)
        await this.eventBus.publish(
            'OrderCreated',
            new OrderCreatedEvent(
                order.id,
                order.orderNumber,
                order.orderType,
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
                name: item.name || item.productNameEn || 'Unknown',
                price: new Decimal(item.price || item.unitPrice || 0),
                quantity: item.quantity,
                modifiers: item.modifiers?.map((m: any) => ({ price: new Decimal(m.price || 0) })) || [],
            })),
            orderType: (order.type || order.orderType || 'DINE_IN') as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
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
