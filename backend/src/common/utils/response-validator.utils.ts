/**
 * Response Envelope Validator Utilities
 *
 * Validates that API responses conform to the standard envelope format.
 * Used in tests and production-simulation.ts to ensure API consistency.
 *
 * Success Response Format:
 * {
 *   "data": any,
 *   "error": null
 * }
 *
 * Error Response Format:
 * {
 *   "data": null,
 *   "error": {
 *     "messageKey": string,
 *     "messageEn": string,
 *     "messageAr": string,
 *     "details"?: any
 *   }
 * }
 */

import { ApiResponse } from '../types';
import { isApiError } from './error-message.utils';

/**
 * Validates a success response envelope
 * @throws Error if validation fails with detailed message
 */
export function validateSuccessResponse(
  response: unknown,
): asserts response is ApiResponse<unknown> {
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  const r = response as Record<string, unknown>;

  if (!('data' in r)) {
    throw new Error('Response must have a "data" field');
  }

  if (!('error' in r)) {
    throw new Error('Response must have an "error" field');
  }

  if (r.error !== null) {
    throw new Error('Success response must have error: null');
  }
}

/**
 * Validates an error response envelope
 * @throws Error if validation fails with detailed message
 */
export function validateErrorResponse(response: unknown): void {
  if (!response || typeof response !== 'object') {
    throw new Error('Error response must be an object');
  }

  const r = response as Record<string, unknown>;

  if (r.data !== null) {
    throw new Error('Error response must have data: null');
  }

  if (!('error' in r)) {
    throw new Error('Error response must have an "error" field');
  }

  if (!isApiError(r.error)) {
    throw new Error('Error response must include a valid error object');
  }
}

/**
 * Validates any response (success or error)
 * @returns true if valid, throws Error if invalid
 */
export function validateResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  const r = response as Record<string, unknown>;

  if (r.error === null) {
    validateSuccessResponse(response);
  } else {
    validateErrorResponse(response);
  }

  return true;
}

/**
 * Batch validates multiple responses
 * @returns Object with validation results
 */
export function validateResponses(
  responses: Array<{ endpoint: string; response: unknown }>,
): {
  passed: string[];
  failed: Array<{ endpoint: string; error: string }>;
} {
  const result = {
    passed: [] as string[],
    failed: [] as Array<{ endpoint: string; error: string }>,
  };

  for (const { endpoint, response } of responses) {
    try {
      validateResponse(response);
      result.passed.push(endpoint);
    } catch (error) {
      result.failed.push({
        endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}

/**
 * Type guard for success response
 */
export function isSuccessResponse(response: unknown): response is ApiResponse<unknown> {
  try {
    validateSuccessResponse(response);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for error response
 */
export function isErrorResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }
  const r = response as Record<string, unknown>;
  return r.error !== null && isApiError(r.error);
}
