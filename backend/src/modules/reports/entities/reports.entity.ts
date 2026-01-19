// Reports Entities
// Source: FINAL/BACKEND/16-MODULE-REPORTS.md
// Aligned with: prisma/schema.prisma

// ==================== REPORT ====================

export interface Report {
  id: string;
  type: string; // SALES, INVENTORY, FINANCIAL, CUSTOM
  name: string;
  nameAr: string;
  query: any; // SQL or query builder JSON
  parameters?: any | null;
  schedule?: string | null; // CRON expression
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  roleIds: string[];
  format: string; // PDF, EXCEL, CSV
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Backward-compatible alias
export type ReportDefinition = Report;

// ==================== REPORT EXECUTION ====================

export interface ReportExecution {
  id: string;
  reportId: string;
  status: string; // PENDING, RUNNING, COMPLETED, FAILED
  startedAt: Date;
  completedAt?: Date | null;
  parameters?: any | null;
  filePath?: string | null;
  fileSize?: number | null;
  error?: string | null;
  executedBy: string;
}
