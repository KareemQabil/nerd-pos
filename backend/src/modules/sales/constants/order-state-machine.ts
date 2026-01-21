// Order State Machine Validation
// Source: Forensic Audit Phase 5 - Business Logic Verification
// Enforces valid state transitions for ZATCA compliance

import { OrderStatus } from '../../../core/constants/enums';

/**
 * Valid state transitions for SalesOrder
 * 
 * ZATCA Compliance: Terminal states (COMPLETED, CANCELLED) cannot transition
 * to any other state to maintain audit trail integrity.
 */
export const ORDER_STATE_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.NEW]: [OrderStatus.DRAFT, OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.DRAFT]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.PICKED_UP, OrderStatus.DELIVERED, OrderStatus.COMPLETED],
    [OrderStatus.PICKED_UP]: [OrderStatus.DELIVERED, OrderStatus.COMPLETED],
    [OrderStatus.DELIVERED]: [OrderStatus.COMPLETED],
    [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.COMPLETED],
    [OrderStatus.COMPLETED]: [], // Terminal state - no transitions allowed
    [OrderStatus.CANCELLED]: [], // Terminal state - no transitions allowed
};

/**
 * Check if a state transition is valid
 * @param from Current order status
 * @param to Target order status
 * @returns true if transition is allowed
 */
export function isValidTransition(
    from: OrderStatus,
    to: OrderStatus
): boolean {
    const allowed = ORDER_STATE_TRANSITIONS[from] || [];
    return allowed.includes(to);
}

/**
 * Get allowed next states for an order
 * @param currentStatus Current order status
 * @returns Array of allowed next states
 */
export function getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return ORDER_STATE_TRANSITIONS[currentStatus] || [];
}

/**
 * Check if a status is a terminal state
 * @param status Order status to check
 * @returns true if status is terminal (COMPLETED or CANCELLED)
 */
export function isTerminalState(status: OrderStatus): boolean {
    return status === OrderStatus.COMPLETED || status === OrderStatus.CANCELLED;
}
