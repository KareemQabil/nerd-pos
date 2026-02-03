import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ErrorMessages } from '../constants';
import { ApiResponse } from '../types';
import {
  isApiError,
  isErrorMessageDefinition,
  resolveErrorMessage,
  type ErrorMessageInput,
} from '../utils/error-message.utils';

/**
 * Unified API error envelope
 * Production Cleanup 2026-01-23
 */
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Global HTTP Exception Filter
 * Standardizes error responses across the API using the { data, error } envelope
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let detail = 'An unexpected error occurred';
    let errorPayload: ErrorMessageInput;
    let errorDetails: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;

        // Handle validation errors (class-validator)
        if (Array.isArray(responseObj.message)) {
          const errors: ValidationError[] = responseObj.message.map((msg: any) => {
            if (typeof msg === 'string') {
              return { field: 'unknown', message: msg };
            }
            return {
              field: msg.property || 'unknown',
              message: Object.values(msg.constraints || {}).join(', ') || msg,
              value: msg.value,
            };
          });
          errorPayload = ErrorMessages.ValidationError;
          errorDetails = errors;
        } else {
          detail =
            typeof responseObj.message === 'string'
              ? responseObj.message
              : exception.message;
          if (isErrorMessageDefinition(responseObj) || isApiError(responseObj)) {
            errorPayload = responseObj;
          } else if (
            isErrorMessageDefinition(responseObj.message) ||
            isApiError(responseObj.message)
          ) {
            errorPayload = responseObj.message;
          } else {
            errorPayload = responseObj;
          }
          if (responseObj.message || responseObj.error) {
            errorDetails = {
              message: responseObj.message,
              error: responseObj.error,
            };
          }
        }
      } else {
        detail = exceptionResponse as string;
        errorDetails = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      errorDetails = { message: exception.message };
    }

    // Log error
    this.logger.error(
      `[${status}] ${request.method} ${request.url} - ${detail}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    const apiError = resolveErrorMessage(errorPayload, status, errorDetails);

    const payload: ApiResponse<null> = {
      data: null,
      error: apiError,
    };

    response.status(status).json(payload);
  }
}

