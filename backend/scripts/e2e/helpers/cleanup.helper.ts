/**
 * Cleanup helper for E2E tests.
 */

import { AxiosInstance } from 'axios';
import { createApiClient } from '../config/client';
import { logInfo } from '../config/env';

export class CleanupHelper {
    private api: AxiosInstance;

    constructor(token: string) {
        this.api = createApiClient(token);
    }

    async run(): Promise<void> {
        logInfo('Cleanup not implemented yet.');
    }

    async cleanupAll(): Promise<void> {
        await this.run();
    }
}
