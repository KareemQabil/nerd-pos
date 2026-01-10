// Settings Controller
import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateStoreSettingsDto, CreateTaxSettingDto, UpdateTaxSettingDto, CreatePOSTerminalDto, UpdateModuleSettingDto } from './dto';

@Controller('settings')
export class SettingsController {
    constructor(private readonly service: SettingsService) { }

    // Store
    @Get('store')
    async getStore() { return this.service.getStoreSettings(); }

    @Put('store')
    async updateStore(@Body() dto: UpdateStoreSettingsDto) { return this.service.updateStoreSettings(dto); }

    // Tax
    @Get('tax')
    async getTax() { return this.service.getTaxSettings(); }

    @Get('tax/default')
    async getDefaultTax() { return this.service.getDefaultTax(); }

    @Post('tax')
    async createTax(@Body() dto: CreateTaxSettingDto) { return this.service.createTaxSetting(dto); }

    @Put('tax/:id')
    async updateTax(@Param('id') id: string, @Body() dto: UpdateTaxSettingDto) { return this.service.updateTaxSetting(id, dto); }

    // Terminals
    @Get('terminals')
    async getTerminals() { return this.service.getAllTerminals(); }

    @Get('terminals/:code')
    async getTerminal(@Param('code') code: string) { return this.service.getTerminalByCode(code); }

    @Post('terminals')
    async createTerminal(@Body() dto: CreatePOSTerminalDto) { return this.service.createTerminal(dto); }

    // Module Settings
    @Get('module/:module')
    async getModuleSetting(@Param('module') module: string) { return this.service.getModuleSetting(module); }

    @Put('module')
    async updateModuleSetting(@Body() dto: UpdateModuleSettingDto) { return this.service.updateModuleSetting(dto); }
}
