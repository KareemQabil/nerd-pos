// Sessions Controller
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
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
import { ApiResultResponse, ApiErrorResponse } from '../../common/decorators';
import { OpenSessionDto, CloseSessionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ResourceType } from '../auth/guards/ownership.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { examples } from '../../common/fixtures/swagger-examples';
import { ApiBody } from '@nestjs/swagger';

@ApiTags('Sessions')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@ResourceType('session')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  // ==================== SESSION MANAGEMENT ====================

  @Post('open')
  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Cashier+
  @ApiOperation({
    summary: 'Open session',
    description: 'Opens a new cashier session with opening balance',
  })
  @ApiBody({ schema: { example: examples.session.openSessionRequest.value } })
  @ApiResultResponse({
    status: 201,
    description: 'Session opened successfully',
  })
  @ApiResponse({
    status: 201,
    description: 'Session opened successfully',
    content: {
      'application/json': {
        example: examples.session.openSessionSuccess.value,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': { example: examples.errors.unauthorizedError.value },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Validation error',
    content: {
      'application/json': { example: examples.errors.validationError.value },
    },
  })
  async openSession(@Body() dto: OpenSessionDto, @Request() req: any) {
    // Extract userId from authenticated JWT token (not from request body)
    const userId: string = req.user?.id || req.user?.sub;
    return this.service.openSession(dto, userId);
  }

  @Post('close')
  @Permissions(PERMISSIONS.SESSIONS_CLOSE) // 🔒 Manager only
  @ApiOperation({
    summary: 'Close session',
    description:
      'Closes session with closing balance and calculates variance. Manager only.',
  })
  @ApiResultResponse({
    status: 200,
    description: 'Session closed successfully',
  })
  @ApiResponse({
    status: 200,
    description: 'Session closed successfully',
    content: {
      'application/json': {
        example: examples.session.closeSessionSuccess.value,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
    content: {
      'application/json': { example: examples.errors.notFoundError.value },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': { example: examples.errors.unauthorizedError.value },
    },
  })
  async closeSession(@Body() dto: CloseSessionDto) {
    return this.service.closeSession(dto);
  }

  @Get('current/:userId')
  @Permissions(PERMISSIONS.SESSIONS_VIEW) // Cashier+ (own session)
  @ApiOperation({
    summary: 'Get current session',
    description: 'Returns active session for user',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Current session retrieved',
  })
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
  @ApiOperation({
    summary: 'Get session by ID',
    description: 'Returns session details',
  })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResultResponse({ status: 200, description: 'Session found' })
  @ApiResponse({ status: 200, description: 'Session found' })
  @ApiNotFoundResponse({ description: 'Session not found' })
  async getSession(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/details')
  @Permissions(PERMISSIONS.SESSIONS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({
    summary: 'Get session with details',
    description: 'Returns session with orders and payments. Manager+ required.',
  })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResultResponse({ status: 200, description: 'Session with details' })
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
  @ApiOperation({
    summary: 'Get sessions by user',
    description: 'Returns session history for user. Manager+ required.',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResultResponse({ status: 200, description: 'User sessions retrieved' })
  @ApiResponse({ status: 200, description: 'User sessions retrieved' })
  async getSessionsByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }
}
