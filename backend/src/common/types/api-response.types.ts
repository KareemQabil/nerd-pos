export interface ApiError {
  messageKey: string;
  messageEn: string;
  messageAr: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}
