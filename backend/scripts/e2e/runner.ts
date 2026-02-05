/**
 * E2E Test Runner
 * 
 * Master orchestrator for running all E2E test scenarios
 * 
 * Usage:
 *   npx ts-node scripts/e2e/runner.ts                    # Run all tests
 *   npx ts-node scripts/e2e/runner.ts --scenario 01     # Run specific scenario
 *   npx ts-node scripts/e2e/runner.ts --smoke           # Run smoke tests only
 *   npx ts-node scripts/e2e/runner.ts --help            # Show help
 */

import { 
    ENV, 
    TEST_RUN_ID, 
    logSection, 
    logPass, 
    logFail, 
    logInfo, 
    logWarn,
    COLORS,
} from './config/env';
import { 
    checkBackendHealth, 
    initTestContext, 
    TestContext, 
    TestResult 
} from './config/client';
import { AuthHelper } from './helpers/auth.helper';
import { CleanupHelper } from './helpers/cleanup.helper';

// Import test scenarios
import { runCoreSalesTests } from './scenarios/01-core-sales';
import { runInventoryTests } from './scenarios/02-inventory';
import { runSessionTests } from './scenarios/03-sessions';
import { runPaymentsTests } from './scenarios/04-payments';
import { runKitchenTests } from './scenarios/05-kitchen';
import { runCustomersTests } from './scenarios/06-customers';
import { runComplianceTests } from './scenarios/07-compliance';
import { runErrorRecoveryTests } from './scenarios/08-error-recovery';
import { runAdvancedTests } from './scenarios/09-advanced';

// ==================== CONFIGURATION ====================
interface RunnerConfig {
    scenarios: string[];
    smoke: boolean;
    verbose: boolean;
    failFast: boolean;
}

interface ScenarioModule {
    id: string;
    name: string;
    run: (ctx: TestContext) => Promise<TestResult[]>;
    smoke?: boolean; // Include in smoke tests
}

// Available test scenarios
const SCENARIOS: ScenarioModule[] = [
    { id: '01', name: 'Core Sales', run: runCoreSalesTests, smoke: true },
    { id: '02', name: 'Inventory Management', run: runInventoryTests, smoke: true },
    { id: '03', name: 'Sessions', run: runSessionTests, smoke: true },
    { id: '04', name: 'Payments', run: runPaymentsTests },
    { id: '05', name: 'Kitchen', run: runKitchenTests },
    { id: '06', name: 'Customers', run: runCustomersTests },
    { id: '07', name: 'Compliance', run: runComplianceTests },
    { id: '08', name: 'Error Recovery', run: runErrorRecoveryTests },
    { id: '09', name: 'Advanced', run: runAdvancedTests },
];

// ==================== CLI PARSING ====================
function parseArgs(): RunnerConfig {
    const args = process.argv.slice(2);
    const config: RunnerConfig = {
        scenarios: [],
        smoke: false,
        verbose: process.env.TEST_DEBUG === 'true',
        failFast: false,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--help' || arg === '-h') {
            printHelp();
            process.exit(0);
        } else if (arg === '--smoke') {
            config.smoke = true;
        } else if (arg === '--verbose' || arg === '-v') {
            config.verbose = true;
        } else if (arg === '--fail-fast') {
            config.failFast = true;
        } else if (arg === '--scenario' || arg === '-s') {
            const scenarioId = args[++i];
            if (scenarioId) {
                config.scenarios.push(scenarioId.padStart(2, '0'));
            }
        } else if (arg.match(/^\d+$/)) {
            // Bare number argument
            config.scenarios.push(arg.padStart(2, '0'));
        }
    }

    return config;
}

function printHelp(): void {
    console.log(`
${COLORS.cyan}NerdPOS E2E Test Runner${COLORS.reset}

Usage:
  npx ts-node scripts/e2e/runner.ts [options]

Options:
  --scenario, -s <id>  Run specific scenario (e.g., 01, 02)
  --smoke              Run smoke tests only (critical path)
  --verbose, -v        Enable verbose logging
  --fail-fast          Stop on first failure
  --help, -h           Show this help message

Available Scenarios:
${SCENARIOS.map(s => `  ${s.id}: ${s.name}${s.smoke ? ' [smoke]' : ''}`).join('\n')}

Examples:
  npx ts-node scripts/e2e/runner.ts                    # Run all tests
  npx ts-node scripts/e2e/runner.ts --scenario 01     # Run core sales tests
  npx ts-node scripts/e2e/runner.ts --smoke           # Run smoke tests
  npx ts-node scripts/e2e/runner.ts 01 02             # Run scenarios 01 and 02

Environment Variables:
  TEST_API_URL         Backend API URL (default: http://localhost:3001/api/v1)
  TEST_ADMIN_USER      Admin username (default: admin)
  TEST_ADMIN_PASS      Admin password (default: nerdpos123)
  TEST_DEBUG           Enable debug logging (true/false)
`);
}

