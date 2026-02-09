// Customers Entities
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md
// Aligned with: prisma/schema.prisma

import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

// ==================== CUSTOMER ====================

export interface Customer {
  id: string;
  code: string;

  // Basic info - Matches schema
  nameAr: string; // Required in schema
  nameEn: string; // Required in schema
  phone?: string | null; // Optional in schema
  email?: string | null;

  // Loyalty - Matches schema
  loyaltyPoints: number;
  loyaltyTier: string; // BRONZE, SILVER, GOLD, PLATINUM

  // Stats - Matches schema
  totalSpent: Decimal | number; // Decimal in DB
  visitsCount: number; // Matches schema
  lastVisit?: Date | null; // Matches schema

  // Custom fields
  customFields?: any; // JSON in DB

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  isActive: boolean;

  // Backward-compatible aliases
  name?: string; // Alias for nameEn
  orderCount?: number; // Alias for visitsCount
  lastOrderAt?: Date | null; // Alias for lastVisit
  tierId?: string | null; // Alias for loyaltyTier
  preferredLanguage?: string; // Not in schema
  notes?: string | null; // Not in schema
}

export interface CustomerWithTier extends Customer {
  tier?: LoyaltyTier | null;
  addresses?: CustomerAddress[];
}

// ==================== CUSTOMER ADDRESS ====================
// Note: CustomerAddress model not in current schema

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  street: string;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  city: string;
  district: string;
  latitude?: Decimal | number | null;
  longitude?: Decimal | number | null;
  instructions?: string | null;
  isDefault: boolean;
}

// ==================== LOYALTY TIER ====================
// Note: LoyaltyTier model not in current schema - using string values in Customer

export interface LoyaltyTier {
  id: string;
  name: string;
  nameAr: string;
  minSpent: Decimal | number;
  minOrders: number;
  pointsMultiplier: Decimal | number;
  discountPercent: Decimal | number;
  color: string;
  icon?: string | null;
  displayOrder: number;
  isActive: boolean;
}
