// Settings Controller
// Source: FINAL/BACKEND/11-MODULE-SETTINGS.md

import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
    UpdateStoreSettingsDto,
    CreateTaxSettingDto,
    UpdateTaxSettingDto,
    CreatePOSTerminalDto,
    UpdateModuleSettingDto,
} from './dto';

@Controller('settings')
export class SettingsController {
    constructor(private readonly service: SettingsService) { }

    // ==================== STORE SETTINGS ====================

    @Get('store')
    async getStoreSettings() {
        return this.service.getStoreSettings();
    }

    @Put('store')
    async updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
        return this.service.updateStoreSettings(dto);
    }

    // ==================== TAX SETTINGS ====================

    @Get('taxes')
    async getTaxSettings() {
        return this.service.getTaxSettings();
    }

    @Get('taxes/default')
    async getDefaultTax() {
        return this.service.getDefaultTax();
    }

    @Post('taxes')
    async createTaxSetting(@Body() dto: CreateTaxSettingDto) {
        return this.service.createTaxSetting(dto);
    }

    @Put('taxes/:id')
    async updateTaxSetting(
        @Param('id') id: string,
        @Body() dto: UpdateTaxSettingDto,
    ) {
        return this.service.updateTaxSetting(id, dto);
    }

    // ==================== POS TERMINALS ====================

    @Get('terminals')
    async getAllTerminals() {
        return this.service.getAllTerminals();
    }

    @Get('terminals/:code')
    async getTerminalByCode(@Param('code') code: string) {
        return this.service.getTerminalByCode(code);
    }

    @Post('terminals')
    async registerTerminal(@Body() dto: CreatePOSTerminalDto) {
        return this.service.registerTerminal(dto);
    }

    @Put('terminals/:id')
    async updateTerminal(
        @Param('id') id: string,
        @Body() dto: Partial<CreatePOSTerminalDto>,
    ) {
        return this.service.updateTerminal(id, dto);
    }

    @Post('terminals/:code/heartbeat')
    async heartbeat(@Param('code') code: string) {
        await this.service.heartbeat(code);
        return { success: true };
    }

    // ==================== MODULE SETTINGS ====================

    @Get('modules/:module')
    async getModuleSettings(@Param('module') module: string) {
        return this.service.getModuleSettings(module);
    }

    @Put('modules/:module')
    async updateModuleSettings(
        @Param('module') module: string,
        @Body() config: any,
    ) {
        return this.service.updateModuleSettings(module, config);
    }
}
