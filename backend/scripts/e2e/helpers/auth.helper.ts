/**
 * Authentication helper for E2E tests.
 */

import { AxiosInstance } from 'axios';
import { createApiClient } from '../config/client';
import { USERS } from '../config/env';

interface LoginPayload {
    access_token?: string;
    token?: string;
    user?: { id?: string };
    userId?: string;
}

export interface LoginResult {
    success: boolean;
    token?: string;
    userId?: string;
    error?: string;
}

export class AuthHelper {
    private api: AxiosInstance;

    constructor() {
        this.api = createApiClient();
    }

    async login(username: string, password: string): Promise<LoginResult> {
        try {
            const response = await this.api.post<LoginPayload>('/auth/login', {
                username,
                password,
            });

            const payload = response.data as LoginPayload;
            const token = payload.access_token ?? payload.token;
            const userId = payload.user?.id ?? payload.userId;

            if (!token) {
                return { success: false, error: 'Login response missing access token' };
            }

            return { success: true, token, userId };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    async loginAsAdmin(): Promise<LoginResult> {
        return this.login(USERS.admin.username, USERS.admin.password);
    }

    async loginAsManager(): Promise<LoginResult> {
        return this.login(USERS.manager.username, USERS.manager.password);
    }

    async loginAsCashier(): Promise<LoginResult> {
        return this.login(USERS.cashier.username, USERS.cashier.password);
    }
}
