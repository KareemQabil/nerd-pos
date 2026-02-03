/**
 * Response Message Decorator
 * Production Cleanup 2026-01-23
 *
 * Use @ResponseMessage() to set custom success messages on endpoints.
 * Reserved for legacy response message handling.
 *
 * @example
 * @ResponseMessage('Product created successfully')
 * @Post()
 * async create(@Body() dto: CreateProductDto) {
 *   return this.service.create(dto);
 * }
 */

import { SetMetadata } from '@nestjs/common';
import { RESPONSE_MESSAGE_KEY } from '../interceptors/decimal-transform.interceptor';

/**
 * Set a custom success message for an endpoint
 */
export const ResponseMessage = (message: string) =>
    SetMetadata(RESPONSE_MESSAGE_KEY, message);
