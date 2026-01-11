// Kitchen Entities
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md
// Aligned with: prisma/schema.prisma (existing Kitchen models)

// ==================== KITCHEN STATION ====================

export interface KitchenStation {
    id: string;
    name: string;                        // Matches schema (required)
    nameAr: string;                      // Matches schema (required)
    color: string;
    displayOrder: number;                // Matches schema
    isActive: boolean;

    // Backward-compatible aliases
    nameEn?: string;                     // Alias for name
    sortOrder?: number;                  // Alias for displayOrder
    categoryIds?: string[];              // Not in schema but used by service
}

// ==================== KITCHEN TICKET ====================

export interface KitchenTicket {
    id: string;
    ticketNumber: string;
    orderId: string;
    stationId: string;
    priority: number;
    status: string;                      // NEW, PREPARING, READY, COMPLETED
    receivedAt: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;
    createdAt: Date;
}

export interface KitchenTicketWithItems extends KitchenTicket {
    items: KitchenTicketItem[];
    station?: KitchenStation;
}

// ==================== KITCHEN TICKET ITEM ====================

export interface KitchenTicketItem {
    id: string;
    ticketId: string;
    productId: string;
    productName: string;                 // Matches schema (required)
    productNameAr: string;               // Matches schema (required)
    quantity: number;
    notes?: string | null;
    modifiers?: any;                     // JSON in DB
    status: string;                      // NEW, PREPARING, READY
    createdAt: Date;

    // Backward-compatible aliases
    productNameEn?: string;              // Alias for productName
}

// ==================== KDS SUMMARY ====================

export interface KDSSummary {
    stationId: string;
    stationName: string;
    newCount: number;
    preparingCount: number;
    readyCount: number;
    avgPrepTime: number;                 // minutes
}
