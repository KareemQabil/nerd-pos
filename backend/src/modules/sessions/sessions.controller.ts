// Sessions Controller
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { OpenSessionDto, CloseSessionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) { }

  // ==================== SESSION MANAGEMENT ====================

  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Cashier+
  @Post('open')
  async openSession(@Body() dto: OpenSessionDto) {
    return this.service.openSession(dto);
  }

  @Permissions(PERMISSIONS.SESSIONS_CLOSE) // 🔒 Manager only
  @Post('close')
  async closeSession(@Body() dto: CloseSessionDto) {
    return this.service.closeSession(dto);
  }

  @Permissions(PERMISSIONS.SESSIONS_VIEW) // Cashier+ (own session)
  @Get('current/:userId')
  async getCurrentSession(@Param('userId') userId: string) {
    return this.service.getCurrentSession(userId);
  }

  @Permissions(PERMISSIONS.SESSIONS_VIEW) // Cashier+ (own session)
  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Permissions(PERMISSIONS.SESSIONS_VIEW_ALL) // 🔒 Manager+
  @Get(':id/details')
  async getSessionWithDetails(@Param('id') id: string) {
    return this.service.findByIdWithDetails(id);
  }

  @Permissions(PERMISSIONS.SESSIONS_VIEW_ALL) // 🔒 Manager+
  @Get('user/:userId')
  async getSessionsByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }
}
