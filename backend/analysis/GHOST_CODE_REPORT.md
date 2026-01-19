# Ghost Code Detection Report

## Unused Private Methods
*Scan performed via static analysis.*
- No clear unused private methods detected in sampled services (`SalesService`, `UsersService`, etc.). Most private methods are utilized within their respective workflows.

## Dead Imports
*Scan limited due to linter environment issues.*
- Manual review did not reveal obvious unused imports, but a full ESLint run is recommended once environment dependencies are fixed.

## Commented Code Blocks
1. `backend/src/app.module.ts`: Extensive header comments (Documentation, acceptable).
2. `backend/src/modules/auth/guards/ownership.guard.ts`:
   ```typescript
   // const resource = await this.getResource(resourceType, resourceId);
   ```
   Recommendation: DELETE if not needed.

## Orphaned DTOs
- None detected. DTOs in `sales`, `products`, `users` appear to be exported via `index.ts` and used in controllers/services.
