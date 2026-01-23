/**
 * Auth Controller
 *
 * Handles authentication endpoints: login, profile.
 * Login is marked @Public() - no authentication required.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { LoginDto } from '../users/dto';

@ApiTags('Auth')
@ApiBearerAuth('JWT')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * Login endpoint - public (no token required)
   * POST /auth/login
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const user = await this.authService.validateUser(
        loginDto.username,
        loginDto.password,
      );
      return this.authService.login(user);
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Get current user profile - requires authentication
   * GET /auth/profile
   */
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      username: user.username,
      role: user.role,
      roleId: user.roleId,
    };
  }
}
