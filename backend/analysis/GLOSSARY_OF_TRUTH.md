# NerdPOS Naming Glossary (Prisma Schema = Law)

## Canonical Terms (From Database Schema)

### Sales Order Fields
- `grand_total` ✅ (Prisma: `grand_total`, NOT `totalPrice`, `orderTotal`)
- `tax_amount` ✅ (Prisma: `tax_amount`)
- `discount_amount` ✅ (Prisma: `discount_amount`)
- `service_charge_rate` ✅ (Prisma: `service_charge_rate`)
- `item_subtotal` ✅ (Prisma: `item_subtotal`)

### Product Fields
- `name_ar` ✅ (Prisma: `name_ar`, NOT `nameArabic`)
- `name_en` ✅ (Prisma: `name_en`, NOT `nameEn`)
- `unit_price` ✅ (Prisma: `unit_price` in OrderItem, NOT `price`)
- `cost_price` ✅ (Prisma: `cost` or `cost_per_unit`)
- `category_id` ✅ (Prisma: `category_id`, NOT `categoryId`)

### User Fields
- `username` ✅ (Prisma: `username`)
- `password` ✅ (Prisma: `password`)
- `role_id` ✅ (Prisma: `role_id`)

## VIOLATIONS DETECTED

### Critical (Must Fix) - DTO Naming Mismatches
1. `src/modules/products/dto/create-product.dto.ts`
   - Found: `nameEn: string`
   - Expected: `name_en: string`
   - Found: `categoryId: string`
   - Expected: `category_id: string`
   - Found: `price: number`
   - Expected: `unit_price: string` (or `price` matching Product model, but type should be string/Decimal)
   - Severity: **CRITICAL** (camelCase used in DTOs vs snake_case DB standard)

2. `src/modules/sales/dto/index.ts` (CreateOrderItemDto)
   - Found: `nameAr: string`
   - Expected: `name_ar: string`
   - Found: `productId: string`
   - Expected: `product_id: string`
   - Found: `price: number`
   - Expected: `unit_price: string` (Order Item field is `unit_price`)
   - Severity: **CRITICAL**

3. `src/modules/users/dto/index.ts`
   - Found: `nameEn: string`
   - Expected: `name_en: string`
   - Severity: **CRITICAL**

### Moderate (Should Fix) - Type Mismatches
1. `src/modules/sales/dto/index.ts`
   - Found: `price: number`
   - Expected: `price: string` (Decimal handling)
   - Reason: Precision loss with JavaScript numbers.

### Pattern Violations
- **DTO Property Naming**: Almost all DTOs currently use camelCase (`nameEn`), while the architecture mandate requires alignment with DB schema snake_case (`name_en`).
- **Prisma Field Usage**: The codebase uses Prisma Generated Types which are camelCase (e.g., `product.nameEn`). The refactor implies we should either map these manually or enforce snake_case even in Prisma types if possible (but Prisma Client uses camelCase by default).
  - *Note*: The prompt says "Prisma Schema is Law" and points to the `@map` value. If the goal is to have DTOs match the DB columns, then the current DTOs are in violation.
