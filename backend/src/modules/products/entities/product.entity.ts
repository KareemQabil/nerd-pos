// Product, Category, and Modifier Entities
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md

// ==================== PRODUCT ====================

export interface Product {
    id: string;
    sku: string;
    barcode?: string | null;
    name: string;
    nameAr: string;
    description?: string | null;
    descriptionAr?: string | null;
    categoryId: string;
    price: number; // Stored as Decimal in DB
    cost?: number | null;
    taxable: boolean;
    taxCategory: string; // STANDARD | ZERO_RATED | EXEMPT
    trackStock: boolean;
    currentStock: number;
    minStock: number;
    unitOfMeasure: string;
    hasModifiers: boolean;
    replenishmentMethod: string; // BUY | MAKE_TO_ORDER | MAKE_TO_STOCK
    kitchenStationId?: string | null;
    preparationTimeMinutes?: number | null;
    imageUrl?: string | null;
    colorCode?: string | null;
    isActive: boolean;
    isAvailable: boolean;
    customFields?: any;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
}

// ==================== CATEGORY ====================

export interface Category {
    id: string;
    name: string;
    nameAr: string;
    description?: string | null;
    parentId?: string | null;
    displayOrder: number;
    color?: string | null;
    icon?: string | null;
    imageUrl?: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// ==================== MODIFIER ====================

export interface Modifier {
    id: string;
    name: string;
    nameAr: string;
    required: boolean;
    multiSelect: boolean;
    minSelection: number;
    maxSelection?: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ModifierOption {
    id: string;
    modifierId: string;
    name: string;
    nameAr: string;
    price: number; // Decimal
    displayOrder: number;
    isActive: boolean;
}

export interface ProductModifier {
    productId: string;
    modifierId: string;
}

// ==================== RESPONSE TYPES ====================

export interface ProductWithRelations extends Product {
    category?: Category;
    modifiers?: ModifierWithOptions[];
}

export interface ModifierWithOptions extends Modifier {
    options: ModifierOption[];
}

export interface CategoryWithProducts extends Category {
    products?: Product[];
    children?: Category[];
    parent?: Category | null;
}
