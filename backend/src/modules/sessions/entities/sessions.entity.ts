// Sessions Entities
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Aligned with: prisma/schema.prisma
// Type-safe: Using Prisma's Decimal type

import { Prisma } from '@prisma/client';

// Re-export Decimal type for convenience
export type Decimal = Prisma.Decimal;

// ==================== REGISTER SESSION ====================

export interface RegisterSession {
  id: string;
  sessionNumber?: string; // Backward-compatible alias
  terminalId: string;
  userId: string;
  businessDate: Date;

  // Cash management
  openingBalance: Decimal;
  expectedCash: Decimal;
  actualClosingBalance?: Decimal | null;
  discrepancy?: Decimal | null;

  // Backward-compatible cash management aliases
  closingBalance?: Decimal | null; // Alias for actualClosingBalance
  expectedBalance?: Decimal | null; // Alias for expectedCash
  variance?: Decimal | null; // Alias for discrepancy

  // Timestamps
  openedAt: Date;
  closedAt?: Date | null;

  // Status
  status: string; // OPEN, CLOSED

  // Sales summary
  totalCashSales: Decimal;
  totalCardSales: Decimal;
  totalOtherSales: Decimal;
  totalDrops: Decimal;
  totalPettyCash: Decimal;
  totalRefunds: Decimal;
  ordersCount: number;
  orderCount?: number; // Backward-compatible alias

  // Backward-compatible sales summary aliases
  totalSales?: Decimal; // Alias for sum of all sales
  totalCash?: Decimal; // Alias for totalCashSales
  totalCard?: Decimal; // Alias for totalCardSales

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
  movementType: string; // DROP, FLOAT, PAYOUT, etc.
  amount: Decimal;
  reason: string;
  approvedBy?: string | null;
  movementTime: Date;
}

// ==================== DENOMINATION COUNT ====================

export interface DenominationCount {
  id: string;
  sessionId: string;
  denomination: Decimal; // (200, 100, 50, etc.)
  count: number;
  total: Decimal;
}

// Backward-compatible alias
export type Denomination = DenominationCount;

// ==================== SESSION SUMMARY ====================

export interface SessionSummary {
  terminalId: string;
  openedAt: Date;
  closedAt?: Date | null;
  openingBalance: Decimal;
  actualClosingBalance: Decimal;
  expectedCash: Decimal;
  discrepancy: Decimal;
  totalCashSales: Decimal;
  totalCardSales: Decimal;
  totalOtherSales: Decimal;
  totalRefunds: Decimal;
  ordersCount: number;
}
