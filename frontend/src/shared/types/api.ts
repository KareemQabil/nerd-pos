export type AppErrorKind =
  | 'AUTH'
  | 'RBAC'
  | 'VALIDATION'
  | 'NETWORK'
  | 'CONFLICT'
  | 'UNKNOWN';

export type AppError = {
  kind: AppErrorKind;
  status?: number;
  code?: string;
  message: string;
  details?: unknown;
  requestId?: string;
  retryable?: boolean;
};
