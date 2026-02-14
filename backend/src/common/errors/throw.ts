import {
  BadRequestAppException,
  ConflictAppException,
  NotFoundAppException,
} from '../exceptions';
import { ErrorMessages, ErrorMessageValue } from '../constants';

export const Throw = {
  notFound(entity: string, criteria?: Record<string, unknown>): never {
    throw new NotFoundAppException(ErrorMessages.NotFound, {
      entity,
      ...(criteria ?? {}),
    });
  },

  badRequest(
    messageKey: ErrorMessageValue = ErrorMessages.BadRequest,
    details?: Record<string, unknown>,
  ): never {
    throw new BadRequestAppException(messageKey, details);
  },

  conflict(details?: Record<string, unknown>): never {
    throw new ConflictAppException(ErrorMessages.Conflict, details);
  },
};
