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
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional({ example: 'Nerd Restaurant' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'مطعم نير' })
  @IsOptional()
  @IsString()
  nameAr?: string;

  @ApiPropertyOptional({ example: '123456789012345' })
  @IsOptional()
  @IsString()
  vatNumber?: string;
  @IsOptional() @IsString() crNumber?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsObject() openingHours?: any;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() currencySymbol?: string;
}

export class CreateTaxSettingDto {
  @IsString() name: string;
  @IsString() nameAr: string;
  @IsNumber() rate: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() applyToProducts?: boolean;
  @IsOptional() @IsBoolean() applyToServices?: boolean;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  exemptCategories?: string[];
  @IsNumber() displayOrder: number;
}

export class UpdateTaxSettingDto extends PartialType(CreateTaxSettingDto) { }

export class CreatePOSTerminalDto {
  @IsString() name: string;
  @IsString() nameAr: string;
  @IsString() code: string;
  @IsOptional() @IsString() ipAddress?: string;
  @IsOptional() @IsObject() receiptPrinter?: any;
  @IsOptional() @IsObject() kitchenPrinter?: any;
  @IsOptional() @IsBoolean() autoOpenDrawer?: boolean;
  @IsOptional() @IsBoolean() printReceipt?: boolean;
  @IsOptional() @IsBoolean() printKitchen?: boolean;
}

export class UpdateModuleSettingDto {
  @IsString() module: string;
  @IsObject() config: any;
}
