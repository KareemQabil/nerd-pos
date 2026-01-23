// Audit Controller
// Security: Block 2 - All endpoints secured with @Permissions

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Audit')
@ApiBearerAuth('JWT')
@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) { }

  @Permissions(PERMISSIONS.AUDIT_VIEW) // 🔒 Manager+
  @Get('entity/:entity/:entityId')
  async getEntityHistory(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.findByEntity(entity, entityId);
  }

  @Permissions(PERMISSIONS.AUDIT_VIEW) // 🔒 Manager+
  @Get('user/:userId')
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.service.findByUser(userId, new Date(start), new Date(end));
  }

  @Permissions(PERMISSIONS.AUDIT_VIEW) // 🔒 Manager+
  @Get('module/:module')
  async getModuleActivity(
    @Param('module') module: string,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.service.findByModule(module, new Date(start), new Date(end));
  }
}
