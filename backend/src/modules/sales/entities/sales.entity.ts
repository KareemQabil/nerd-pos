// Sales Entities
// Source: FINAL/BACKEND/05-MODULE-SALES.md
// Aligned with: prisma/schema.prisma
// Type-safe: Using Prisma's Decimal type

import { Prisma } from '@prisma/client';

// Re-export Decimal type for convenience
export type Decimal = Prisma.Decimal;

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
  itemSubtotal: Decimal;
  serviceChargeRate: Decimal;
  serviceChargeAmount: Decimal;
  serviceCharge?: Decimal; // Alias for serviceChargeAmount
  serviceChargePercent?: Decimal; // Alias for serviceChargeRate
  deliveryCharge: Decimal;
  subtotalBeforeTax: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  taxPercent?: Decimal; // Alias for taxRate
  discountAmount: Decimal;
  discountCode?: string | null; // For tracking applied discount
  grandTotal: Decimal;
  tipAmount: Decimal;
  totalWithTip: Decimal;

  // Payment tracking
  paidAmount?: Decimal;
  changeAmount?: Decimal;

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
  orderedAt?: Date | null; // Alias for orderDate

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
  quantity: Decimal;
  unitPrice: Decimal;
  price?: Decimal; // Alias for unitPrice
  modifiersAmount: Decimal;
  lineTotal: Decimal;
  subtotal?: Decimal; // Alias for lineTotal
  costPerUnit: Decimal;
  totalCost: Decimal;
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
  price: Decimal;
}

// ==================== CALCULATION CONTEXT ====================

export interface CalculationItem {
  productId: string;
  productNameEn: string;
  productNameAr: string;
  unitPrice: Decimal | number;
  quantity: Decimal | number;
  modifiersAmount?: Decimal | number;
}

export interface CalculationResult {
  itemSubtotal: Decimal;
  serviceChargeRate: Decimal;
  serviceChargeAmount: Decimal;
  deliveryCharge: Decimal;
  subtotalBeforeTax: Decimal;
  taxRate: Decimal;
  taxAmount: Decimal;
  discountAmount: Decimal;
  grandTotal: Decimal;
  tipAmount: Decimal;
  totalWithTip: Decimal;
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
  itemSubtotal?: Decimal;
  serviceChargeRate?: Decimal;
  serviceChargePercent?: Decimal; // Alias for serviceChargeRate
  serviceChargeAmount?: Decimal;
  serviceCharge?: Decimal;
  deliveryCharge?: Decimal;
  subtotalBeforeTax?: Decimal;
  taxRate?: Decimal;
  taxPercent?: Decimal; // Alias for taxRate
  taxAmount?: Decimal;
  discountAmount?: Decimal;
  discountCode?: string | null;
  grandTotal?: Decimal;
  tipAmount?: Decimal;
  totalWithTip?: Decimal;
  notes?: string | null;
  [key: string]: unknown; // Allow additional fields from calculation
}

export interface CreateOrderItemData {
  productId: string;
  productNameAr?: string;
  productNameEn?: string;
  quantity: Decimal;
  unitPrice?: Decimal;
  price?: Decimal; // Alias for unitPrice
  modifiersAmount?: Decimal;
  lineTotal?: Decimal;
  subtotal?: Decimal; // Alias for lineTotal
  costPerUnit?: Decimal;
  totalCost?: Decimal;
  notes?: string | null;
  status?: string;
  modifiers?: CreateModifierData[];
  [key: string]: unknown; // Allow additional DTO fields
}

export interface CreateModifierData {
  modifierId: string;
  optionId: string;
  name: string;
  price: Decimal;
}
