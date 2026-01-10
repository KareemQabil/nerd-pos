// Kitchen Entities
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md

// ==================== KITCHEN STATION ====================

export interface KitchenStation {
    id: string;
    name: string; // "Grill", "Fry", "Salad", "Drinks"
    nameAr: string;

    // Display
    color: string;
    displayOrder: number;

    // Categories routed to this station
    categoryIds: string[];

    isActive: boolean;
}

// ==================== KITCHEN TICKET ====================

export interface KitchenTicket {
    id: string;
    ticketNumber: string;

    // Order reference
    orderId: string;

    // Station
    stationId: string;

    // Timing
    receivedAt: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;

    // Priority (higher = more urgent)
    priority: number;

    // Status
    status: 'NEW' | 'PREPARING' | 'READY' | 'COMPLETED';
}

export interface KitchenTicketWithItems extends KitchenTicket {
    items: KitchenTicketItem[];
    station: KitchenStation;
}

// ==================== KITCHEN TICKET ITEM ====================

export interface KitchenTicketItem {
    id: string;
    ticketId: string;

    // Product
    productId: string;
    productName: string;
    productNameAr: string;

    quantity: number;
    notes?: string | null;

    // Modifiers (e.g., "No Onions", "Extra Cheese")
    modifiers?: string[] | null;

    status: 'NEW' | 'PREPARING' | 'READY';
}

// ==================== KDS SUMMARY ====================

export interface KDSSummary {
    stationId: string;
    stationName: string;
    newCount: number;
    preparingCount: number;
    readyCount: number;
    avgPrepTime: number; // minutes
}
