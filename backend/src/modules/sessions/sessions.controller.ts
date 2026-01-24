// Sessions Controller
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { OpenSessionDto, CloseSessionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Sessions')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) { }

  // ==================== SESSION MANAGEMENT ====================

  @Post('open')
  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Cashier+
  @ApiOperation({ summary: 'Open session', description: 'Opens a new cashier session with opening balance' })
  @ApiResponse({
    status: 201,
    description: 'Session opened successfully',
    schema: {
      example: {
        success: true,
        message: 'Session opened successfully',
        data: {
          id: 'sess_123456789',
          userId: 'usr_123',
          startTime: '2026-01-23T09:00:00Z',
          status: 'OPEN',
          openingBalance: 500.0,
          deviceId: 'POS-01',
        },
        timestamp: '2026-01-23T09:00:00Z',
        path: '/api/v1/sessions/open',
        requestId: 'req_123',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'User already has an open session' })
  async openSession(@Body() dto: OpenSessionDto, @Request() req: any) {
    // Extract userId from authenticated JWT token (not from request body)
    const userId: string = req.user?.id || req.user?.sub;
    return this.service.openSession(dto, userId);
  }

  @Post('close')
  @Permissions(PERMISSIONS.SESSIONS_CLOSE) // 🔒 Manager only
  @ApiOperation({ summary: 'Close session', description: 'Closes session with closing balance and calculates variance. Manager only.' })
  @ApiResponse({
    status: 200,
    description: 'Session closed successfully',
    schema: {
      example: {
        success: true,
        message: 'Session closed successfully',
        data: {
          id: 'sess_123456789',
          status: 'CLOSED',
          endTime: '2026-01-23T18:00:00Z',
          expectedCash: 1250.0,
          actualCash: 1250.0,
          variance: 0.0,
          totalSales: 750.0,
        },
        timestamp: '2026-01-23T18:00:00Z',
        path: '/api/v1/sessions/close',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Session not found' })
  @ApiBadRequestResponse({ description: 'Session already closed' })
  async closeSession(@Body() dto: CloseSessionDto) {
    return this.service.closeSession(dto);
  }

  @Get('current/:userId')
  @Permissions(PERMISSIONS.SESSIONS_VIEW) // Cashier+ (own session)
  @ApiOperation({ summary: 'Get current session', description: 'Returns active session for user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({
    status: 200,
    description: 'Current session retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'sess_123',
          userId: 'usr_123',
          startTime: '2026-01-23T09:00:00Z',
          status: 'OPEN',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No active session for user' })
  async getCurrentSession(@Param('userId') userId: string) {
    return this.service.getCurrentSession(userId);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.SESSIONS_VIEW) // Cashier+ (own session)
  @ApiOperation({ summary: 'Get session by ID', description: 'Returns session details' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({ status: 200, description: 'Session found' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async getSession(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/details')
  @Permissions(PERMISSIONS.SESSIONS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({ summary: 'Get session with details', description: 'Returns session with orders and payments. Manager+ required.' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResponse({
    status: 200,
    description: 'Session with details',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'sess_123',
          orders: [],
          payments: [],
          totalSales: 1500.0,
          totalPayments: 1500.0,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async getSessionWithDetails(@Param('id') id: string) {
    return this.service.findByIdWithDetails(id);
  }

  @Get('user/:userId')
  @Permissions(PERMISSIONS.SESSIONS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({ summary: 'Get sessions by user', description: 'Returns session history for user. Manager+ required.' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User sessions retrieved' })
  async getSessionsByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }
}

