// Audit Entities
// Source: FINAL/BACKEND/17-MODULE-AUDIT.md
// Aligned with: prisma/schema.prisma

// ==================== AUDIT LOG ====================

export interface AuditLog {
    id: string;
    userId?: string | null;
    action: string;                      // CREATE, UPDATE, DELETE, VOID
    entityType: string;                  // Matches schema (not 'entity')
    entityId: string;
    oldValues?: any | null;              // Matches schema (not 'before')
    newValues?: any | null;              // Matches schema (not 'after')
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: Date;

    // Backward-compatible aliases
    entity?: string;                     // Alias for entityType
    before?: any | null;                 // Alias for oldValues  
    after?: any | null;                  // Alias for newValues
    username?: string;                   // Not in schema
    module?: string;                     // Not in schema
    changes?: any;                       // Not in schema
    endpoint?: string | null;            // Not in schema
    method?: string | null;              // Not in schema
    success?: boolean;                   // Not in schema
    errorMessage?: string | null;        // Not in schema
    sessionId?: string | null;           // Not in schema
    businessDate?: Date;                 // Not in schema
}

// ==================== COMPLIANCE EVENT ====================
// Note: ComplianceEvent model not in current schema - to be added

export interface ComplianceEvent {
    id: string;
    type: string;                        // ZATCA_SUBMISSION, HASH_CHAIN_BREAK, TAX_AUDIT
    severity: string;                    // INFO, WARNING, ERROR, CRITICAL
    description: string;
    metadata: any;
    resolved: boolean;
    resolvedAt?: Date | null;
    resolvedBy?: string | null;
    resolution?: string | null;
    createdAt: Date;
}
