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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import {
  UpdateStoreSettingsDto,
  CreateTaxSettingDto,
  UpdateTaxSettingDto,
  CreatePOSTerminalDto,
  StoreSettingsResponseDto,
  TaxSettingResponseDto,
  TerminalResponseDto,
  HeartbeatResponseDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';

@ApiTags('Settings')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) { }

  // ==================== STORE SETTINGS ====================

  @Get('store')
  @Permissions(PERMISSIONS.SETTINGS_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get store settings', description: 'Returns store configuration. Manager+ required.' })
  @ApiResultResponse({
    status: 200,
    description: 'Store settings retrieved',
    type: StoreSettingsResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Store settings not found' })
  async getStoreSettings() {
    return this.service.getStoreSettings();
  }

  @Put('store')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update store settings', description: 'Updates store configuration. Admin only.' })
  @ApiResultResponse({
    status: 200,
    description: 'Store settings updated',
    type: StoreSettingsResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error' })
  @ApiErrorResponse({ status: 404, description: 'Store settings not found' })
  async updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
    return this.service.updateStoreSettings(dto);
  }

  // ==================== TAX SETTINGS ====================

  @Get('taxes')
  @Permissions(PERMISSIONS.SETTINGS_TAX_VIEW) // Manager+
  @ApiOperation({ summary: 'Get tax settings', description: 'Returns all tax configurations. Manager+ required.' })
  @ApiResultResponse({
    status: 200,
    description: 'Tax settings retrieved',
    type: TaxSettingResponseDto,
    isArray: true,
  })
  async getTaxSettings() {
    return this.service.getTaxSettings();
  }

  @Get('taxes/default')
  @Permissions(PERMISSIONS.SETTINGS_TAX_VIEW) // Manager+
  @ApiOperation({ summary: 'Get default tax', description: 'Returns the default tax rate. Manager+ required.' })
  @ApiResultResponse({
    status: 200,
    description: 'Default tax retrieved',
    type: TaxSettingResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'No default tax configured' })
  async getDefaultTax() {
    return this.service.getDefaultTax();
  }

  @Post('taxes')
  @Permissions(PERMISSIONS.SETTINGS_TAX_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create tax setting', description: 'Creates a new tax rate. Admin only.' })
  @ApiResultResponse({
    status: 201,
    description: 'Tax setting created',
    type: TaxSettingResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error or duplicate tax name' })
  async createTaxSetting(@Body() dto: CreateTaxSettingDto) {
    return this.service.createTaxSetting(dto);
  }

  @Put('taxes/:id')
  @Permissions(PERMISSIONS.SETTINGS_TAX_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update tax setting', description: 'Updates tax rate. Admin only.' })
  @ApiParam({ name: 'id', description: 'Tax Setting UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Tax setting updated',
    type: TaxSettingResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Tax setting not found' })
  async updateTaxSetting(
    @Param('id') id: string,
    @Body() dto: UpdateTaxSettingDto,
  ) {
    return this.service.updateTaxSetting(id, dto);
  }

  // ==================== POS TERMINALS ====================

  @Get('terminals')
  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_VIEW) // Manager+
  @ApiOperation({ summary: 'Get all terminals', description: 'Returns all POS terminals. Manager+ required.' })
  @ApiResultResponse({
    status: 200,
    description: 'Terminals retrieved',
    type: TerminalResponseDto,
    isArray: true,
  })
  async getAllTerminals() {
    return this.service.getAllTerminals();
  }

  @Get('terminals/:code')
  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_VIEW) // Manager+
  @ApiOperation({ summary: 'Get terminal by code', description: 'Returns terminal by code. Manager+ required.' })
  @ApiParam({ name: 'code', description: 'Terminal code' })
  @ApiResultResponse({
    status: 200,
    description: 'Terminal found',
    type: TerminalResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Terminal not found' })
  async getTerminalByCode(@Param('code') code: string) {
    return this.service.getTerminalByCode(code);
  }

  @Post('terminals')
  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Register terminal', description: 'Registers a new POS terminal. Admin only.' })
  @ApiResultResponse({
    status: 201,
    description: 'Terminal registered',
    type: TerminalResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error or terminal code exists' })
  async registerTerminal(@Body() dto: CreatePOSTerminalDto) {
    return this.service.registerTerminal(dto);
  }

  @Put('terminals/:id')
  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update terminal', description: 'Updates terminal configuration. Admin only.' })
  @ApiParam({ name: 'id', description: 'Terminal UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Terminal updated',
    type: TerminalResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Terminal not found' })
  async updateTerminal(
    @Param('id') id: string,
    @Body() dto: Partial<CreatePOSTerminalDto>,
  ) {
    return this.service.updateTerminal(id, dto);
  }

  @Post('terminals/:code/heartbeat')
  @Permissions(PERMISSIONS.SESSIONS_OPEN) // Cashier+ (terminal heartbeat)
  @ApiOperation({ summary: 'Terminal heartbeat', description: 'Updates terminal last-seen timestamp' })
  @ApiParam({ name: 'code', description: 'Terminal code' })
  @ApiResultResponse({
    status: 200,
    description: 'Heartbeat received',
    type: HeartbeatResponseDto,
  })
  async heartbeat(@Param('code') code: string) {
    await this.service.heartbeat(code);
    return { success: true };
  }

  // ==================== MODULE SETTINGS ====================

  @Get('modules/:module')
  @Permissions(PERMISSIONS.SETTINGS_MODULE_VIEW) // Manager+
  @ApiOperation({ summary: 'Get module settings', description: 'Returns configuration for specific module. Manager+ required.' })
  @ApiParam({ name: 'module', description: 'Module name (e.g., kitchen, delivery)' })
  @ApiResultResponse({
    status: 200,
    description: 'Module settings retrieved',
    resultSchema: { type: 'object', additionalProperties: true },
  })
  async getModuleSettings(@Param('module') module: string) {
    return this.service.getModuleSettings(module);
  }

  @Put('modules/:module')
  @Permissions(PERMISSIONS.SETTINGS_MODULE_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update module settings', description: 'Updates module configuration. Admin only.' })
  @ApiParam({ name: 'module', description: 'Module name' })
  @ApiResultResponse({
    status: 200,
    description: 'Module settings updated',
    resultSchema: { type: 'object', additionalProperties: true },
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error' })
  async updateModuleSettings(
    @Param('module') module: string,
    @Body() config: Record<string, unknown>,
  ) {
    return this.service.updateModuleSettings(module, config);
  }
}

