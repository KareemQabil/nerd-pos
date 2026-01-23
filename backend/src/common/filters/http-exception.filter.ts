import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

/**
 * RFC 9457 Problem Details Format
 * https://www.rfc-editor.org/rfc/rfc9457.html
 * Production Cleanup 2026-01-23
 */
export interface ProblemDetails {
  success: boolean;
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  requestId?: string;
  errors?: ValidationError[];
  stack?: string; // Only in development
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Global HTTP Exception Filter
 * Standardizes error responses across the API using RFC 9457 format
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = 'Internal Server Error';
    let detail = 'An unexpected error occurred';
    let errors: ValidationError[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;

        // Handle validation errors (class-validator)
        if (Array.isArray(responseObj.message)) {
          title = 'Validation Error';
          detail = 'One or more validation errors occurred';
          errors = responseObj.message.map((msg: any) => {
            if (typeof msg === 'string') {
              return { field: 'unknown', message: msg };
            }
            return {
              field: msg.property || 'unknown',
              message: Object.values(msg.constraints || {}).join(', ') || msg,
              value: msg.value,
            };
          });
        } else {
          title = responseObj.error || this.getStatusText(status);
          detail = responseObj.message || exception.message;
        }
      } else {
        title = this.getStatusText(status);
        detail = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      detail = exception.message;
      title = exception.name;
    }

    // Log error
    this.logger.error(
      `[${status}] ${request.method} ${request.url} - ${detail}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Build RFC 9457 Problem Details response
    const problemDetails: ProblemDetails = {
      success: false,
      type: `https://httpstatuses.com/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      requestId: (request as any).id || request.headers['x-request-id'] as string,
    };

    // Add validation errors if present
    if (errors && errors.length > 0) {
      problemDetails.errors = errors;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      problemDetails.stack = exception.stack;
    }

    response.status(status).json(problemDetails);
  }

  private getStatusText(status: number): string {
    const statusTexts: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return statusTexts[status] || 'Error';
  }
}

