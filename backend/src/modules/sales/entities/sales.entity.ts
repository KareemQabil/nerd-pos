// Sales Entities
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Aligned with: prisma/schema.prisma

// ==================== SALES ORDER ====================

export interface SalesOrder {
  id: string;
  orderNumber: string;
  orderType: string; // DINE_IN, TAKEAWAY, DELIVERY
  orderDate: Date;
  businessDate: Date;

  // Aliases for compatibility (orderType used in code as type)
  type?: string; // Alias for orderType

  // Customer & Table (not in base schema but needed by service)
  customerId?: string | null;
  tableId?: string | null;
  guestCount?: number | null;

  // 7-Step Calculation Results
  itemSubtotal: number; // Decimal in DB
  serviceChargeRate: number; // Decimal in DB (0.15 = 15%)
  serviceChargeAmount: number; // Decimal in DB
  serviceCharge?: number; // Alias for serviceChargeAmount
  serviceChargePercent?: number; // Alias for serviceChargeRate
  deliveryCharge: number; // Decimal in DB
  subtotalBeforeTax: number; // Decimal in DB
  taxRate: number; // Decimal in DB (0.15 = 15%)
  taxAmount: number; // Decimal in DB
  taxPercent?: number; // Alias for taxRate
  discountAmount: number; // Decimal in DB
  discountCode?: string | null; // For tracking applied discount
  grandTotal: number; // Decimal in DB
  tipAmount: number; // Decimal in DB
  totalWithTip: number; // Decimal in DB

  // Payment tracking
  paidAmount?: number;
  changeAmount?: number;

  // Status
  status: string; // DRAFT, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED
  paymentStatus: string; // PENDING, PARTIAL, PAID, REFUNDED

  // Notes
  notes?: string | null;

  // Compliance (ZATCA/ETA)
  zatcaUuid?: string | null;
  zatcaHash?: string | null;
  zatcaPreviousHash?: string | null;
  previousHash?: string | null; // Alias for zatcaPreviousHash
  invoiceXML?: string | null;
  qrCode?: string | null;
  etaUuid?: string | null;

  // Metadata
  metadata?: any;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  orderedAt?: Date; // Alias for orderDate

  // Audit
  sessionId?: string | null;
  createdBy?: string;
  syncStrategy?: string;
}

export interface SalesOrderWithItems extends SalesOrder {
  items: OrderItem[];
}

// ==================== ORDER ITEM ====================

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameAr?: string | null; // Matches schema
  productNameEn?: string | null; // Matches schema
  name?: string; // Alias for productNameEn
  nameAr?: string; // Alias for productNameAr
  quantity: number; // Decimal in DB
  unitPrice: number; // Decimal in DB
  price?: number; // Alias for unitPrice
  modifiersAmount: number; // Decimal in DB
  lineTotal: number; // Decimal in DB
  subtotal?: number; // Alias for lineTotal
  costPerUnit: number; // Decimal in DB
  totalCost: number; // Decimal in DB
  notes?: string | null;
  status: string; // NEW, PREPARING, READY
  createdAt: Date;
  modifiers?: OrderItemModifier[];
}

export interface OrderItemModifier {
  id: string;
  orderItemId: string;
  modifierId: string;
  optionId: string;
  name: string;
  price: number;
}

// ==================== CALCULATION CONTEXT ====================

export interface CalculationItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  unitPrice: number;
  quantity: number;
  modifiersAmount?: number;
}

export interface CalculationResult {
  itemSubtotal: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  deliveryCharge: number;
  subtotalBeforeTax: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  tipAmount: number;
  totalWithTip: number;
}

// Backward-compatible aliases for existing code
export type Order = SalesOrder;
export type OrderWithItems = SalesOrderWithItems;

// ==================== CREATE DATA TYPES (for Repository) ====================

export interface CreateOrderData {
  orderNumber: string;
  orderType?: string;
  type?: string; // Alias for orderType
  businessDate?: Date;
  customerId?: string | null;
  tableId?: string | null;
  guestCount?: number;
  sessionId?: string | null;
  createdBy?: string;
  status?: string;
  paymentStatus?: string;
  itemSubtotal?: number;
  serviceChargeRate?: number;
  serviceChargePercent?: number; // Alias for serviceChargeRate
  serviceChargeAmount?: number;
  serviceCharge?: number;
  deliveryCharge?: number;
  subtotalBeforeTax?: number;
  taxRate?: number;
  taxPercent?: number; // Alias for taxRate
  taxAmount?: number;
  discountAmount?: number;
  discountCode?: string | null;
  grandTotal?: number;
  tipAmount?: number;
  totalWithTip?: number;
  notes?: string | null;
  [key: string]: unknown; // Allow additional fields from calculation
}

export interface CreateOrderItemData {
  productId: string;
  productNameAr?: string;
  productNameEn?: string;
  quantity: number;
  unitPrice?: number;
  price?: number; // Alias for unitPrice
  modifiersAmount?: number;
  lineTotal?: number;
  subtotal?: number; // Alias for lineTotal
  costPerUnit?: number;
  totalCost?: number;
  notes?: string | null;
  status?: string;
  modifiers?: CreateModifierData[];
  [key: string]: unknown; // Allow additional DTO fields
}

export interface CreateModifierData {
  modifierId: string;
  optionId: string;
  name: string;
  price: number;
}
