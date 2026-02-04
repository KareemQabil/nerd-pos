// Sessions Controller
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Post, Body, Param, Request } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import {
  OpenSessionDto,
  CloseSessionDto,
  SessionResponseDto,
  SessionWithDetailsResponseDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { examples } from '../../common/fixtures/swagger-examples';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';

@ApiTags('Sessions')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) { }

  // ==================== SESSION MANAGEMENT ====================

  @Post('open')
  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Cashier+
  @ApiOperation({ summary: 'Open session', description: 'Opens a new cashier session with opening balance' })
  @ApiBody({ schema: { example: examples.session.openSessionRequest.value } })
  @ApiResultResponse({
    status: 201,
    description: 'Session opened successfully',
    type: SessionResponseDto,
  })
  @ApiErrorResponse({ status: 401, description: 'Unauthorized' })
  @ApiErrorResponse({ status: 422, description: 'Validation error' })
  async openSession(@Body() dto: OpenSessionDto, @Request() req: any) {
    // Extract userId from authenticated JWT token (not from request body)
    const userId: string = req.user?.id || req.user?.sub;
    return this.service.openSession(dto, userId);
  }

  @Post('close')
  @Permissions(PERMISSIONS.SESSIONS_CLOSE) // 🔒 Manager only
  @ApiOperation({ summary: 'Close session', description: 'Closes session with closing balance and calculates variance. Manager only.' })
  @ApiResultResponse({
    status: 200,
    description: 'Session closed successfully',
    type: SessionResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Session not found' })
  @ApiErrorResponse({ status: 401, description: 'Unauthorized' })
  async closeSession(@Body() dto: CloseSessionDto) {
    return this.service.closeSession(dto);
  }

  @Get('current/:userId')
  @Permissions(PERMISSIONS.SESSIONS_VIEW) // Cashier+ (own session)
  @ApiOperation({ summary: 'Get current session', description: 'Returns active session for user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Current session retrieved',
    type: SessionResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'No active session for user' })
  async getCurrentSession(@Param('userId') userId: string) {
    return this.service.getCurrentSession(userId);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.SESSIONS_VIEW) // Cashier+ (own session)
  @ApiOperation({ summary: 'Get session by ID', description: 'Returns session details' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResultResponse({ status: 200, description: 'Session found', type: SessionResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Session not found' })
  async getSession(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/details')
  @Permissions(PERMISSIONS.SESSIONS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({ summary: 'Get session with details', description: 'Returns session with orders and payments. Manager+ required.' })
  @ApiParam({ name: 'id', description: 'Session UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Session with details',
    type: SessionWithDetailsResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Session not found' })
  async getSessionWithDetails(@Param('id') id: string) {
    return this.service.findByIdWithDetails(id);
  }

  @Get('user/:userId')
  @Permissions(PERMISSIONS.SESSIONS_VIEW_ALL) // 🔒 Manager+
  @ApiOperation({ summary: 'Get sessions by user', description: 'Returns session history for user. Manager+ required.' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'User sessions retrieved',
    type: SessionResponseDto,
    isArray: true,
  })
  async getSessionsByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }
}

