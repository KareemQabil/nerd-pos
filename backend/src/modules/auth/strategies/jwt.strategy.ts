/**
 * JWT Strategy
 * 
 * Passport strategy for validating JWT tokens.
 * Extracts token from Authorization header (Bearer token).
 * 
 * Source: FINAL/BACKEND/14-MODULE-USERS-ROLES.md
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'nerdpos-secret-change-in-production-2026',
        });
    }

    /**
     * Called after JWT signature is verified.
     * Returned value is attached to request.user
     */
    async validate(payload: JwtPayload): Promise<JwtPayload> {
        if (!payload.sub || !payload.username) {
            throw new UnauthorizedException('Invalid token payload');
        }

        return {
            sub: payload.sub,
            username: payload.username,
            roleId: payload.roleId,
            role: payload.role,
        };
    }
}
