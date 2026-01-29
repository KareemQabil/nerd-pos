/**
 * JWT Strategy
 *
 * Passport strategy for validating JWT tokens.
 * Extracts token from cookies (primary) OR Authorization header (fallback).
 * Cookie-based auth enables seamless Swagger testing.
 *
 * Update 2026-01-25: Using ConfigService for validated env vars
 * Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md
 */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../decorators/current-user.decorator';

// Custom extractor: try cookie first, then Bearer header
const cookieOrBearerExtractor = (req: Request): string | null => {
  // Try cookie first (for Swagger/browser)
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  // Fallback to Authorization header (for API clients)
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Called after JWT signature is verified.
   * Returned value is attached to request.user
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.username) {
      throw new Error('Invalid token payload');
    }

    return {
      sub: payload.sub,
      username: payload.username,
      roleId: payload.roleId,
      role: payload.role,
    };
  }
}
