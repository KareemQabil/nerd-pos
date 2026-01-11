// Payments Entities
// Source: FINAL/BACKEND/06-MODULE-PAYMENTS.md
// Aligned with: prisma/schema.prisma

// ==================== PAYMENT METHOD CONFIG ====================

export interface PaymentMethodConfig {
    id: string;
    code: string;
    nameAr: string;                      // Matches schema
    nameEn: string;                      // Matches schema
    type: string;                        // CASH, CARD, MADA, WALLET
    requiresTerminal: boolean;
    requiresReference: boolean;
    isActive: boolean;
    sortOrder: number;
    receivableAccountId?: string | null;
    clearingAccountId?: string | null;
    feeAccountId?: string | null;
}

// Backward compatible alias
export type PaymentMethod = PaymentMethodConfig;

// ==================== PAYMENT ====================

export interface Payment {
    id: string;
    orderId: string;
    orderItemId?: string | null;

    // Payment details
    paymentMethod: string;               // Matches schema: code from PaymentMethodConfig
    amount: number;                      // Decimal in DB
    amountReceived?: number | null;      // Decimal in DB
    changeGiven?: number | null;         // Decimal in DB

    // Backward compatible aliases
    method?: string;                     // Alias for paymentMethod
    receivedAmount?: number | null;      // Alias for amountReceived
    changeAmount?: number;               // Alias for changeGiven

    // Foreign currency
    foreignCurrencyCode?: string | null;
    foreignAmount?: number | null;
    exchangeRate?: number | null;

    // Card/terminal details
    referenceNumber?: string | null;
    terminalId?: string | null;
    approvalCode?: string | null;

    // Backward compatible aliases for card
    cardLast4?: string | null;
    cardType?: string | null;
    transactionId?: string | null;

    // Status
    status: string;                      // PENDING, COMPLETED, FAILED, REFUNDED
    paymentDate: Date;

    // Session tracking
    sessionId: string;
    processedBy: string;

    // Metadata
    metadata?: any;

    // Backward compatible
    paidAt?: Date | null;                // Alias for paymentDate
    createdBy?: string;                  // Alias for processedBy
    createdAt?: Date;
    refundedAmount?: number;
    tipAmount?: number;
}

export interface PaymentWithRefunds extends Payment {
    refunds?: Refund[];
}

// ==================== REFUND ====================
// Note: Refund model not in current schema, but needed for business logic

export interface Refund {
    id: string;
    paymentId: string;
    amount: number;
    reason: string;
    notes?: string | null;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    status: string;                      // PENDING, APPROVED, COMPLETED, REJECTED
    createdBy: string;
    createdAt: Date;
}
