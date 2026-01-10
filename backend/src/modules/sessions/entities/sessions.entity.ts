// Sessions Entities
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md

// ==================== SESSION ====================

export interface Session {
    id: string;
    sessionNumber: string;

    // User
    userId: string;

    // Cash management
    openingBalance: number;
    closingBalance?: number | null;
    expectedBalance?: number | null;
    variance?: number | null;

    // Sales summary
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalRefunds: number;
    orderCount: number;

    // Timestamps
    openedAt: Date;
    closedAt?: Date | null;

    // Status
    status: 'OPEN' | 'CLOSED';
}

export interface SessionWithDetails extends Session {
    denominations: Denomination[];
}

// ==================== DENOMINATION ====================

export interface Denomination {
    id: string;
    sessionId: string;

    // Denomination (200, 100, 50, 20, 10, 5, 1, 0.5, 0.25, 0.10, 0.05)
    value: number;
    count: number;
    total: number;
}

// ==================== SESSION SUMMARY ====================

export interface SessionSummary {
    sessionNumber: string;
    openedAt: Date;
    closedAt?: Date | null;
    openingBalance: number;
    closingBalance: number;
    expectedBalance: number;
    variance: number;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalRefunds: number;
    orderCount: number;
}
