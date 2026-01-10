# Settings Module Implementation

**Module**: System Configuration  
**Priority**: Medium (Admin)  
**Dependencies**: All modules

---

## **OVERVIEW**

Centralized configuration management:
- **Store Settings** - Business info, hours
- **Tax Settings** - VAT rates, exemptions
- **POS Config** - Terminal settings, printers
- **Module Settings** - Feature flags, limits

---

## **ENTITIES**

```prisma
model StoreSetting {
  id            String   @id @default(uuid())
  
  // Business info
  name          String
  nameAr        String
  vatNumber     String
  crNumber      String
  
  // Contact
  phone         String
  email         String
  website       String?
  
  // Address
  address       String
  city          String
  country       String
  
  // Hours
  openingHours  Json     // { "monday": "09:00-22:00", ... }
  timezone      String   @default("Asia/Riyadh")
  
  // Logo & branding
  logoUrl       String?
  primaryColor  String   @default("#3B82F6")
  
  // Currency
  currency      String   @default("SAR")
  currencySymbol String  @default("﷼")
  
  updatedAt     DateTime @updatedAt
}

model TaxSetting {
  id            String   @id @default(uuid())
  
  name          String   // "VAT", "Service Charge"
  nameAr        String
  
  rate          Decimal  @db.Decimal(5, 2) // 15.00
  
  // Application
  isDefault     Boolean  @default(false)
  applyToProducts Boolean @default(true)
  applyToServices Boolean @default(true)
  
  // Exemptions
  exemptCategories String[] // Category IDs
  
  isActive      Boolean  @default(true)
  displayOrder  Int
  
  @@index([isDefault])
  @@index([displayOrder])
}

model POSTerminal {
  id            String   @id @default(uuid())
  
  // Terminal info
  name          String   // "Counter 1", "Drive-Thru"
  nameAr        String
  code          String   @unique
  
  // Hardware
  ipAddress     String?
  macAddress    String?
  
  // Printers
  receiptPrinter Json?   // { "ip": "192.168.1.10", "port": 9100 }
  kitchenPrinter Json?
  labelPrinter   Json?
  
  // Cash drawer
  cashDrawerPort String? // COM1, /dev/ttyUSB0
  
  // Display
  customerDisplay Json?  // Pole display config
  
  // Settings
  autoOpenDrawer Boolean @default(true)
  printReceipt   Boolean @default(true)
  printKitchen   Boolean @default(true)
  
  // Session
  currentSessionId String?
  
  isActive      Boolean  @default(true)
  lastSeenAt    DateTime?
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([code])
}

model ModuleSetting {
  id            String   @id @default(uuid())
  
  module        String   @unique // "inventory", "kitchen", "loyalty"
  
  // Settings as JSON
  config        Json     // Module-specific config
  
  updatedAt     DateTime @updatedAt
}
```

---

## **SERVICE**

