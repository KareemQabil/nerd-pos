export interface ApiError {
  messageKey: string;
  messageEn: string;
  messageAr: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  result: T | null;
  error: ApiError | null;
}
