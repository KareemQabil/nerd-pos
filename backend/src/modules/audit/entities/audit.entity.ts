// Audit Entities
export interface AuditLog {
    id: string;
    userId: string;
    username: string;
    module: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VOID';
    entity: string;
    entityId: string;
    before?: any;
    after?: any;
    changes?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
    endpoint?: string | null;
    method?: string | null;
    success: boolean;
    errorMessage?: string | null;
    sessionId?: string | null;
    businessDate: Date;
    createdAt: Date;
}
