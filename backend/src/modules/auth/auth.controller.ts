/**
 * Auth Controller
 *
 * Handles authentication endpoints: login, logout, profile.
 * Login sets JWT in HTTP-only cookie for seamless Swagger testing.
 * Login is marked @Public() - no authentication required.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';
import { LoginDto } from '../users/dto';
import { examples } from '../../common/fixtures/swagger-examples';

@ApiTags('Auth')
@ApiBearerAuth('JWT')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * Login endpoint - public (no token required)
   * Sets JWT in HTTP cookie for seamless Swagger testing
   * POST /auth/login
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @Post('login')
  @ApiOperation({ summary: 'Login and set auth cookie' })
  @ApiBody({ schema: { example: examples.auth.loginRequest.value } })
  @ApiResponse({ status: 201, description: 'Login successful, cookie set', content: { 'application/json': { example: examples.auth.loginSuccess.value } } })
  @ApiResponse({ status: 401, description: 'Invalid credentials', content: { 'application/json': { example: examples.errors.unauthorizedError.value } } })
  @ApiResponse({ status: 429, description: 'Too many login attempts', content: { 'application/json': { example: examples.errors.rateLimitError.value } } })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const user = await this.authService.validateUser(
        loginDto.username,
        loginDto.password,
      );
      const result = await this.authService.login(user);

      // Set JWT in HTTP cookie (works with Swagger UI!)
      res.cookie('access_token', result.access_token, {
        httpOnly: false, // Allow Swagger to read for display
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      return {
        ...result,
        message: '✅ Login successful! Cookie set. All endpoints will now work.',
      };
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Logout endpoint - clears the auth cookie
   * POST /auth/logout
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 logout attempts per minute
  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear auth cookie' })
  @ApiResponse({ status: 200, description: 'Logout successful', content: { 'application/json': { example: examples.auth.logoutSuccess.value } } })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }

  /**
   * Get current user profile - requires authentication
   * GET /auth/profile
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved', content: { 'application/json': { example: examples.auth.profileResponse.value } } })
  @ApiResponse({ status: 401, description: 'Unauthorized', content: { 'application/json': { example: examples.errors.unauthorizedError.value } } })
  async getProfile(@CurrentUser() user: JwtPayload) {
    return {
      id: user.sub,
      username: user.username,
      role: user.role,
      roleId: user.roleId,
    };
  }
}

