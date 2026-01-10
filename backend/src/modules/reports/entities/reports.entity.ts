// Reports Entities
export interface ReportDefinition {
    id: string;
    type: string;
    name: string;
    nameAr: string;
    query?: any;
    parameters?: any;
    schedule?: string | null;
    lastRunAt?: Date | null;
    format: 'PDF' | 'EXCEL' | 'CSV';
    roleIds: string[];
    isActive: boolean;
    createdAt: Date;
    createdBy: string;
}

export interface ReportExecution {
    id: string;
    reportId: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    startedAt: Date;
    completedAt?: Date | null;
    parameters?: any;
    filePath?: string | null;
    error?: string | null;
    executedBy: string;
}
