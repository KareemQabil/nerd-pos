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

@ApiTags('Settings')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) { }

  // ==================== STORE SETTINGS ====================

  @Get('store')
  @Permissions(PERMISSIONS.SETTINGS_VIEW) // 🔒 Manager+
  @ApiOperation({ summary: 'Get store settings', description: 'Returns store configuration. Manager+ required.' })
  @ApiResponse({
    status: 200,
    description: 'Store settings retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'store_1',
          name: 'NerdBased Coffee',
          vatNumber: '300000000000003',
          address: 'Riyadh, KSA',
          currency: 'SAR',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getStoreSettings() {
    return this.service.getStoreSettings();
  }

  @Put('store')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update store settings', description: 'Updates store configuration. Admin only.' })
  @ApiResponse({
    status: 200,
    description: 'Store settings updated',
    schema: {
      example: {
        success: true,
        message: 'Store settings updated',
        data: {
          id: 'store_1',
          name: 'NerdBased Coffee Updated',
          vatNumber: '300000000000003',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
    return this.service.updateStoreSettings(dto);
  }

  // ==================== TAX SETTINGS ====================

  @Get('taxes')
  @Permissions(PERMISSIONS.SETTINGS_TAX_VIEW) // Manager+
  @ApiOperation({ summary: 'Get tax settings', description: 'Returns all tax configurations. Manager+ required.' })
  @ApiResponse({
    status: 200,
    description: 'Tax settings retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'tax_vat',
            name: 'VAT',
            rate: 15.0,
            isDefault: true,
            code: 'VAT_SA',
          },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getTaxSettings() {
    return this.service.getTaxSettings();
  }

  @Get('taxes/default')
  @Permissions(PERMISSIONS.SETTINGS_TAX_VIEW) // Manager+
  @ApiOperation({ summary: 'Get default tax', description: 'Returns the default tax rate. Manager+ required.' })
  @ApiResponse({
    status: 200,
    description: 'Default tax retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'tax_vat',
          rate: 15.0,
          code: 'VAT_SA',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'No default tax configured' })
  async getDefaultTax() {
    return this.service.getDefaultTax();
  }

  @Post('taxes')
  @Permissions(PERMISSIONS.SETTINGS_TAX_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create tax setting', description: 'Creates a new tax rate. Admin only.' })
  @ApiResponse({ status: 201, description: 'Tax setting created' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicate tax name' })
  async createTaxSetting(@Body() dto: CreateTaxSettingDto) {
    return this.service.createTaxSetting(dto);
  }

  @Put('taxes/:id')
  @Permissions(PERMISSIONS.SETTINGS_TAX_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update tax setting', description: 'Updates tax rate. Admin only.' })
  @ApiParam({ name: 'id', description: 'Tax Setting UUID' })
  @ApiResponse({ status: 200, description: 'Tax setting updated' })
  @ApiNotFoundResponse({ description: 'Tax setting not found' })
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
  @ApiResponse({
    status: 200,
    description: 'Terminals retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'term_1',
            code: 'POS-01',
            name: 'Front Counter 1',
            status: 'ONLINE',
            lastSeen: '2026-01-23T12:00:00Z',
          },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getAllTerminals() {
    return this.service.getAllTerminals();
  }

  @Get('terminals/:code')
  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_VIEW) // Manager+
  @ApiOperation({ summary: 'Get terminal by code', description: 'Returns terminal by code. Manager+ required.' })
  @ApiParam({ name: 'code', description: 'Terminal code' })
  @ApiResponse({ status: 200, description: 'Terminal found' })
  @ApiNotFoundResponse({ description: 'Terminal not found' })
  async getTerminalByCode(@Param('code') code: string) {
    return this.service.getTerminalByCode(code);
  }

  @Post('terminals')
  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Register terminal', description: 'Registers a new POS terminal. Admin only.' })
  @ApiResponse({ status: 201, description: 'Terminal registered' })
  @ApiBadRequestResponse({ description: 'Validation error or terminal code exists' })
  async registerTerminal(@Body() dto: CreatePOSTerminalDto) {
    return this.service.registerTerminal(dto);
  }

  @Put('terminals/:id')
  @Permissions(PERMISSIONS.SETTINGS_TERMINAL_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update terminal', description: 'Updates terminal configuration. Admin only.' })
  @ApiParam({ name: 'id', description: 'Terminal UUID' })
  @ApiResponse({ status: 200, description: 'Terminal updated' })
  @ApiNotFoundResponse({ description: 'Terminal not found' })
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
  @ApiResponse({ status: 200, description: 'Heartbeat received' })
  async heartbeat(@Param('code') code: string) {
    await this.service.heartbeat(code);
    return { success: true };
  }

  // ==================== MODULE SETTINGS ====================

  @Get('modules/:module')
  @Permissions(PERMISSIONS.SETTINGS_MODULE_VIEW) // Manager+
  @ApiOperation({ summary: 'Get module settings', description: 'Returns configuration for specific module. Manager+ required.' })
  @ApiParam({ name: 'module', description: 'Module name (e.g., kitchen, delivery)' })
  @ApiResponse({
    status: 200,
    description: 'Module settings retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          kitchen: {
            autoPrint: true,
            alertSound: true,
          },
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getModuleSettings(@Param('module') module: string) {
    return this.service.getModuleSettings(module);
  }

  @Put('modules/:module')
  @Permissions(PERMISSIONS.SETTINGS_MODULE_MANAGE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update module settings', description: 'Updates module configuration. Admin only.' })
  @ApiParam({ name: 'module', description: 'Module name' })
  @ApiResponse({ status: 200, description: 'Module settings updated' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async updateModuleSettings(
    @Param('module') module: string,
    @Body() config: Record<string, unknown>,
  ) {
    return this.service.updateModuleSettings(module, config);
  }
}

