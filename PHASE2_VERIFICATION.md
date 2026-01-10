# Phase 2: Core Infrastructure - Manual Verification Guide

## ✅ What We've Built

**Core Patterns:**
- BaseRepository (for all CRUD operations)
- EventBusService (parallel event handlers)
- CalculationPipeline (for 7-step order calculations)
- DecimalTransformInterceptor (prevents precision loss in JSON)
- PrismaService (database connection)

**Database Schema:**
- 8 core models: Products, Inventory, Sales, Payments, Sessions, Customers, Settings, Users
- All with proper indexes and relationships

---

## 🧪 Manual Verification Steps

### **Step 1: Check Prisma Client Generation**

```bash
# Should see Prisma Client in node_modules
ls node_modules/@prisma/client

# Should show generated types
cat node_modules/.prisma/client/index.d.ts | head -20
```

**✅ Success if:** You see Prisma Client files and TypeScript type definitions

---

### **Step 2: Test Backend Compilation**

```bash
cd k:\nerdREF\nerdPOS\backend

# Compile TypeScript
npx tsc --noEmit
```

**✅ Success if:** No TypeScript errors (some warnings are OK)

---

### **Step 3: Start Development Server**

```bash
# Start NestJS in dev mode
npm run start:dev
```

**✅ Success if:** 
- You see: `Nest application successfully started`
- Server runs on `http://localhost:3001`
- No errors in console

**Expected Output:**
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] PrismaModule dependencies initialized
[Nest] LOG [InstanceLoader] EventBusModule dependencies initialized
[Nest] LOG [InstanceLoader] AppModule dependencies initialized
[Nest] LOG [NestApplication] Nest application successfully started
```

---

### **Step 4: Test API Endpoint**

Open another terminal:

```bash
# Test the default endpoint
curl http://localhost:3001

# Or open in browser:
# http://localhost:3001
```

**✅ Success if:** You get `Hello World!` response

---

### **Step 5: Check Database Connection**

The backend should connect to database on startup. Check logs for:

```
[Nest] LOG [PrismaService] Prisma connected to database
```

**If you see connection errors:**
- Check `.env` file has correct `DATABASE_URL`
- Verify Prisma database is accessible
- Test connection: `npx prisma db execute --stdin <<< "SELECT 1"`

---

### **Step 6: Verify Core Modules Load**

Check that imports work:

```bash
# In backend directory, open Node REPL
node

# Then try:
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Prisma Client loaded:', !!prisma);
```

**✅ Success if:** Prints `Prisma Client loaded: true`

---

### **Step 7: Inspect Generated Prisma Models**

```bash
# View generated Prisma Client models
cat node_modules/.prisma/client/index.d.ts | grep "export type"
```

**✅ Success if:** You see all your models:
```typescript
export type Category = { ... }
export type Product = { ... }
export type SalesOrder = { ... }
export type Payment = { ... }
export type RegisterSession = { ... }
export type Customer = { ... }
export type StoreSettings = { ... }
export type User = { ... }
```

---

## 🎯 Quick Health Check Checklist

Run these commands in order:

```bash
# 1. Check Prisma is working
npx prisma --version

# 2. Validate schema
npx prisma validate

# 3. Check database connection
npx prisma db execute --stdin <<< "SELECT 1"

# 4. Start backend
npm run start:dev

# 5. In another terminal, test API
curl http://localhost:3001
```

---

## 🐛 Common Issues & Fixes

### **Issue: "Cannot find module '@prisma/client'"**
**Fix:** 
```bash
npx prisma generate
npm install
```

### **Issue: "Port 3001 already in use"**
**Fix:** Change port in `.env`:
```bash
PORT=3002
```

### **Issue: "Database connection failed"**
**Fix:** 
1. Check `.env` has correct `DATABASE_URL`
2. Verify database is running
3. Test: `npx prisma db execute --stdin <<< "SELECT 1"`

### **Issue: TypeScript errors in imports**
**Fix:**
```bash
# Regenerate types
npx prisma generate
# Restart VS Code/editor
```

---

## ✅ Phase 2 Complete When:

- [ ] `npm run start:dev` starts without errors
- [ ] Server responds to `http://localhost:3001`
- [ ] No TypeScript compilation errors
- [ ] Prisma Client generated with all models
- [ ] Database connection successful
- [ ] Core modules (Prisma, EventBus) loaded

---

## 🚀 Next: Phase 3 - Products Module

Once all checks pass, you're ready to create your first module following:
`WORKFLOWS-BACKEND/01-create-module.md`
