// Sessions Controller
// Source: FINAL/BACKEND/07-MODULE-SESSIONS.md

import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { OpenSessionDto, CloseSessionDto } from './dto';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  // ==================== SESSION MANAGEMENT ====================

  @Post('open')
  async openSession(@Body() dto: OpenSessionDto) {
    return this.service.openSession(dto);
  }

  @Post('close')
  async closeSession(@Body() dto: CloseSessionDto) {
    return this.service.closeSession(dto);
  }

  @Get('current/:userId')
  async getCurrentSession(@Param('userId') userId: string) {
    return this.service.getCurrentSession(userId);
  }

  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/details')
  async getSessionWithDetails(@Param('id') id: string) {
    return this.service.findByIdWithDetails(id);
  }

  @Get('user/:userId')
  async getSessionsByUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }
}
