// Product, Category, and Modifier Entities
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma

// ==================== PRODUCT ====================

export interface Product {
  id: string;
  sku: string;
  barcode?: string | null;
  nameAr: string; // Matches schema
  nameEn: string; // Matches schema
  descriptionAr?: string | null; // Matches schema
  descriptionEn?: string | null; // Matches schema
  categoryId: string;
  price: number; // Decimal in DB
  cost: number; // Decimal in DB, default 0
  taxCategory: string; // STANDARD | ZERO_RATED | EXEMPT
  unitOfMeasure: string; // PIECE, KG, etc.
  trackInventory: boolean; // Matches schema (not trackStock)
  allowNegativeStock: boolean; // Matches schema
  hasModifiers: boolean;
  replenishmentMethod: string; // BUY | MAKE_TO_ORDER | MAKE_TO_STOCK
  kitchenStationId?: string | null;
  incomeAccountId?: string | null;
  expenseAccountId?: string | null;
  preparationTimeMinutes?: number | null;
  imageUrl?: string | null;
  colorCode?: string | null;
  isActive: boolean;
  customFields?: any;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== CATEGORY ====================

export interface Category {
  id: string;
  parentId?: string | null;
  nameAr: string; // Matches schema
  nameEn: string; // Matches schema
  imageUrl?: string | null;
  sortOrder: number; // Matches schema (not displayOrder)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== MODIFIER GROUP ====================

export interface ModifierGroup {
  id: string;
  nameAr: string; // Matches schema
  nameEn: string; // Matches schema
  selectionType: string; // SINGLE, MULTI
  isRequired: boolean;
  minSelections: number;
  maxSelections?: number | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ModifierOption {
  id: string;
  groupId: string; // Matches schema
  nameAr: string; // Matches schema
  nameEn: string; // Matches schema
  price: number; // Decimal
  sortOrder: number;
  isActive: boolean;
}

export interface ProductModifierGroup {
  productId: string;
  groupId: string;
}

// ==================== RESPONSE TYPES ====================

export interface ProductWithRelations extends Product {
  category?: Category;
  modifierGroups?: ModifierGroupWithOptions[];
  inventoryItems?: any[];
}

export interface ModifierGroupWithOptions extends ModifierGroup {
  options: ModifierOption[];
}

export interface CategoryWithProducts extends Category {
  products?: Product[];
  children?: Category[];
  parent?: Category | null;
}
