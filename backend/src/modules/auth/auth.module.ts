/**
 * Auth Module
 * 
 * Central authentication module combining:
 * - JwtStrategy for token validation
 * - JwtAuthGuard for route protection
 * - AuthService for login/token generation
 * - AuthController for auth endpoints
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
    imports: [
        UsersModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'nerdpos-secret-change-in-production-2026',
            signOptions: {
                expiresIn: '7d',
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, PermissionsGuard],
    exports: [AuthService, JwtModule, PermissionsGuard],
})
export class AuthModule { }
