// Settings DTOs
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsEmail,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional({ description: 'Store name (English)', example: 'Nerd Restaurant' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Store name (Arabic)', example: '???? ????' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional({ description: 'VAT number', example: '300000000000003' })
  @IsOptional()
  @IsString()
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Commercial registration number', example: '1010123456' })
  @IsOptional()
  @IsString()
  crNumber?: string;

  @ApiPropertyOptional({ description: 'Primary phone number', example: '+966112345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Public email address', example: 'info@nerdpos.sa' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Website URL', example: 'https://nerdpos.example.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Street address', example: 'King Fahd Rd, Riyadh' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'City', example: 'Riyadh' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Country code/name', example: 'SA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Opening hours map',
    example: { sun: '10:00-23:00', mon: '10:00-23:00' },
  })
  @IsOptional()
  @IsObject()
  openingHours?: any;

  @ApiPropertyOptional({ description: 'Timezone identifier', example: 'Asia/Riyadh' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Logo URL', example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'Primary brand color', example: '#0F172A' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Currency code', example: 'SAR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Currency symbol', example: '?.?' })
  @IsOptional()
  @IsString()
  currencySymbol?: string;
}

export class CreateTaxSettingDto {
  @ApiProperty({ description: 'Tax name (English)', example: 'VAT 15%' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tax name (Arabic)', example: '????? ?????? ??????? 15%' })
  @IsString()
  nameAr: string;

  @ApiProperty({ description: 'Tax rate (decimal)', example: 0.15 })
  @IsNumber()
  rate: number;

  @ApiPropertyOptional({ description: 'Mark as default tax', example: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Apply tax to products', example: true })
  @IsOptional()
  @IsBoolean()
  applyToProducts?: boolean;

  @ApiPropertyOptional({ description: 'Apply tax to services', example: true })
  @IsOptional()
  @IsBoolean()
  applyToServices?: boolean;

  @ApiPropertyOptional({
    description: 'Exempt category UUIDs',
    example: ['723e4567-e89b-12d3-a456-426614174006'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptCategories?: string[];

  @ApiProperty({ description: 'Display order', example: 1 })
  @IsNumber()
  displayOrder: number;
}

export class UpdateTaxSettingDto extends PartialType(CreateTaxSettingDto) { }

export class CreatePOSTerminalDto {
  @ApiProperty({ description: 'Terminal name (English)', example: 'Front POS' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Terminal name (Arabic)', example: '????? ?????' })
  @IsString()
  nameAr: string;

  @ApiProperty({ description: 'Terminal code', example: 'POS-001' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Terminal IP address', example: '192.168.1.50' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({
    description: 'Receipt printer configuration',
    example: { name: 'Epson TM-T88', type: 'USB' },
  })
  @IsOptional()
  @IsObject()
  receiptPrinter?: any;

  @ApiPropertyOptional({
    description: 'Kitchen printer configuration',
    example: { name: 'Epson TM-T20', type: 'LAN' },
  })
  @IsOptional()
  @IsObject()
  kitchenPrinter?: any;

  @ApiPropertyOptional({ description: 'Auto open cash drawer', example: true })
  @IsOptional()
  @IsBoolean()
  autoOpenDrawer?: boolean;

  @ApiPropertyOptional({ description: 'Print receipt by default', example: true })
  @IsOptional()
  @IsBoolean()
  printReceipt?: boolean;

  @ApiPropertyOptional({ description: 'Print kitchen ticket by default', example: true })
  @IsOptional()
  @IsBoolean()
  printKitchen?: boolean;
}

export class UpdateModuleSettingDto {
  @ApiProperty({ description: 'Module key', example: 'sales' })
  @IsString()
  module: string;

  @ApiProperty({ description: 'Module configuration', example: { allowNegativeStock: false } })
  @IsObject()
  config: any;
}

export * from './settings-response.dto';
