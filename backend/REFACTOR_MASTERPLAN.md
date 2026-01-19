# NerdPOS Refactor Master Plan

## Executive Summary
- **Total Violations**: ~25+ (Estimated based on sampling)
- **Critical**: DTO Naming Mismatches, Direct Prisma Usage, Missing Permissions
- **High**: Decimal Handling (Precision Risk)
- **Moderate**: Commented Code, Service Coupling
- **Estimated Effort**: 12-16 hours
- **Risk Level**: MEDIUM (Extensive DTO changes affect API contracts)

## Priority 1: CRITICAL (Do First)

### C1: Fix Naming Violations (Prisma Alignment)
**Impact**: Type safety, API consistency, Compliance with "Law"
**Effort**: 6 hours
**Files**:
- `src/modules/sales/dto/*.dto.ts`
- `src/modules/products/dto/*.dto.ts`
- `src/modules/users/dto/*.dto.ts`
- (And other modules' DTOs)

**Changes**:
```diff
// src/modules/sales/dto/create-order.dto.ts
- productId: string;
+ product_id: string;

- nameEn: string;
+ name_en: string;

- price: number;
+ unit_price: string; // Decimal as string
```

**Testing**: Run all E2E tests. API clients (Frontend) will need updates to match snake_case.

---

### C2: Remove Direct Prisma Usage
**Impact**: Repository pattern compliance, Testability
**Effort**: 4 hours
**Files**:
- `src/modules/sales/sales.service.ts`
- `src/modules/inventory/inventory.service.ts`
- `src/modules/reports/reports.service.ts`
- `src/modules/audit/audit.service.ts`

**Changes**:
```diff
- await this.prisma.$transaction(...)
+ await this.repo.runInTransaction(...) // Need to implement this in BaseRepository or specific Repositories
```

**Testing**: Unit tests must mock repository, not Prisma.

---

### C3: Add Missing @Permissions
**Impact**: Security
**Effort**: 2 hours
**Files**:
- `src/modules/sales/sales.controller.ts`
- (Scan and fix all other Controllers)

**Changes**:
```diff
  @Post()
+ @Permissions('sales:create')
  async create() { }
```

**Testing**: Verify RBAC tests.

---

## Priority 2: HIGH (Do Second)

### H1: Enforce Decimal Safety
**Impact**: Financial Accuracy
**Effort**: 3 hours
**Files**:
- `src/modules/sales/sales.service.ts`

**Changes**:
- Replace `.toNumber()` with `.toFixed(3)` where final values are output/persisted.
- Ensure DTOs accept strings for Decimals to avoid JS float errors.

---

## Priority 3: MODERATE (Do Last)

### M1: Decouple Services (Auth -> Users)
**Impact**: Modular Architecture
**Effort**: 2 hours
**Files**:
- `src/modules/auth/auth.service.ts`

**Changes**:
- Use Event Bus for side effects (e.g., logging attempts).
- If data retrieval is needed, ensure it goes through a proper Repository or bounded context interface, not full Service injection if avoiding coupling is strict.

### M2: Remove Ghost Code
**Impact**: Cleanliness
**Effort**: 1 hour
**Files**:
- `src/modules/auth/guards/ownership.guard.ts` (Commented code)

---

## Execution Order

1. **Day 1**: C1 - Fix Naming Violations (The biggest task, affects everything).
2. **Day 2**: C2 - Remove Direct Prisma & C3 - Add Permissions.
3. **Day 3**: H1 - Decimal Safety & M1/M2 - Cleanup.

## Risk Mitigation

### Before Starting
- [ ] Create refactor branch: `git checkout -b refactor/forensic-cleanup`
- [ ] Run full test suite: `npm test` (baseline)

### After Each Priority Level
- [ ] Run tests: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Commit with conventional commits.

## Success Criteria

- [ ] Zero direct Prisma calls in Services.
- [ ] DTOs match DB Schema (snake_case).
- [ ] All Endpoints secured with @Permissions.
- [ ] All tests passing.
