/**
 * Sales helper for E2E tests.
 */

import { AxiosInstance } from 'axios';
import { createApiClient } from '../config/client';
import { CreateOrderDto } from '../../../src/modules/sales/dto';
import { Order } from '../../../src/modules/sales/entities/sales.entity';

export interface HelperResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export class SalesHelper {
    private api: AxiosInstance;

    constructor(token: string) {
        this.api = createApiClient(token);
    }

    async createOrder(dto: CreateOrderDto): Promise<HelperResult<Order>> {
        try {
            const response = await this.api.post<Order>('/orders', dto);
            return { success: true, data: response.data as Order };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    async confirmOrder(orderId: string): Promise<HelperResult<Order>> {
        try {
            const response = await this.api.put<Order>(`/orders/${orderId}/confirm`);
            return { success: true, data: response.data as Order };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}
