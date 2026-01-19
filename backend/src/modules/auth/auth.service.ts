/**
 * Auth Service
 *
 * Handles authentication logic: user validation and JWT generation.
 * Uses UsersService for user lookup and JwtService for token signing.
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './decorators/current-user.decorator';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    username: string;
    nameEn: string;
    nameAr: string;
    role: string;
    roleId?: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials
   * Returns user if valid, throws UnauthorizedException if not
   */
  async validateUser(username: string, password: string) {
    // Use existing login logic from UsersService
    const result = await this.usersService.login(username, password);
    return result.user;
  }

  /**
   * Generate JWT token for authenticated user
   */
  async login(user: {
    id: string;
    username: string;
    role: string;
    roleId?: string | null;
    nameEn: string;
    nameAr: string;
  }): Promise<AuthResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId || user.role,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        nameEn: user.nameEn,
        nameAr: user.nameAr,
        role: user.role,
        roleId: user.roleId || undefined,
      },
    };
  }

  /**
   * Verify JWT and return payload
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
