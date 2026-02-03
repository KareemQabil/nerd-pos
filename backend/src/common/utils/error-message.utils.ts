import {
  ErrorMessageDefinition,
  ErrorMessages,
  ErrorMessageValue,
} from '../constants/error-messages';
import { ApiError } from '../types/api-response.types';

type ErrorKeyLookup = keyof typeof ErrorMessages;

export type ErrorMessageInput =
  | ErrorMessageDefinition
  | ApiError
  | { errorKey: string; details?: unknown }
  | string
  | undefined
  | null
  | unknown;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object';

export const isErrorMessageDefinition = (
  value: unknown,
): value is ErrorMessageDefinition =>
  isRecord(value) &&
  typeof value.key === 'string' &&
  typeof value.messageEn === 'string' &&
  typeof value.messageAr === 'string';

export const isApiError = (value: unknown): value is ApiError =>
  isRecord(value) &&
  typeof value.messageKey === 'string' &&
  typeof value.messageEn === 'string' &&
  typeof value.messageAr === 'string';

const defaultErrorByStatus = (status: number): ErrorMessageValue => {
  switch (status) {
    case 400:
      return ErrorMessages.BadRequest;
    case 401:
      return ErrorMessages.Unauthorized;
    case 403:
      return ErrorMessages.Forbidden;
    case 404:
      return ErrorMessages.NotFound;
    case 409:
      return ErrorMessages.Conflict;
    case 422:
      return ErrorMessages.UnprocessableEntity;
    case 429:
      return ErrorMessages.TooManyRequests;
    default:
      return ErrorMessages.InternalServerError;
  }
};

const getErrorDefinitionByKey = (key: string): ErrorMessageDefinition | undefined => {
  if (key in ErrorMessages) {
    return ErrorMessages[key as ErrorKeyLookup];
  }

  return Object.values(ErrorMessages).find((message) => message.key === key);
};

const toApiError = (
  definition: ErrorMessageDefinition,
  details?: unknown,
): ApiError => ({
  messageKey: definition.key,
  messageEn: definition.messageEn,
  messageAr: definition.messageAr,
  ...(details !== undefined ? { details } : {}),
});

export const resolveErrorMessage = (
  input: ErrorMessageInput,
  status: number,
  fallbackDetails?: unknown,
): ApiError => {
  if (isApiError(input)) {
    return {
      ...input,
      ...(input.details !== undefined || fallbackDetails === undefined
        ? {}
        : { details: fallbackDetails }),
    };
  }

  if (isErrorMessageDefinition(input)) {
    const details = isRecord(input) && 'details' in input ? input.details : undefined;
    return toApiError(input, details ?? fallbackDetails);
  }

  if (isRecord(input) && typeof input.errorKey === 'string') {
    const definition = getErrorDefinitionByKey(input.errorKey);
    if (definition) {
      return toApiError(definition, input.details ?? fallbackDetails);
    }
  }

  if (typeof input === 'string') {
    const definition = getErrorDefinitionByKey(input);
    if (definition) {
      return toApiError(definition, fallbackDetails);
    }
  }

  return toApiError(defaultErrorByStatus(status), fallbackDetails);
};
