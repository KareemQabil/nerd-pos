/**
 * Session helper for E2E tests.
 */

import { AxiosInstance } from 'axios';
import { createApiClient } from '../config/client';
import { OpenSessionDto, CloseSessionDto } from '../../../src/modules/sessions/dto';
import { Session } from '../../../src/modules/sessions/entities/sessions.entity';

export interface HelperResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export class SessionHelper {
    private api: AxiosInstance;

    constructor(token: string) {
        this.api = createApiClient(token);
    }

    async openSession(dto: OpenSessionDto): Promise<HelperResult<Session>> {
        try {
            const response = await this.api.post<Session>('/sessions/open', dto);
            return { success: true, data: response.data as Session };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    async closeSession(dto: CloseSessionDto): Promise<HelperResult<Session>> {
        try {
            const response = await this.api.post<Session>('/sessions/close', dto);
            return { success: true, data: response.data as Session };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}
