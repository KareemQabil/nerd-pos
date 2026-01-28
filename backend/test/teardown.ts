/**
 * Global Test Teardown
 *
 * Runs after all test suites.
 * Keep cleanup best-effort for shared/remote DBs.
 */

export default async function teardown() {
  // Intentionally minimal: avoid destructive cleanup on shared DBs.
}
