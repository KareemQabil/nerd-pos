/**
 * Inventory helper for E2E tests.
 */

import { AxiosInstance } from 'axios';
import { createApiClient } from '../config/client';
import { ReceiveStockDto } from '../../../src/modules/inventory/dto';

export interface HelperResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface StockLevel {
    quantity: number;
    raw: unknown;
}

export class InventoryHelper {
    private api: AxiosInstance;

    constructor(token: string) {
        this.api = createApiClient(token);
    }

    async checkStock(productId: string, warehouseId: string): Promise<HelperResult<StockLevel>> {
        try {
            const response = await this.api.get(`/inventory/stock/${productId}/${warehouseId}`);
            const raw = response.data as unknown;

            let quantity = 0;
            if (typeof raw === 'number') {
                quantity = raw;
            } else if (typeof raw === 'string') {
                const parsed = parseFloat(raw);
                quantity = Number.isFinite(parsed) ? parsed : 0;
            } else if (raw && typeof raw === 'object') {
                const payload = raw as Record<string, unknown>;
                const direct = payload.quantity;
                const onHand = payload.quantityOnHand;
                const available = payload.availableQuantity ?? payload.available;

                if (typeof direct === 'number') {
                    quantity = direct;
                } else if (typeof direct === 'string') {
                    const parsed = parseFloat(direct);
                    quantity = Number.isFinite(parsed) ? parsed : 0;
                } else if (typeof onHand === 'number') {
                    quantity = onHand;
                } else if (typeof onHand === 'string') {
                    const parsed = parseFloat(onHand);
                    quantity = Number.isFinite(parsed) ? parsed : 0;
                } else if (typeof available === 'number') {
                    quantity = available;
                } else if (typeof available === 'string') {
                    const parsed = parseFloat(available);
                    quantity = Number.isFinite(parsed) ? parsed : 0;
                }
            }

            return { success: true, data: { quantity, raw } };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }

    async receiveStock(dto: ReceiveStockDto): Promise<HelperResult<unknown>> {
        try {
            const response = await this.api.post('/inventory/receive', dto);
            return { success: true, data: response.data as unknown };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}
