import axios, { AxiosError } from 'axios';
import { env } from '../config/env';
import { unwrapEnvelope } from './envelope';
import type { AppError } from '../types/api';

const baseURL = `${env.apiBaseUrl}${env.apiPrefix}`;

export const http = axios.create({
  baseURL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  const requestId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  config.headers = config.headers ?? {};
  config.headers['X-Client-App'] = 'nerdpos-web';
  config.headers['X-Client-Version'] = 'foundation';
  config.headers['X-Request-Id'] = requestId;
  return config;
});

http.interceptors.response.use(
  (response) => {
    if (response?.data && typeof response.data === 'object') {
      if ('result' in response.data || 'data' in response.data) {
        return { ...response, data: unwrapEnvelope(response.data) };
      }
    }

    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status;
    const payload = (error.response?.data ?? {}) as Record<string, unknown>;

    const appError: AppError = {
      kind: 'UNKNOWN',
      status,
      code: typeof payload?.code === 'string' ? payload.code : undefined,
      message:
        (typeof payload?.messageEn === 'string' && payload.messageEn) ||
        error.message ||
        'Unexpected error',
      details: payload?.details,
      requestId: (payload?.requestId as string | undefined) ?? undefined,
      retryable: !status || status >= 500,
    };

    if (!status) {
      appError.kind = 'NETWORK';
    } else if (status === 401) {
      appError.kind = 'AUTH';
    } else if (status === 403) {
      appError.kind = 'RBAC';
    } else if (status === 422) {
      appError.kind = 'VALIDATION';
    } else if (status === 409) {
      appError.kind = 'CONFLICT';
    }

    return Promise.reject(appError);
  },
);
