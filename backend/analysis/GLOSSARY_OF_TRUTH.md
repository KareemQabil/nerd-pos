# NerdPOS Naming Glossary (Prisma Schema = Law)

## Canonical Terms (From Database Schema)

### Sales Order Fields
- `order_number` ✅ (NOT `orderNumber` in DB, but `orderNumber` in DTO is mapped)
- `grand_total` ✅ (DB) -> `grandTotal` (Entity/Service)
- `name_ar` ✅ (NOT `arabicName`)
- `name_en` ✅ (NOT `englishName`)

## VIOLATIONS DETECTED

### High (Should Fix)
1. `src/modules/sales/dto/index.ts` (CreateOrderItemDto)
   - Found: `name: string`
   - Expected: `nameEn: string` (or `name_en` if strict snake_case enforced on DTO, but camelCase is standard for TS DTOs. However, `name` is ambiguous vs `nameEn`).
   - Severity: HIGH (Ambiguity)
   - Action: Rename `name` to `nameEn` to match `Product.nameEn` and `OrderItem.productNameEn`.

### Moderate
- `src/modules/sales/sales.service.ts`
  - usages of `safeToNumber` converts Decimal to JS Number.
  - Violation of "Decimal.js is MANDATORY" if strictly interpreted as "Never use Number type for money".
