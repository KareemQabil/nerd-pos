# NerdPOS Backend

Pragmatic enterprise-grade POS backend built on NestJS and Prisma. This codebase focuses on transaction safety, idempotent event handling, and financial correctness (ZATCA-compliant rounding) while keeping deployment simple.

## Highlights

- ACID order workflow with atomic inventory deduction inside the sales transaction
- Outbox pattern with SKIP LOCKED claiming, retry/backoff, stale lock requeue, and dead-letter handling
- Inbox pattern for handler idempotency (database-enforced)
- ZATCA HALF_UP rounding via centralized ZATCAMath utilities
- Standardized application exceptions and response envelope

## Tech stack

- Node.js + TypeScript
- NestJS
- Prisma + PostgreSQL
- Decimal.js

## Repository layout

- `src/` - application source
  - `core/` - infrastructure (prisma, outbox, inbox, event bus)
  - `modules/` - domain modules (sales, inventory, payments, sessions, compliance, etc.)
  - `common/` - shared utilities, errors, response envelope
- `prisma/` - schema and migrations
- `test/` - unit, integration, and negative tests
- `docs/` - architectural notes and tech debt baselines

## Prerequisites

- Node.js (LTS recommended)
- npm
- PostgreSQL

## Environment

Copy `.env.example` to `.env` and fill in required values.

```bash
cp .env.example .env
```

Minimum required:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRY`

Optional:

- ZATCA credentials if using live integration

## Install

```bash
npm install
```

## Database

```bash
npx prisma migrate dev
npx prisma generate
```

## Run

```bash
# development
npm run start:dev

# production
npm run start:prod
```

## Tests

```bash
# typecheck
npx tsc --noEmit

# full test suite
npx jest --runInBand
```

## Architecture notes

### 1) ACID sales and inventory

Inventory is deducted inside the sales transaction using an atomic update:

- `inventoryItem.updateMany` with `quantityOnHand >= needed`
- If the update count is not 1, the transaction fails with `OutOfStock`

This prevents overselling under concurrency without relying on event handlers.

### 2) Outbox worker

Events are recorded in `outbox_events` inside the same transaction as the business operation. A background worker claims events using SKIP LOCKED, marks them `PROCESSING`, and publishes them outside the transaction.

Key behavior:

- `status` transitions: `PENDING` -> `PROCESSING` -> `PROCESSED` or `RETRY` or `DEAD`
- `attempts` increment on claim
- `nextRunAt` controls backoff scheduling
- stale `PROCESSING` rows are requeued

Location:

- `src/core/outbox/outbox.worker.ts`

### 3) Inbox idempotency

Handlers use `InboxService.executeIdempotently(...)` to ensure each event is processed exactly once per consumer. The inbox table enforces a unique `(consumer, eventId)` constraint.

Location:

- `src/core/inbox/inbox.service.ts`
- `prisma` model: `InboxEvent`

### 4) ZATCA rounding

All monetary rounding uses HALF_UP and is centralized in:

- `src/common/utils/zatca-math.utils.ts`

Rule of thumb:

- Round line totals and VAT to 2 decimals (HALF_UP)
- Sum rounded line items to get invoice totals

### 5) Errors and response envelope

Services throw app-level exceptions using standardized `ErrorMessages`. The API response is normalized by the global filter and interceptor.

Locations:

- `src/common/constants/error-messages.ts`
- `src/common/exceptions/*`
- `src/common/errors/throw.ts`

## Operational notes

### Outbox monitoring

Basic queries you can run in PostgreSQL:

```sql
-- Pending or retry events
SELECT count(*) FROM outbox_events WHERE status IN ('PENDING','RETRY');

-- Stuck processing events (older than 1 minute)
SELECT id, event_name, locked_at, locked_by
FROM outbox_events
WHERE status = 'PROCESSING' AND locked_at < now() - interval '1 minute';

-- Dead events
SELECT count(*) FROM outbox_events WHERE status = 'DEAD';
```

### Inbox retention

The inbox table will grow. If you need retention, add a scheduled cleanup job based on your SLA.

## Common commands

```bash
# prisma studio
npx prisma studio

# format
npm run format

# lint
npm run lint
```

## Contributing

- Keep transactions explicit in services
- Do not reintroduce `tx as any`
- Avoid throwing raw NestJS HTTP exceptions from service layer
- Keep event side effects out of core transactional logic

## Status

This backend is designed to be safe under concurrency, resilient to handler retries, and compliant with financial rounding requirements.
