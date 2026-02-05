/**
 * E2E Test API Client
 *
 * Axios-based HTTP client with authentication, response unwrapping,
 * and consistent error handling for E2E tests.
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { ENV, logFail } from './env';

export interface ApiResponse<T = unknown> {
    success?: boolean;
    data?: T | { data?: T };
    statusCode?: number;
    message?: string;
    error?: string;
}

export interface TestResult {
    id: string;
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
    details?: Record<string, unknown>;
}

export interface TestContext {
    api: AxiosInstance;
    tokens: Record<string, string>;
    ids: Record<string, string>;
    data: Record<string, unknown>;
}

function unwrapData<T>(payload: ApiResponse<T> | T): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
        const dataField = (payload as ApiResponse<T>).data;
        if (dataField && typeof dataField === 'object' && 'data' in dataField) {
            return (dataField as { data?: T }).data as T;
        }
        if (dataField !== undefined) {
            return dataField as T;
        }
    }

    return payload as T;
}

function messageFromResponse<T>(response: AxiosResponse<ApiResponse<T>>): string {
    const body = response.data;

    if (typeof body === 'string') return body;
    if (body?.message) return body.message;
    if (body?.error) return body.error;

    return `HTTP ${response.status}`;
}

function messageFromError(error: AxiosError<ApiResponse>): string {
    if (error.response) return messageFromResponse(error.response);
    return error.message || 'Unknown error';
}

export function createApiClient(token?: string): AxiosInstance {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const client = axios.create({
        baseURL: ENV.BASE_URL,
        timeout: 15000,
        headers,
        validateStatus: () => true,
    });

    client.interceptors.response.use(
        (response) => {
            if (response.status >= 200 && response.status < 300) {
                response.data = unwrapData(response.data as ApiResponse<unknown> | unknown);
                return response;
            }

            return Promise.reject(new Error(messageFromResponse(response)));
        },
        (error: AxiosError<ApiResponse>) => Promise.reject(new Error(messageFromError(error))),
    );

    return client;
}

export async function checkBackendHealth(): Promise<boolean> {
    try {
        const healthUrl = ENV.BASE_URL.replace('/api/v1', '') + '/health';
        console.log(`🔎 Pinging backend at ${healthUrl}`);
        const response = await axios.get(healthUrl, {
            timeout: 5000,
            validateStatus: () => true,
        });
        console.log(`🔎 Health response status: ${response.status}`);

        // 200 = healthy, 404 = endpoint not configured but server running
        return response.status === 200 || response.status === 404;
    } catch (error) {
        const err = error as AxiosError;
        console.log(`🔎 Health check error: ${err.message}`);

        if (err.code === 'ECONNREFUSED') {
            logFail(`Backend not responding at ${ENV.BASE_URL}`);
            logFail('Run: npm run start:dev');
        } else {
            logFail(`Connection error: ${err.message}`);
        }

        return false;
    }
}

export async function initTestContext(adminToken: string, adminId: string): Promise<TestContext> {
    return {
        api: createApiClient(adminToken),
        tokens: { admin: adminToken },
        ids: { adminId },
        data: {},
    };
}
