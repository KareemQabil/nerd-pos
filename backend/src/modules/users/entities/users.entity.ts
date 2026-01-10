// Users Entities
// Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md

// ==================== USER ====================

export interface User {
    id: string;
    username: string;
    email?: string | null;

    // Authentication (not sent to client)
    passwordHash: string;
    pin?: string | null; // 4-6 digit PIN for quick auth

    // Profile
    firstName: string;
    lastName: string;
    phone?: string | null;

    // Role
    roleId: string;

    // Session tracking
    currentSessionId?: string | null;

    // Status
    isActive: boolean;
    lastLoginAt?: Date | null;

    // Audit
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
}

export interface UserProfile {
    id: string;
    username: string;
    email?: string | null;
    firstName: string;
    lastName: string;
    phone?: string | null;
    roleId: string;
    roleName: string;
    isActive: boolean;
}

// ==================== ROLE ====================

export interface Role {
    id: string;
    name: string; // ADMIN, MANAGER, CASHIER, WAITER, KITCHEN_STAFF
    nameAr: string;
    description?: string | null;

    // Hierarchy
    level: number; // 1=ADMIN, 2=MANAGER, 3=CASHIER, 4=WAITER, 5=KITCHEN

    isSystem: boolean; // System roles cannot be deleted
    isActive: boolean;

    createdAt: Date;
    updatedAt: Date;
}

export interface RoleWithPermissions extends Role {
    permissions: Permission[];
}

// ==================== PERMISSION ====================

export interface Permission {
    id: string;
    code: string; // "sales.create", "inventory.adjust"
    name: string;
    nameAr: string;
    description?: string | null;

    // Grouping
    module: string; // "sales", "inventory", "settings"
    section?: string | null;

    createdAt: Date;
}

// ==================== AUTH ====================

export interface AuthResult {
    token: string;
    user: UserProfile;
}

export interface AuthenticationLog {
    id: string;
    userId: string;

    method: 'PASSWORD' | 'PIN';
    success: boolean;
    failureReason?: string | null;

    ipAddress?: string | null;
    userAgent?: string | null;

    createdAt: Date;
}
