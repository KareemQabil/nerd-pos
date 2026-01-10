// Customers Entities
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md

// ==================== CUSTOMER ====================

export interface Customer {
    id: string;
    code: string;

    // Basic info
    name: string;
    nameAr?: string | null;
    phone: string;
    email?: string | null;

    // Loyalty
    loyaltyPoints: number;
    tierId?: string | null;

    // Stats
    totalSpent: number;
    orderCount: number;
    lastOrderAt?: Date | null;

    // Preferences
    preferredLanguage: 'en' | 'ar';
    notes?: string | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;

    isActive: boolean;
}

export interface CustomerWithTier extends Customer {
    tier?: LoyaltyTier | null;
    addresses?: CustomerAddress[];
}

// ==================== CUSTOMER ADDRESS ====================

export interface CustomerAddress {
    id: string;
    customerId: string;

    // Address
    label: string; // "Home", "Office"
    street: string;
    building?: string | null;
    floor?: string | null;
    apartment?: string | null;
    city: string;
    district: string;

    // Location
    latitude?: number | null;
    longitude?: number | null;

    // Delivery notes
    instructions?: string | null;

    isDefault: boolean;
}

// ==================== LOYALTY TIER ====================

export interface LoyaltyTier {
    id: string;
    name: string; // "Silver", "Gold", "Platinum"
    nameAr: string;

    // Requirements
    minSpent: number;
    minOrders: number;

    // Benefits
    pointsMultiplier: number; // 1.5x, 2.0x
    discountPercent: number; // 5%, 10%

    // Display
    color: string;
    icon?: string | null;

    displayOrder: number;
    isActive: boolean;
}
