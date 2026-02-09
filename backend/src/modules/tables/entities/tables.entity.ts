// Tables Entities
// Source: FINAL/BACKEND/12-MODULE-TABLES.md

// ==================== FLOOR ====================

export interface Floor {
  id: string;
  name: string;
  nameAr: string;

  // Display
  displayOrder: number;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface FloorWithTables extends Floor {
  tables: Table[];
}

// ==================== TABLE ====================

export interface Table {
  id: string;
  number: string;
  floorId: string;

  // Configuration
  capacity: number;
  section: string;
  shape: string;

  // Position (for floor plan UI)
  positionX?: number | null;
  positionY?: number | null;

  // Status
  status: string;

  // Current order
  currentOrderId?: string | null;

  // Assigned waiter
  waiterId?: string | null;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface TableWithFloor extends Table {
  floor: Floor;
}

// ==================== TABLE RESERVATION ====================

export interface TableReservation {
  id: string;
  tableId: string;

  // Customer
  customerId?: string | null;
  customerName: string;
  customerPhone: string;

  // Reservation
  reservedFor: Date;
  partySize: number;
  duration: number; // minutes

  // Notes
  specialRequests?: string | null;

  // Status
  status: string;

  createdBy: string;
  createdAt: Date;
}