```typescript
// settings.service.ts
import Decimal from 'decimal.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly storeRepo: StoreSettingRepository,
    private readonly taxRepo: TaxSettingRepository,
    private readonly terminalRepo: POSTerminalRepository,
    private readonly moduleRepo: ModuleSettingRepository,
    private readonly cacheService: CacheService,
    private readonly eventBus: IEventBus
  ) {}

  // ==================== STORE SETTINGS ====================

  async getStoreSettings(): Promise<StoreSetting> {
    // Cache store settings
    const cached = await this.cacheService.get('store-settings');
    if (cached) return cached;

    const settings = await this.storeRepo.getActive();
    await this.cacheService.set('store-settings', settings, 3600); // 1 hour

    return settings;
  }

  async updateStoreSettings(dto: UpdateStoreSettingsDto): Promise<StoreSetting> {
    const settings = await this.storeRepo.getActive();

    const updated = await this.storeRepo.update(settings.id, dto);

    // Clear cache
    await this.cacheService.delete('store-settings');

    await this.eventBus.publish('StoreSettingsUpdated',
      new StoreSettingsUpdatedEvent(updated.id)
    );

    return updated;
  }

  // ==================== TAX SETTINGS ====================

  async getTaxSettings(): Promise<TaxSetting[]> {
    const cached = await this.cacheService.get('tax-settings');
    if (cached) return cached;

    const taxes = await this.taxRepo.findAllActive();
    await this.cacheService.set('tax-settings', taxes, 3600);

    return taxes;
  }

  async getDefaultTax(): Promise<TaxSetting> {
    const taxes = await this.getTaxSettings();
    const defaultTax = taxes.find(t => t.isDefault);

    if (!defaultTax) {
      throw new Error('No default tax configured');
    }

    return defaultTax;
  }

  async createTaxSetting(dto: CreateTaxSettingDto): Promise<TaxSetting> {
    const tax = await this.taxRepo.create({
      name: dto.name,
      nameAr: dto.nameAr,
      rate: new Decimal(dto.rate).toNumber(),
      isDefault: dto.isDefault || false,
      applyToProducts: dto.applyToProducts !== false,
      applyToServices: dto.applyToServices !== false,
      exemptCategories: dto.exemptCategories || [],
      displayOrder: dto.displayOrder || 0
    });

    // If set as default, remove default from others
    if (dto.isDefault) {
      await this.taxRepo.clearOtherDefaults(tax.id);
    }

    await this.cacheService.delete('tax-settings');

    return tax;
  }

  async updateTaxSetting(id: string, dto: UpdateTaxSettingDto): Promise<TaxSetting> {
    const tax = await this.taxRepo.update(id, {
      ...dto,
      rate: dto.rate ? new Decimal(dto.rate).toNumber() : undefined
    });

    if (dto.isDefault) {
      await this.taxRepo.clearOtherDefaults(id);
    }

    await this.cacheService.delete('tax-settings');

    return tax;
  }

  // ==================== POS TERMINALS ====================

  async registerTerminal(dto: RegisterTerminalDto): Promise<POSTerminal> {
    const code = await this.generateTerminalCode();

    const terminal = await this.terminalRepo.create({
      name: dto.name,
      nameAr: dto.nameAr,
      code,
      ipAddress: dto.ipAddress,
      macAddress: dto.macAddress,
      receiptPrinter: dto.receiptPrinter,
      kitchenPrinter: dto.kitchenPrinter,
      autoOpenDrawer: dto.autoOpenDrawer !== false,
      printReceipt: dto.printReceipt !== false,
      printKitchen: dto.printKitchen !== false
    });

    return terminal;
  }

  async updateTerminal(id: string, dto: UpdateTerminalDto): Promise<POSTerminal> {
    const terminal = await this.terminalRepo.update(id, dto);

    await this.eventBus.publish('TerminalUpdated',
      new TerminalUpdatedEvent(terminal.id, terminal.code)
    );

    return terminal;
  }

  async heartbeat(terminalCode: string): Promise<void> {
    await this.terminalRepo.updateLastSeen(terminalCode, new Date());
  }

  async getTerminalByCode(code: string): Promise<POSTerminal> {
    const cached = await this.cacheService.get(`terminal:${code}`);
    if (cached) return cached;

    const terminal = await this.terminalRepo.findByCode(code);
    if (!terminal) {
      throw new NotFoundException(`Terminal ${code} not found`);
    }

    await this.cacheService.set(`terminal:${code}`, terminal, 300); // 5 min

    return terminal;
  }

  private async generateTerminalCode(): Promise<string> {
    const count = await this.terminalRepo.count();
    return `TERM${(count + 1).toString().padStart(3, '0')}`;
  }

  // ==================== MODULE SETTINGS ====================

  async getModuleSettings(module: string): Promise<any> {
    const cached = await this.cacheService.get(`module:${module}`);
    if (cached) return cached;

    const settings = await this.moduleRepo.findByModule(module);
    if (!settings) {
      return this.getDefaultModuleSettings(module);
    }

    await this.cacheService.set(`module:${module}`, settings.config, 3600);

    return settings.config;
  }

  async updateModuleSettings(module: string, config: any): Promise<any> {
    const existing = await this.moduleRepo.findByModule(module);

    if (existing) {
      await this.moduleRepo.update(existing.id, { config });
    } else {
      await this.moduleRepo.create({ module, config });
    }

    await this.cacheService.delete(`module:${module}`);

    return config;
  }

  private getDefaultModuleSettings(module: string): any {
    const defaults = {
      inventory: {
        lowStockThreshold: 10,
        enableFIFO: true,
        autoReorder: false
      },
      kitchen: {
        autoRoutingEnabled: true,
        defaultPrepTime: 15,
        notificationSound: true
      },
      loyalty: {
        pointsPerSAR: 1,
        pointsToSAR: 0.01,
        minRedemption: 100
      },
      sales: {
        allowNegativeInventory: false,
        requireCustomer: false,
        autoApplyDiscounts: true
      }
    };

    return defaults[module] || {};
  }
}
```

