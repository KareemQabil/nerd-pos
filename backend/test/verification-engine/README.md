# Verification Engine (Remote DB Safe)

This suite is designed for a **shared remote Prisma Cloud database**.
It **must not** reset or reseed static tables.

## Safety Rules

- No `prisma migrate reset`
- No destructive deletes on static tables (roles/users/products/etc.)
- Truncate **transactional tables only**

## Required Environment Variables

```
NODE_ENV=test
E2E_ALLOW_TRUNCATE=true
DATABASE_URL=... (remote test DB)
JWT_SECRET=... (matches app config)
E2E_DB_ALLOWLIST=... (required; must be present in DATABASE_URL)
```

The tests will refuse to run unless:
- `NODE_ENV === "test"`
- `E2E_ALLOW_TRUNCATE === "true"`
- `DATABASE_URL` contains `E2E_DB_ALLOWLIST`

## Static vs Transactional

Static (never truncated):
- roles, permissions, users
- products, categories, warehouses
- store settings, tax settings, terminals

Transactional (truncated):
- orders, order items, payments, refunds
- sessions, cash movements, denominations
- outbox/inbox events
- kitchen tickets, audit logs, compliance invoices, etc.
- inventory movements & batches (inventory baseline is restored after truncate)

## Running

```
npm run test:verify
```
