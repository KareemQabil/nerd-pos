// Settings Controller
// Source: FINAL/BACKEND/11-MODULE-SETTINGS.md
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  UpdateStoreSettingsDto,
  CreateTaxSettingDto,
  UpdateTaxSettingDto,
  CreatePOSTerminalDto,
  UpdateModuleSettingDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) { }

  // ==================== STORE SETTINGS ====================

  @Permissions(PERMISSIONS.SETTINGS_VIEW) // 🔒 Manager+
  @Get('store')
  async getStoreSettings() {
    return this.service.getStoreSettings();
  }

  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @Put('store')
  async updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
    return this.service.updateStoreSettings(dto);
  }

  // ==================== TAX SETTINGS ====================

  @Permissions(PERMISSIONS.SETTINGS_TAX_VIEW) // Manager+
  @Get('taxes')
  async getTaxSettings() {
    return this.service.getTaxSettings();
  }

  @Permissions(PERMISSIONS.SETTINGS_TAX_VIEW) // Manager+
  @Get('taxes/default')
  async getDefaultTax() {
    return this.service.getDefaultTax();
  }

  @Permissions(PERMISSIONS.SETTINGS_TAX_MANAGE) // 🔒 Admin only
  @Post('taxes')
  async createTaxSetting(@Body() dto: CreateTaxSettingDto) {
    return this.service.createTaxSetting(dto);
  }

  @Permissions(PERMISSIONS.SETTINGS_TAX_MANAGE) // 🔒 Admin only
  @Put('taxes/:id')
  async updateTaxSetting(
    @Param('id') id: string,
    @Body() dto: UpdateTaxSettingDto,
  ) {
    return this.service.updateTaxSetting(id, dto);
  }

  // ==================== POS TERMINALS ====================

  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_VIEW) // Manager+
  @Get('terminals')
  async getAllTerminals() {
    return this.service.getAllTerminals();
  }

  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_VIEW) // Manager+
  @Get('terminals/:code')
  async getTerminalByCode(@Param('code') code: string) {
    return this.service.getTerminalByCode(code);
  }

  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_MANAGE) // 🔒 Admin only
  @Post('terminals')
  async registerTerminal(@Body() dto: CreatePOSTerminalDto) {
    return this.service.registerTerminal(dto);
  }

  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_MANAGE) // 🔒 Admin only
  @Put('terminals/:id')
  async updateTerminal(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePOSTerminalDto>,
  ) {
    return this.service.updateTerminal(id, dto);
  }

  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Cashier+ (terminal heartbeat)
  @Post('terminals/:code/heartbeat')
  async heartbeat(@Param('code') code: string) {
    await this.service.heartbeat(code);
    return { success: true };
  }

  // ==================== MODULE SETTINGS ====================

  @Permissions(PERMISSIONS.SETTINGS_MODULE_VIEW) // Manager+
  @Get('modules/:module')
  async getModuleSettings(@Param('module') module: string) {
    return this.service.getModuleSettings(module);
  }

  @Permissions(PERMISSIONS.SETTINGS_MODULE_MANAGE) // 🔒 Admin only
  @Put('modules/:module')
  async updateModuleSettings(
    @Param('module') module: string,
    @Body() config: any,
  ) {
    return this.service.updateModuleSettings(module, config);
  }
}
