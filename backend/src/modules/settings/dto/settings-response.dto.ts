import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StoreSettingsResponseDto {
  @ApiProperty({ description: 'Store settings ID', example: 'store_1' })
  id: string;

  @ApiProperty({ description: 'Store name (Arabic)', example: '???? ????' })
  nameAr: string;

  @ApiProperty({ description: 'Store name (English)', example: 'NerdBased Coffee' })
  nameEn: string;

  @ApiProperty({ description: 'Tax/VAT number', example: '300000000000003' })
  taxNumber: string;

  @ApiProperty({ description: 'Tax rate', example: 0.15 })
  taxRate: number;

  @ApiProperty({ description: 'Service charge rate', example: 0.1 })
  serviceCharge: number;

  @ApiProperty({ description: 'Currency code', example: 'SAR' })
  currency: string;

  @ApiProperty({ description: 'Timezone', example: 'Asia/Riyadh' })
  timezone: string;

  @ApiProperty({ description: 'Locale', example: 'ar-SA' })
  locale: string;

  @ApiPropertyOptional({ description: 'Street address', example: 'Riyadh, KSA' })
  address?: string | null;

  @ApiPropertyOptional({ description: 'Phone number', example: '+966112345678' })
  phone?: string | null;

  @ApiPropertyOptional({ description: 'Public email address', example: 'info@nerdpos.sa' })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Logo URL', example: 'https://cdn.example.com/logo.png' })
  logo?: string | null;

  @ApiProperty({ description: 'Created at', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', example: '2026-01-23T12:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Legacy name alias', example: 'NerdBased Coffee' })
  name?: string;

  @ApiPropertyOptional({ description: 'Legacy VAT number alias', example: '300000000000003' })
  vatNumber?: string;

  @ApiPropertyOptional({ description: 'Legacy logo URL alias', example: 'https://cdn.example.com/logo.png' })
  logoUrl?: string | null;

  @ApiPropertyOptional({ description: 'Commercial registration number', example: '1010123456' })
  crNumber?: string;

  @ApiPropertyOptional({ description: 'Website URL', example: 'https://nerdpos.example.com' })
  website?: string | null;

  @ApiPropertyOptional({ description: 'City', example: 'Riyadh' })
  city?: string;

  @ApiPropertyOptional({ description: 'Country', example: 'SA' })
  country?: string;

  @ApiPropertyOptional({ description: 'Opening hours config', example: { sun: '10:00-23:00' } })
  openingHours?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Primary brand color', example: '#0F172A' })
  primaryColor?: string;

  @ApiPropertyOptional({ description: 'Currency symbol', example: '?.?' })
  currencySymbol?: string;
}

export class TaxSettingResponseDto {
  @ApiProperty({ description: 'Tax setting ID', example: 'tax_vat' })
  id: string;

  @ApiProperty({ description: 'Tax name (English)', example: 'VAT' })
  name: string;

  @ApiProperty({ description: 'Tax name (Arabic)', example: '????? ??????' })
  nameAr: string;

  @ApiProperty({ description: 'Tax rate', example: 0.15 })
  rate: number;

  @ApiProperty({ description: 'Default tax flag', example: true })
  isDefault: boolean;

  @ApiProperty({ description: 'Apply to products', example: true })
  applyToProducts: boolean;

  @ApiProperty({ description: 'Apply to services', example: true })
  applyToServices: boolean;

  @ApiProperty({ description: 'Exempt category UUIDs', example: ['723e4567-e89b-12d3-a456-426614174006'] })
  exemptCategories: string[];

  @ApiProperty({ description: 'Active flag', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Display order', example: 1 })
  displayOrder: number;
}

export class TerminalResponseDto {
  @ApiProperty({ description: 'Terminal ID', example: 'term_1' })
  id: string;

  @ApiProperty({ description: 'Terminal name (English)', example: 'Front Counter 1' })
  name: string;

  @ApiProperty({ description: 'Terminal name (Arabic)', example: '????? ?????' })
  nameAr: string;

  @ApiProperty({ description: 'Terminal code', example: 'POS-01' })
  code: string;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.50' })
  ipAddress?: string | null;

  @ApiPropertyOptional({ description: 'MAC address', example: '00:11:22:33:44:55' })
  macAddress?: string | null;

  @ApiPropertyOptional({ description: 'Receipt printer config' })
  receiptPrinter?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Kitchen printer config' })
  kitchenPrinter?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Label printer config' })
  labelPrinter?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Cash drawer port', example: 'COM3' })
  cashDrawerPort?: string | null;

  @ApiPropertyOptional({ description: 'Customer display config' })
  customerDisplay?: Record<string, unknown> | null;

  @ApiProperty({ description: 'Auto open drawer flag', example: true })
  autoOpenDrawer: boolean;

  @ApiProperty({ description: 'Print receipt flag', example: true })
  printReceipt: boolean;

  @ApiProperty({ description: 'Print kitchen ticket flag', example: true })
  printKitchen: boolean;

  @ApiPropertyOptional({ description: 'Current session ID', example: 'sess_123' })
  currentSessionId?: string | null;

  @ApiProperty({ description: 'Active flag', example: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last seen time', example: '2026-01-23T12:00:00Z' })
  lastSeenAt?: Date | null;

  @ApiProperty({ description: 'Created at', example: '2026-01-23T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', example: '2026-01-23T12:00:00Z' })
  updatedAt: Date;
}

export class HeartbeatResponseDto {
  @ApiProperty({ description: 'Heartbeat acknowledged', example: true })
  success: boolean;
}
