export type ApiErrorPayload = {
  messageKey?: string;
  messageEn?: string;
  messageAr?: string;
  code?: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  result: T | null;
  error: ApiErrorPayload | null;
  data?: T;
};

export function unwrapEnvelope<T>(payload: ApiEnvelope<T> | { data: T }) {
  if (payload && typeof payload === 'object' && 'result' in payload) {
    return payload.result ?? payload.data ?? null;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data ?? null;
  }

  return payload as T;
}
