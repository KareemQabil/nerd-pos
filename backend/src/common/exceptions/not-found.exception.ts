import { HttpStatus } from '@nestjs/common';
import { ErrorMessageDefinition } from '../constants';
import { AppException } from './app.exception';

export class NotFoundAppException extends AppException {
  constructor(errorMessage: ErrorMessageDefinition, details?: unknown) {
    super(errorMessage, HttpStatus.NOT_FOUND, details);
  }
}
