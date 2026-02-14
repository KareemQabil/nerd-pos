import { HttpStatus } from '@nestjs/common';
import { ErrorMessageDefinition } from '../constants';
import { AppException } from './app.exception';

export class TooManyRequestsAppException extends AppException {
  constructor(errorMessage: ErrorMessageDefinition, details?: unknown) {
    super(errorMessage, HttpStatus.TOO_MANY_REQUESTS, details);
  }
}
