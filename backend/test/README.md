# Test Environment

## Quick Start

1. Start test database:
   - `npm run test:up`
2. Apply migrations:
   - `npm run test:db:migrate`
3. Run tests:
   - `npm test`

## Database

- Docker Compose file: `docker-compose.test.yml`
- Default DB: `postgresql://postgres:postgres@localhost:5433/nerdpos_test`

## Concurrency

- For shared/remote DBs, use `TEST_CONCURRENCY=12` to avoid transaction timeouts.
  - Example: `TEST_CONCURRENCY=12 npm test`
