// Audit Controller
import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('entity/:entity/:entityId')
  async getEntityHistory(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.service.findByEntity(entity, entityId);
  }

  @Get('user/:userId')
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.service.findByUser(userId, new Date(start), new Date(end));
  }

  @Get('module/:module')
  async getModuleActivity(
    @Param('module') module: string,
    @Query('startDate') start: string,
    @Query('endDate') end: string,
  ) {
    return this.service.findByModule(module, new Date(start), new Date(end));
  }
}
