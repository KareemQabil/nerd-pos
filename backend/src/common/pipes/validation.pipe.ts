// Validation Pipe Configuration
// Source: FINAL/BACKEND/01-MODULE-STRUCTURE.md

import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

export const validationPipeOptions: ValidationPipeOptions = {
    whitelist: true, // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error for extra properties
    transform: true, // Auto-transform payloads to DTO instances
    transformOptions: {
        enableImplicitConversion: true,
    },
};

export const createValidationPipe = () => new ValidationPipe(validationPipeOptions);