---

## **CONTROLLER**

```typescript
// settings.controller.ts
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // Store settings
  @Get('store')
  async getStoreSettings() {
    return this.settingsService.getStoreSettings();
  }

  @Put('store')
  async updateStoreSettings(@Body() dto: UpdateStoreSettingsDto) {
    return this.settingsService.updateStoreSettings(dto);
  }

  // Tax settings
  @Get('taxes')
  async getTaxSettings() {
    return this.settingsService.getTaxSettings();
  }

  @Post('taxes')
  async createTaxSetting(@Body() dto: CreateTaxSettingDto) {
    return this.settingsService.createTaxSetting(dto);
  }

  @Put('taxes/:id')
  async updateTaxSetting(
    @Param('id') id: string,
    @Body() dto: UpdateTaxSettingDto
  ) {
    return this.settingsService.updateTaxSetting(id, dto);
  }

  // POS terminals
  @Get('terminals')
  async getTerminals() {
    return this.settingsService.getAllTerminals();
  }

  @Post('terminals')
  async registerTerminal(@Body() dto: RegisterTerminalDto) {
    return this.settingsService.registerTerminal(dto);
  }

  @Put('terminals/:id')
  async updateTerminal(
    @Param('id') id: string,
    @Body() dto: UpdateTerminalDto
  ) {
    return this.settingsService.updateTerminal(id, dto);
  }

  @Post('terminals/:code/heartbeat')
  async heartbeat(@Param('code') code: string) {
    await this.settingsService.heartbeat(code);
    return { success: true };
  }

  // Module settings
  @Get('modules/:module')
  async getModuleSettings(@Param('module') module: string) {
    return this.settingsService.getModuleSettings(module);
  }

  @Put('modules/:module')
  async updateModuleSettings(
    @Param('module') module: string,
    @Body() config: any
  ) {
    return this.settingsService.updateModuleSettings(module, config);
  }
}
```

---

## **DTOs**

```typescript
// dto/update-store-settings.dto.ts
export class UpdateStoreSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsObject()
  openingHours?: Record<string, string>;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;
}

// dto/create-tax-setting.dto.ts
export class CreateTaxSettingDto {
  @IsString()
  name: string;

  @IsString()
  nameAr: string;

  @IsNumber()
  rate: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  applyToProducts?: boolean;

  @IsOptional()
  @IsBoolean()
  applyToServices?: boolean;

  @IsOptional()
  @IsArray()
  exemptCategories?: string[];

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
```

---

## **KEY FEATURES**

1. **Centralized Config** - All settings in one place
2. **Caching** - Redis cache for performance
3. **Terminal Management** - POS hardware config
4. **Tax Flexibility** - Multiple tax rates, exemptions
5. **Module Settings** - Feature flags per module
6. **Heartbeat** - Track terminal status

---

## **BACKEND COMPLETE**

All 12 backend modules documented! Next: Frontend files.
