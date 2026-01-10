// Discounts Entities
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md

// ==================== DISCOUNT ====================

export interface Discount {
    id: string;
    code: string;
    name: string;
    nameAr: string;
    description?: string | null;

    // Type
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;

    // Conditions
    minOrderAmount?: number | null;
    maxDiscount?: number | null; // Cap for percentage discounts

    // Applicability
    applicableOn: 'ORDER' | 'CATEGORY' | 'PRODUCT';
    categoryIds?: string[];
    productIds?: string[];

    // Time-based rules
    startDate?: Date | null;
    endDate?: Date | null;
    startTime?: string | null; // "18:00" (HH:mm)
    endTime?: string | null; // "20:00"
    daysOfWeek?: number[]; // [0-6] where 0=Sunday

    // Corporate
    isCorporate: boolean;
    corporateIds?: string[]; // Customer IDs eligible

    // Authorization
    requiresApproval: boolean;
    approvalThreshold?: number | null;

    // Usage limits
    maxUses?: number | null;
    usedCount: number;
    maxUsesPerCustomer?: number | null;

    // Status
    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
}

// ==================== DISCOUNT USAGE ====================

export interface DiscountUsage {
    id: string;
    discountId: string;

    // Order reference
    orderId: string;

    // Customer
    customerId?: string | null;

    // Applied discount
    discountAmount: number;
    orderTotal: number;

    // Authorization
    approvedBy?: string | null;
    approvedAt?: Date | null;

    appliedAt: Date;
    appliedBy: string;
}

// ==================== VALIDATION RESULT ====================

export interface DiscountValidationResult {
    valid: boolean;
    amount: number;
    requiresApproval: boolean;
    message?: string;
}
