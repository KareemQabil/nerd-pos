import { HttpStatus } from '@nestjs/common';
import { ErrorMessageDefinition } from '../constants';
import { AppException } from './app.exception';

export class BadRequestAppException extends AppException {
  constructor(errorMessage: ErrorMessageDefinition, details?: unknown) {
    super(errorMessage, HttpStatus.BAD_REQUEST, details);
  }
}
