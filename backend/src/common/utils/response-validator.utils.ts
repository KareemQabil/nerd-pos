/**
 * Response Envelope Validator Utilities
 *
 * Validates that API responses conform to the standard envelope format.
 * Used in tests and production-simulation.ts to ensure API consistency.
 *
 * Success Response Format:
 * {
 *   "success": true,
 *   "statusCode": number,
 *   "data": any,
 *   "timestamp": string (ISO 8601),
 *   "path": string,
 *   "requestId"?: string
 * }
 *
 * Error Response Format (RFC 9457):
 * {
 *   "success": false,
 *   "type": string (URI),
 *   "title": string,
 *   "status": number,
 *   "detail": string,
 *   "instance": string,
 *   "timestamp": string (ISO 8601),
 *   "errors"?: array
 * }
 */

import { SuccessResponse } from '../interceptors/transform.interceptor';

/**
 * Validates a success response envelope
 * @throws Error if validation fails with detailed message
 */
export function validateSuccessResponse(
  response: unknown,
): asserts response is SuccessResponse {
  if (!response || typeof response !== 'object') {
    throw new Error('Response must be an object');
  }

  const r = response as Record<string, unknown>;

  // Check success field
  if (r.success !== true) {
    throw new Error(`Response must have success: true, got: ${r.success}`);
  }

  // Check statusCode
  if (typeof r.statusCode !== 'number') {
    throw new Error(`Response must have statusCode as number, got: ${typeof r.statusCode}`);
  }

  // Check data field exists
  if (!('data' in r)) {
    throw new Error('Response must have a "data" field');
  }

  // Check timestamp is ISO 8601 string
  if (typeof r.timestamp !== 'string') {
    throw new Error(`Response must have timestamp as string, got: ${typeof r.timestamp}`);
  }

  // Validate ISO 8601 format (basic check)
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!isoRegex.test(r.timestamp)) {
    throw new Error(`Response timestamp must be ISO 8601 format, got: ${r.timestamp}`);
  }

  // Check path field
  if (typeof r.path !== 'string') {
    throw new Error(`Response must have path as string, got: ${typeof r.path}`);
  }

  // requestId is optional
  if (r.requestId !== undefined && typeof r.requestId !== 'string') {
    throw new Error(`Response requestId must be string if present, got: ${typeof r.requestId}`);
  }
}

/**
 * Validates an error response envelope (RFC 9457)
 * @throws Error if validation fails with detailed message
 */
export function validateErrorResponse(response: unknown): void {
  if (!response || typeof response !== 'object') {
    throw new Error('Error response must be an object');
  }

  const r = response as Record<string, unknown>;

  // Check success field
  if (r.success !== false) {
    throw new Error(`Error response must have success: false, got: ${r.success}`);
  }

  // Check type (URI)
  if (typeof r.type !== 'string') {
    throw new Error(`Error response must have type as string (URI), got: ${typeof r.type}`);
  }

  // Check title
  if (typeof r.title !== 'string') {
    throw new Error(`Error response must have title as string, got: ${typeof r.title}`);
  }

  // Check status
  if (typeof r.status !== 'number') {
    throw new Error(`Error response must have status as number, got: ${typeof r.status}`);
  }

  // Check detail
  if (typeof r.detail !== 'string') {
    throw new Error(`Error response must have detail as string, got: ${typeof r.detail}`);
  }

  // Check instance
  if (typeof r.instance !== 'string') {
    throw new Error(`Error response must have instance as string, got: ${typeof r.instance}`);
  }

  // Check timestamp
  if (typeof r.timestamp !== 'string') {
    throw new Error(`Error response must have timestamp as string, got: ${typeof r.timestamp}`);
  }

  // Validate ISO 8601 format
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
  if (!isoRegex.test(r.timestamp)) {
    throw new Error(`Error response timestamp must be ISO 8601 format, got: ${r.timestamp}`);
  }

  // errors array is optional
  if (r.errors !== undefined && !Array.isArray(r.errors)) {
    throw new Error(`Error response errors must be an array if present, got: ${typeof r.errors}`);
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

  if (r.success === true) {
    validateSuccessResponse(response);
  } else if (r.success === false) {
    validateErrorResponse(response);
  } else {
    throw new Error(`Response must have success field as boolean, got: ${r.success}`);
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
export function isSuccessResponse(response: unknown): response is SuccessResponse {
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
  return r.success === false;
}
