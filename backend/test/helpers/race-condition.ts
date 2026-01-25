/**
 * Race Condition Tester
 *
 * Execute concurrent operations and detect race conditions.
 */

export class RaceConditionTester {
  /**
   * Execute multiple operations concurrently and detect conflicts
   */
  static async detectRaceCondition<T>(
    operations: (() => Promise<T>)[],
    validator: (results: T[]) => boolean
  ): Promise<{
    hasRaceCondition: boolean;
    results: T[];
    firstFailureIndex?: number;
  }> {
    const results = await Promise.all(
      operations.map(op => op().catch(e => e))
    );

    const hasRaceCondition = !validator(results);

    return {
      hasRaceCondition,
      results,
      firstFailureIndex: hasRaceCondition
        ? results.findIndex((r, i) => !validator([r]))
        : undefined
    };
  }

  /**
   * Simulate two terminals making the same request simultaneously
   */
  static async simulateDualTerminalRequest<T>(
    terminalA: () => Promise<T>,
    terminalB: () => Promise<T>
  ): Promise<{
    terminalAResult: T;
    terminalBResult: T;
    bothSucceeded: boolean;
    timeDifferenceMs: number;
  }> {
    const startTime = Date.now();
    const [resultA, resultB] = await Promise.all([
      terminalA().catch(e => ({ error: e })),
      terminalB().catch(e => ({ error: e }))
    ]);
    const endTime = Date.now();

    return {
      terminalAResult: resultA,
      terminalBResult: resultB,
      bothSucceeded: !('error' in resultA) && !('error' in resultB),
      timeDifferenceMs: endTime - startTime
    };
  }

  /**
   * Flood an endpoint with concurrent requests
   */
  static async floodEndpoint<T>(
    operation: () => Promise<T>,
    concurrency: number = 100
  ): Promise<{
    successful: number;
    failed: number;
    errors: Error[];
    averageResponseTimeMs: number;
  }> {
    const startTime = Date.now();
    const results = await Promise.allSettled(
      Array(concurrency).fill(null).map(() => operation())
    );
    const endTime = Date.now();

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => (r as PromiseRejectedResult).reason as Error);

    return {
      successful,
      failed,
      errors,
      averageResponseTimeMs: (endTime - startTime) / concurrency
    };
  }
}
