import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorMessageDefinition } from '../constants';
import { ApiError } from '../types';

export class AppException extends HttpException {
  readonly errorMessage: ErrorMessageDefinition;
  readonly details?: unknown;

  constructor(
    errorMessage: ErrorMessageDefinition,
    status: number = HttpStatus.BAD_REQUEST,
    details?: unknown,
  ) {
    const payload: ApiError = {
      messageKey: errorMessage.key,
      messageEn: errorMessage.messageEn,
      messageAr: errorMessage.messageAr,
      ...(details !== undefined ? { details } : {}),
    };

    super(payload, status);
    this.errorMessage = errorMessage;
    this.details = details;
  }
}
