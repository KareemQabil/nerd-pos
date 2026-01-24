// Audit Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Audit')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) { }

  @Get('entity/:entity/:entityId')
  @Permissions(PERMISSIONS.AUDIT_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get entity audit history', description: 'Returns change history for entity. Manager+ required.' })
  @ApiParam({ name: 'entity', description: 'Entity type (e.g., Order, Product)' })
  @ApiParam({ name: 'entityId', description: 'Entity UUID' })
  @ApiResponse({ status: 200, description: 'Audit history retrieved' })
  async getEntityHistory(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.findByEntity(entity, entityId);
  }

  @Get('user/:userId')
  @Permissions(PERMISSIONS.AUDIT_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get user activity', description: 'Returns audit trail for user. Manager+ required.' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'User activity retrieved' })
  @ApiBadRequestResponse({ description: 'Invalid date format' })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.service.findByUser(userId, new Date(start), new Date(end));
  }

  @Get('module/:module')
  @Permissions(PERMISSIONS.AUDIT_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get module activity', description: 'Returns audit trail for module. Manager+ required.' })
  @ApiParam({ name: 'module', description: 'Module name (e.g., products, sales)' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Module activity retrieved' })
  @ApiBadRequestResponse({ description: 'Invalid date format' })
  async getModuleActivity(
    @Param('module') module: string,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.service.findByModule(module, new Date(start), new Date(end));
  }
}

