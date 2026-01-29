/**
 * Environment Variable Validation Schema
 *
 * Validates all environment variables using Joi schema.
 * Application will fail to start if validation fails.
 *
 * Source: COMPREHENSIVE_DEEP_AUDIT_REPORT.md - Configuration Improvements
 */

import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ==================== NODE ENVIRONMENT ====================
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'staging', 'test')
    .default('development')
    .description('Application environment'),

  PORT: Joi.number()
    .default(3001)
    .min(1)
    .max(65535)
    .description('Server port'),

  // ==================== DATABASE ====================
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .description('PostgreSQL database connection URL'),

  POSTGRES_URL: Joi.string()
    .uri()
    .optional()
    .description('Alternative PostgreSQL URL (for Prisma)'),

  PRISMA_DATABASE_URL: Joi.string()
    .uri()
    .optional()
    .description('Prisma Accelerate URL (optional)'),

  // ==================== JWT ====================
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('JWT secret key (minimum 32 characters)'),

  JWT_EXPIRY: Joi.string()
    .pattern(/^[0-9]+(s|m|h|d|w)$/)
    .default('7d')
    .description('JWT token expiration (e.g., 7d, 24h)'),

  // ==================== CORS ====================
  CORS_ORIGIN: Joi.string()
    .pattern(/^https?:\/\/[^,]+(?:,https?:\/\/[^,]+)*$/)
    .default('http://localhost:3000')
    .description('Comma-separated list of allowed CORS origins'),

  // ==================== LOGGING ====================
  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info')
    .description('Logging level'),

  LOG_FORMAT: Joi.string()
    .valid('json', 'pretty')
    .default('json')
    .description('Log output format'),

  // ==================== FEATURE FLAGS ====================
  ENABLE_SWAGGER: Joi.boolean()
    .default(true)
    .description('Enable Swagger API documentation'),

  ENABLE_METRICS: Joi.boolean()
    .default(false)
    .description('Enable metrics collection'),

  ENABLE_TRACING: Joi.boolean()
    .default(false)
    .description('Enable distributed tracing'),

  // ==================== REDIS (Optional) ====================
  REDIS_URL: Joi.string()
    .uri()
    .optional()
    .description('Redis connection URL'),

  // ==================== ZATCA INTEGRATION (Optional) ====================
  ZATCA_CSID: Joi.string()
    .optional()
    .description('ZATCA Compliance Security ID'),

  ZATCA_SECRET: Joi.string()
    .optional()
    .description('ZATCA secret key'),

  ZATCA_CERTIFICATE: Joi.string()
    .optional()
    .description('ZATCA certificate (PEM format)'),

  ZATCA_PRIVATE_KEY: Joi.string()
    .optional()
    .description('ZATCA private key (PEM format)'),

  // ==================== ETA INTEGRATION (Optional) ====================
  ETA_CLIENT_ID: Joi.string()
    .optional()
    .description('ETA client ID'),

  ETA_CLIENT_SECRET: Joi.string()
    .optional()
    .description('ETA client secret'),

  ETA_TAX_ID: Joi.string()
    .optional()
    .description('ETA tax ID'),

  // ==================== MONITORING (Optional) ====================
  SENTRY_DSN: Joi.string()
    .uri()
    .optional()
    .description('Sentry DSN for error tracking'),

  NEW_RELIC_LICENSE_KEY: Joi.string()
    .optional()
    .description('New Relic license key'),
});
