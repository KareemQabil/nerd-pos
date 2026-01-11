// Sessions Entities
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Aligned with: prisma/schema.prisma

// ==================== REGISTER SESSION ====================

export interface RegisterSession {
    id: string;
    sessionNumber?: string;              // Backward-compatible alias
    terminalId: string;
    userId: string;
    businessDate: Date;

    // Cash management
    openingBalance: number;              // Decimal in DB
    expectedCash: number;                // Decimal in DB
    actualClosingBalance?: number | null; // Decimal in DB
    discrepancy?: number | null;         // Decimal in DB

    // Backward-compatible cash management aliases
    closingBalance?: number | null;      // Alias for actualClosingBalance
    expectedBalance?: number | null;     // Alias for expectedCash
    variance?: number | null;            // Alias for discrepancy

    // Timestamps
    openedAt: Date;
    closedAt?: Date | null;

    // Status
    status: string;                      // OPEN, CLOSED

    // Sales summary
    totalCashSales: number;              // Decimal in DB
    totalCardSales: number;              // Decimal in DB
    totalOtherSales: number;             // Decimal in DB
    totalDrops: number;                  // Decimal in DB
    totalPettyCash: number;              // Decimal in DB
    totalRefunds: number;                // Decimal in DB
    ordersCount: number;
    orderCount?: number;                 // Backward-compatible alias

    // Backward-compatible sales summary aliases
    totalSales?: number;                 // Alias for sum of all sales
    totalCash?: number;                  // Alias for totalCashSales
    totalCard?: number;                  // Alias for totalCardSales

    // Manager
    managerApprovalId?: string | null;
    closingNotes?: string | null;
}

// Backward-compatible alias
export type Session = RegisterSession;

export interface RegisterSessionWithDetails extends RegisterSession {
    cashMovements?: CashMovement[];
    denominationCounts?: DenominationCount[];
}

// Backward-compatible alias
export type SessionWithDetails = RegisterSessionWithDetails;

// ==================== CASH MOVEMENT ====================

export interface CashMovement {
    id: string;
    sessionId: string;
    movementType: string;                // DROP, FLOAT, PAYOUT, etc.
    amount: number;                      // Decimal in DB
    reason: string;
    approvedBy?: string | null;
    movementTime: Date;
}

// ==================== DENOMINATION COUNT ====================

export interface DenominationCount {
    id: string;
    sessionId: string;
    denomination: number;                // Decimal in DB (200, 100, 50, etc.)
    count: number;
    total: number;                       // Decimal in DB
}

// Backward-compatible alias
export type Denomination = DenominationCount;

// ==================== SESSION SUMMARY ====================

export interface SessionSummary {
    terminalId: string;
    openedAt: Date;
    closedAt?: Date | null;
    openingBalance: number;
    actualClosingBalance: number;
    expectedCash: number;
    discrepancy: number;
    totalCashSales: number;
    totalCardSales: number;
    totalOtherSales: number;
    totalRefunds: number;
    ordersCount: number;
}
