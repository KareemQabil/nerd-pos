// Discounts Entities
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md
// Aligned with: prisma/schema.prisma (existing models)

// ==================== DISCOUNT ====================

export interface Discount {
  id: string;
  code: string;
  name: string; // Matches schema
  nameAr: string; // Matches schema
  description?: string | null;

  // Type
  type: string; // PERCENTAGE, FIXED_AMOUNT
  value: number; // Decimal in DB

  // Conditions
  minOrderAmount?: number | null; // Decimal in DB
  maxDiscount?: number | null; // Cap for percentage discounts

  // Applicability
  applicableOn: string; // ORDER, CATEGORY, PRODUCT
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

  // Backward-compatible alias
  nameEn?: string; // Alias for name
}

// ==================== DISCOUNT USAGE ====================

export interface DiscountUsage {
  id: string;
  discountId: string;
  orderId: string;
  customerId?: string | null;
  discountAmount: number; // Decimal in DB
  orderTotal: number; // Decimal in DB
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
