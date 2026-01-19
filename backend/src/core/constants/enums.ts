/**
 * NerdPOS System Enums
 * Centralized enum definitions to replace magic strings
 *
 * @module core/constants
 */

/**
 * Session lifecycle statuses
 */
export enum SessionStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
}

/**
 * Order lifecycle statuses
 */
export enum OrderStatus {
    NEW = 'NEW',
    DRAFT = 'DRAFT',
    CONFIRMED = 'CONFIRMED',
    PREPARING = 'PREPARING',
    READY = 'READY',
    PICKED_UP = 'PICKED_UP',
    DELIVERED = 'DELIVERED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    PAID = 'PAID',
}

/**
 * Table reservation statuses
 */
export enum ReservationStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    CANCELLED = 'CANCELLED',
    SEATED = 'SEATED',
    NO_SHOW = 'NO_SHOW',
    COMPLETED = 'COMPLETED',
}

/**
 * Table statuses
 */
export enum TableStatus {
    AVAILABLE = 'AVAILABLE',
    OCCUPIED = 'OCCUPIED',
    RESERVED = 'RESERVED',
    CLEANING = 'CLEANING',
    DIRTY = 'DIRTY',
}

/**
 * Kitchen order item statuses
 */
export enum KitchenItemStatus {
    PENDING = 'PENDING',
    PREPARING = 'PREPARING',
    READY = 'READY',
    SERVED = 'SERVED',
    CANCELLED = 'CANCELLED',
}

/**
 * Payment statuses
 */
export enum PaymentStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

/**
 * Payment methods
 */
export enum PaymentMethod {
    CASH = 'CASH',
    CARD = 'CARD',
    MOBILE = 'MOBILE',
}

/**
 * Delivery statuses
 */
export enum DeliveryStatus {
    PENDING = 'PENDING',
    ASSIGNED = 'ASSIGNED',
    PICKED_UP = 'PICKED_UP',
    ON_THE_WAY = 'ON_THE_WAY',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
}

/**
 * Refund statuses
 */
export enum RefundStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PROCESSED = 'PROCESSED',
}

/**
 * Inventory movement types
 */
export enum InventoryMovementType {
    IN = 'IN',
    OUT = 'OUT',
    TRANSFER = 'TRANSFER',
    ADJUSTMENT = 'ADJUSTMENT',
}