// ==================== MAIN RUNNER ====================
async function run(): Promise<void> {
    console.log('🚀 Runner starting...');
    const startTime = Date.now();
    const config = parseArgs();

    // Print banner
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           🧪 NerdPOS E2E Test Runner 🧪                       ║');
    console.log('║                                                              ║');
    console.log(`║  Test Run ID: ${TEST_RUN_ID}                                   ║`);
    console.log(`║  API URL: ${ENV.BASE_URL.padEnd(38)}      ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('\n');

    // Health check
    logSection('PRE-FLIGHT CHECK');
    console.log(`🔎 Health check: start (${ENV.BASE_URL})`);
    const healthy = await checkBackendHealth();
    console.log(`🔎 Health check: ${healthy ? 'ok' : 'failed'}`);
    if (!healthy) {
        logFail('Backend health check failed');
        logFail(`Ensure backend is running at ${ENV.BASE_URL}`);
        logFail('Run: npm run start:dev');
        process.exit(1);
    }
    logPass('Backend is healthy');

    // Authentication
    logSection('AUTHENTICATION');
    const auth = new AuthHelper();
    const loginResult = await auth.loginAsAdmin();
    if (!loginResult.success || !loginResult.token) {
        logFail('Admin login failed');
        process.exit(1);
    }

    // Initialize context
    const ctx = await initTestContext(loginResult.token, loginResult.userId || 'admin');
    
    // Create cleanup helper
    const cleanup = new CleanupHelper(loginResult.token);

    // Determine which scenarios to run
    let scenariosToRun = SCENARIOS;

    if (config.smoke) {
        scenariosToRun = SCENARIOS.filter(s => s.smoke);
        logInfo(`Running smoke tests: ${scenariosToRun.length} scenarios`);
    } else if (config.scenarios.length > 0) {
        scenariosToRun = SCENARIOS.filter(s => config.scenarios.includes(s.id));
        if (scenariosToRun.length === 0) {
            logFail(`No matching scenarios found for: ${config.scenarios.join(', ')}`);
            logInfo(`Available: ${SCENARIOS.map(s => s.id).join(', ')}`);
            process.exit(1);
        }
    }

    logInfo(`Running ${scenariosToRun.length} scenario(s)`);

    // Run scenarios
    const allResults: TestResult[] = [];
    let scenariosPassed = 0;
    let scenariosFailed = 0;

    for (const scenario of scenariosToRun) {
        logSection(`SCENARIO ${scenario.id}: ${scenario.name.toUpperCase()}`);

        try {
            const results = await scenario.run(ctx);
            allResults.push(...results);

            const passed = results.filter(r => r.passed).length;
            const failed = results.filter(r => !r.passed).length;

            if (failed === 0) {
                scenariosPassed++;
                logPass(`Scenario ${scenario.id} complete: ${passed}/${results.length} tests passed`);
            } else {
                scenariosFailed++;
                logFail(`Scenario ${scenario.id} complete: ${passed}/${results.length} tests passed, ${failed} failed`);

                if (config.failFast) {
                    logWarn('Fail-fast enabled, stopping execution');
                    break;
                }
            }
        } catch (error) {
            scenariosFailed++;
            logFail(`Scenario ${scenario.id} crashed: ${(error as Error).message}`);
            allResults.push({
                id: `SCENARIO-${scenario.id}`,
                name: scenario.name,
                passed: false,
                duration: 0,
                error: (error as Error).message,
            });

            if (config.failFast) {
                break;
            }
        }
    }

    // Cleanup
    logSection('CLEANUP');
    try {
        await cleanup.cleanupAll();
    } catch {
        logWarn('Cleanup encountered errors (non-fatal)');
    }

    // Final summary
    const totalDuration = Date.now() - startTime;
    printSummary(allResults, totalDuration, scenariosPassed, scenariosFailed);

    // Exit with appropriate code
    const totalFailed = allResults.filter(r => !r.passed).length;
    process.exit(totalFailed === 0 ? 0 : 1);
}

// ==================== SUMMARY REPORT ====================
function printSummary(
    results: TestResult[],
    totalDuration: number,
    scenariosPassed: number,
    scenariosFailed: number
): void {
    logSection('FINAL RESULTS');

    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);

    // Test results
    console.log('\n  Test Results:');
    console.log('  ' + '-'.repeat(56));

    for (const result of results) {
        const status = result.passed ? `${COLORS.green}✅${COLORS.reset}` : `${COLORS.red}❌${COLORS.reset}`;
        const duration = `${result.duration}ms`.padStart(8);
        console.log(`  ${status} ${result.id.padEnd(12)} ${result.name.substring(0, 35).padEnd(35)} ${duration}`);
        
        if (!result.passed && result.error) {
            console.log(`     ${COLORS.red}└─ ${result.error.substring(0, 60)}${COLORS.reset}`);
        }
    }

    console.log('  ' + '-'.repeat(56));

    // Summary stats
    console.log('\n  Summary:');
    console.log(`    Scenarios: ${scenariosPassed} passed, ${scenariosFailed} failed`);
    console.log(`    Tests:     ${passed.length} passed, ${failed.length} failed (${results.length} total)`);
    console.log(`    Duration:  ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`    Pass Rate: ${((passed.length / results.length) * 100).toFixed(1)}%`);

    // Final verdict
    console.log('\n  ' + '='.repeat(56));
    if (failed.length === 0) {
        console.log(`  ${COLORS.green}${COLORS.bright}  🏆 ALL TESTS PASSED! 🏆  ${COLORS.reset}`);
    } else {
        console.log(`  ${COLORS.red}${COLORS.bright}  ⚠️  ${failed.length} TEST(S) FAILED  ⚠️  ${COLORS.reset}`);
    }
    console.log('  ' + '='.repeat(56));
    console.log('\n');
}

// ==================== ENTRY POINT ====================
run().catch(error => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
});
