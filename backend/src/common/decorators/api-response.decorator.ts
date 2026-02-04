import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiErrorDto, ApiResponseEnvelopeDto } from '../dto';

type ResultSchema = Record<string, unknown>;

export interface ApiResultResponseOptions<TModel extends Type<unknown>> {
  status: number;
  description?: string;
  type?: TModel;
  isArray?: boolean;
  resultSchema?: ResultSchema;
}

export interface ApiErrorResponseOptions {
  status: number;
  description?: string;
}

const resolveResultSchema = <TModel extends Type<unknown>>(
  options: ApiResultResponseOptions<TModel>,
): ResultSchema | undefined => {
  if (options.resultSchema) {
    return options.resultSchema;
  }

  if (!options.type) {
    return undefined;
  }

  if (options.isArray) {
    return {
      type: 'array',
      items: { $ref: getSchemaPath(options.type) },
    };
  }

  return { $ref: getSchemaPath(options.type) };
};

export const ApiResultResponse = <TModel extends Type<unknown>>(
  options: ApiResultResponseOptions<TModel>,
) => {
  const resultSchema = resolveResultSchema(options);
  const extraModels: Type<unknown>[] = [ApiResponseEnvelopeDto, ApiErrorDto];

  if (options.type) {
    extraModels.push(options.type);
  }

  return applyDecorators(
    ApiExtraModels(...extraModels),
    ApiResponse({
      status: options.status,
      description: options.description,
      schema: resultSchema
        ? {
            allOf: [
              { $ref: getSchemaPath(ApiResponseEnvelopeDto) },
              { properties: { result: resultSchema } },
            ],
          }
        : { $ref: getSchemaPath(ApiResponseEnvelopeDto) },
    }),
  );
};

export const ApiErrorResponse = (options: ApiErrorResponseOptions) =>
  applyDecorators(
    ApiExtraModels(ApiResponseEnvelopeDto, ApiErrorDto),
    ApiResponse({
      status: options.status,
      description: options.description,
      schema: { $ref: getSchemaPath(ApiResponseEnvelopeDto) },
    }),
  );
