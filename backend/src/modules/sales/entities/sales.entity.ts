// Sales Entities
// Source: FINAL/BACKEND/05-MODULE-SALES.md

// ==================== ORDER ====================

export interface Order {
    id: string;
    orderNumber: string;

    // Type & Status
    type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    status: 'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

    // Customer
    customerId?: string | null;

    // Dining
    tableId?: string | null;
    guestCount?: number | null;

    // 7-Step Calculation Results
    itemSubtotal: number;
    serviceCharge: number;
    serviceChargePercent: number;
    deliveryCharge: number;
    subtotalBeforeTax: number;
    taxAmount: number;
    taxPercent: number;
    discountAmount: number;
    discountCode?: string | null;
    grandTotal: number;

    // Payment
    paidAmount: number;
    changeAmount: number;

    // Compliance (ZATCA)
    invoiceXML?: string | null;
    zatcaHash?: string | null;
    previousHash?: string | null;
    qrCode?: string | null;

    // Timestamps
    orderedAt: Date;
    confirmedAt?: Date | null;
    completedAt?: Date | null;
    cancelledAt?: Date | null;

    // Audit
    sessionId?: string | null;
    createdBy: string;
    syncStrategy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface OrderWithItems extends Order {
    items: OrderItemWithModifiers[];
    payments?: Payment[];
}

// ==================== ORDER ITEM ====================

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    name: string;
    nameAr: string;
    price: number;
    quantity: number;
    subtotal: number; // price * quantity + modifiers
    notes?: string | null;
    status: 'PENDING' | 'PREPARING' | 'READY';
    modifiers?: OrderItemModifier[];
}

export interface OrderItemWithModifiers extends OrderItem {
    modifiers: OrderItemModifier[];
}

// ==================== ORDER ITEM MODIFIER ====================

export interface OrderItemModifier {
    id: string;
    orderItemId: string;
    modifierId: string;
    optionId: string;
    name: string;
    price: number;
}

// ==================== PAYMENT (Reference) ====================

export interface Payment {
    id: string;
    orderId: string;
    method: string;
    amount: number;
    reference?: string | null;
    status: string;
    paidAt: Date;
}

// ==================== CALCULATION CONTEXT ====================

export interface CalculationItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    modifiers?: { price: number }[];
}

export interface CalculationResult {
    itemSubtotal: number;
    serviceCharge: number;
    serviceChargePercent: number;
    deliveryCharge: number;
    subtotalBeforeTax: number;
    taxAmount: number;
    taxPercent: number;
    discountAmount: number;
    grandTotal: number;
}
