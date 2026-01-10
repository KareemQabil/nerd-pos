// Payments Entities
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md

// ==================== PAYMENT ====================

export interface Payment {
    id: string;
    orderId: string;

    // Payment details
    method: 'CASH' | 'CARD' | 'MADA' | 'WALLET';
    amount: number;
    receivedAmount?: number | null; // For cash
    changeAmount: number;

    // Card details
    cardLast4?: string | null;
    cardType?: string | null; // VISA, MASTERCARD, MADA
    transactionId?: string | null;

    // Status
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

    // Refund tracking
    refundedAmount: number;

    // Tips
    tipAmount: number;

    // Timestamps
    paidAt?: Date | null;
    failedAt?: Date | null;

    // Audit
    sessionId?: string | null;
    createdBy: string;
    createdAt: Date;
}

export interface PaymentWithRefunds extends Payment {
    refunds: Refund[];
}

// ==================== PAYMENT METHOD ====================

export interface PaymentMethod {
    id: string;
    name: string;
    nameAr: string;
    type: 'CASH' | 'CARD' | 'MADA' | 'WALLET';

    // Integration
    provider?: string | null; // STRIPE, PAYFORT, HYPERPAY
    apiKey?: string | null; // Encrypted

    // Settings
    isActive: boolean;
    sortOrder: number;

    createdAt: Date;
    updatedAt: Date;
}

// ==================== REFUND ====================

export interface Refund {
    id: string;
    paymentId: string;

    amount: number;
    reason: string;
    notes?: string | null;

    // Approval
    approvedBy?: string | null;
    approvedAt?: Date | null;

    status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';

    createdBy: string;
    createdAt: Date;
}
