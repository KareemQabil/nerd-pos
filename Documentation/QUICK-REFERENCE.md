# NerdPOS Quick Reference Card

**1-Page Cheat Sheet for Developers**

---

## **🎯 CRITICAL RULES (NEVER VIOLATE)**

```typescript
// ✅ ALWAYS use Decimal.js for money
import Decimal from 'decimal.js';
const total = new Decimal(price).times(quantity);

// ✅ ALWAYS use Repository pattern
constructor(private repo: ProductRepository) {}

// ✅ ALWAYS use Event Bus for cross-module communication
await this.eventBus.publish('OrderCreated', event);

// ✅ ALWAYS maintain ZATCA hash chain
const hash = SHA256(previousHash + invoiceXML);

// ⚠️ BUILD POS SCREEN LAST (after all 8 modules complete)
```

---

## **📁 QUICK NAVIGATION**

| Need | Read This |
|------|-----------|
| **Start Here** | [00-START-HERE.md](00-START-HERE.md) |
| **System Overview** | [01-ARCHITECTURE-OVERVIEW.md](01-ARCHITECTURE-OVERVIEW.md) |
| **Backend Guide** | [BACKEND/00-BACKEND-PRINCIPLES.md](BACKEND/00-BACKEND-PRINCIPLES.md) |
| **Create Module** | [WORKFLOWS-BACKEND/01-create-module.md](WORKFLOWS-BACKEND/01-create-module.md) |
| **Quick Sale Flow** | [WORKFLOWS-INTEGRATION/01-quick-sale.md](WORKFLOWS-INTEGRATION/01-quick-sale.md) |
| **POS Screen** ⚠️ | [WORKFLOWS-INTEGRATION/09-pos-screen.md](WORKFLOWS-INTEGRATION/09-pos-screen.md) |
| **AI Instructions** | [.claude.md](.claude.md) |

---

## **🔧 MODULE CREATION (10 STEPS)**

```bash
1. Define Prisma entity with indexes
2. Run migration: npx prisma migrate dev
3. Create repository (extends BaseRepository)
4. Create DTOs (with class-validator)
5. Create service (use Decimal.js, publish events)
6. Create controller (REST endpoints)
7. Create events (extends DomainEvent)
8. Create module definition (@Plugin decorator)
9. Register in app.module.ts
10. Test endpoints
```

---

## **📊 7-STEP CALCULATION PIPELINE**

```typescript
Step 1 (10) → Item Subtotal
Step 2 (20) → Service Charge (12% for DINE_IN)
Step 3 (30) → Delivery Charge
Step 4 (40) → Subtotal Before Tax
Step 5 (50) → Tax Amount (15% VAT)
Step 6 (60) → Discount Amount
Step 7 (70) → Grand Total
```

**Order matters! Always use 10, 20, 30, 40, 50, 60, 70**

---

## **🎨 FOLDER STRUCTURE**

### **Backend Module**
```
modules/your-module/
├── your-module.module.ts
├── your-module.controller.ts
├── your-module.service.ts
├── your-module.repository.ts
├── entities/
├── dto/
├── events/
└── handlers/
```

### **Frontend Feature**
```
app/feature/
├── page.tsx
├── components/
├── hooks/
└── types/

components/
├── atoms/
├── molecules/
└── organisms/
```

---

## **🔥 COMMON MISTAKES**

| ❌ WRONG | ✅ CORRECT |
|---------|----------|
| `const total = price * quantity` | `const total = new Decimal(price).times(quantity)` |
| `constructor(private prisma: PrismaClient)` | `constructor(private repo: ProductRepository)` |
| `await this.inventoryService.deduct()` | `await this.eventBus.publish('OrderCreated', event)` |
| `const tax = 0.15` | `const tax = settings.taxRate / 100` |
| Build POS first | Build POS LAST (after 8 modules) |

---

## **📦 TECHNOLOGY STACK**

```typescript
Backend:  NestJS 10+ + TypeScript 5+ + Prisma + PostgreSQL
Frontend: Next.js 14+ + TypeScript + Zustand + TanStack Query
UI:       TailwindCSS + Shadcn/UI + Glassmorphism
Math:     Decimal.js (NON-NEGOTIABLE)
Offline:  IndexedDB + Service Workers
```

---

## **🎯 IMPLEMENTATION ORDER**

```
Week 1-3:   Products, Inventory, Sales
Week 4-6:   Payments, Sessions, Kitchen
Week 7-9:   Customers, Settings, Discounts
Week 10-12: Compliance, Reports, Audit
Week 13:    POS Screen (FINAL INTEGRATION) ⚠️
```

---

## **🚀 QUICK START**

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npx prisma generate
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev

# Open http://localhost:3000
```

---

## **✅ PRE-LAUNCH CHECKLIST**

- [ ] All 19 modules implemented
- [ ] Decimal.js used everywhere
- [ ] Repository pattern enforced
- [ ] Event Bus functional
- [ ] ZATCA hash chain maintained
- [ ] Offline sync working
- [ ] POS screen working (LAST)
- [ ] All tests passing

---

## **📞 HELP**

1. Read [00-START-HERE.md](00-START-HERE.md)
2. Check [.claude.md](.claude.md)
3. Review workflows in WORKFLOWS-*/
4. Search source files in REFERENCE/

---

**Pattern**: LEGO + Event-Driven  
**Constraint**: Decimal.js MANDATORY  
**Rule**: POS Screen LAST  
**Goal**: Production-ready POS 🚀
