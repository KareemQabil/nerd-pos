/**
 * Permissions Decorator
 * 
 * Use @Permissions() to tag endpoints with required permission codes.
 * Works with PermissionsGuard to check DB for user permissions.
 * 
 * @example
 * @Permissions('orders.refund')
 * @Post(':id/refund')
 * async refundOrder() { ... }
 * 
 * @example
 * @Permissions('products.create', 'inventory.manage')
 * @Post()
 * async createProduct() { ... }  // Requires BOTH permissions
 */

import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Mark a route as requiring specific permissions
 * @param permissions - Permission codes required (e.g., 'orders.refund')
 */
export const Permissions = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);
