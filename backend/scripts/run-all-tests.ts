#!/usr/bin/env ts-node

/**
 * 🚀 NERDPOS COMPREHENSIVE E2E TEST RUNNER
 * =========================================
 * 
 * Master test orchestrator that runs all test suites in sequence
 * and provides a unified report.
 * 
 * Test Suites:
 * 1. Production Simulation (14 Acts, all workflows)
 * 2. Workflow-Specific Tests (based on WORKFLOWS.md)
 * 3. Security & RBAC Tests
 * 4. Financial Validation Tests
 * 
 * Usage:
 *   npx ts-node scripts/run-all-tests.ts           # Run all suites
 *   npx ts-node scripts/run-all-tests.ts quick     # Quick smoke test
 *   npx ts-node scripts/run-all-tests.ts security  # Security tests only
 *   npx ts-node scripts/run-all-tests.ts financial # Financial tests only
 *   npx ts-node scripts/run-all-tests.ts workflow  # Workflow tests only
 * 
 * Environment Variables:
 *   API_URL - Target API (default: http://localhost:3001/api/v1)
 *   VERBOSE - Show detailed output (default: false)
 */

import { spawn, SpawnOptions } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// =====================================================
// CONFIGURATION
// =====================================================

const SCRIPTS_DIR = __dirname;
const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

// Colors for terminal output
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// =====================================================
// TEST SUITES
// =====================================================

interface TestSuite {
  name: string;
  script: string;
  description: string;
  category: 'full' | 'quick' | 'security' | 'financial' | 'workflow';
  timeout: number; // in ms
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Production Simulation',
    script: 'production-simulation.ts',
    description: '14 Acts covering complete POS operations',
    category: 'full',
    timeout: 300000, // 5 min
  },
  {
    name: 'Workflow Tests',
    script: 'workflow-tests.ts',
    description: 'WORKFLOWS.md scenario validation',
    category: 'workflow',
    timeout: 180000, // 3 min
  },
  {
    name: 'Security Tests',
    script: 'security-tests.ts',
    description: 'Authentication, RBAC, input validation',
    category: 'security',
    timeout: 120000, // 2 min
  },
  {
    name: 'Financial Tests',
    script: 'financial-tests.ts',
    description: 'Tax calculations, precision, FIFO',
    category: 'financial',
    timeout: 180000, // 3 min
  },
];

// =====================================================
// HELPERS
// =====================================================

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' | 'title' = 'info') {
  const colors = {
    info: C.cyan,
    success: C.green,
    error: C.red,
    warn: C.yellow,
    title: C.bright + C.white,
  };
  console.log(`${colors[type]}${message}${C.reset}`);
}

function runScript(scriptPath: string, timeout: number): Promise<{ success: boolean; output: string; duration: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let output = '';
    let timedOut = false;
    
    const options: SpawnOptions = {
      cwd: join(SCRIPTS_DIR, '..'),
      env: { ...process.env, API_URL },
      shell: true,
    };
    
    const child = spawn('npx', ['ts-node', scriptPath], options);
    
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeout);
    
    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (process.env.VERBOSE === 'true') {
        process.stdout.write(text);
      }
    });
    
    child.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (process.env.VERBOSE === 'true') {
        process.stderr.write(text);
      }
    });
    
    child.on('close', (code) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      
      if (timedOut) {
        resolve({ 
          success: false, 
          output: output + '\n[TIMEOUT: Test exceeded time limit]',
          duration 
        });
      } else {
        resolve({ success: code === 0, output, duration });
      }
    });
    
    child.on('error', (err) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      resolve({ 
        success: false, 
        output: output + `\n[ERROR: ${err.message}]`,
        duration 
      });
    });
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(68) + '║');
  console.log(`║${C.bright}${C.cyan}       🚀 NERDPOS COMPREHENSIVE E2E TEST RUNNER 🚀${C.reset}` + ' '.repeat(20) + '║');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');
  
  const mode = process.argv[2] || 'all';
  
  log(`📍 API Target: ${API_URL}`, 'info');
  log(`📋 Mode: ${mode.toUpperCase()}`, 'info');
  log(`📅 Started: ${new Date().toISOString()}\n`, 'info');
  
  // Filter suites based on mode
  let suitesToRun: TestSuite[];
  
  switch (mode) {
    case 'quick':
      suitesToRun = TEST_SUITES.filter(s => s.category === 'quick');
      if (suitesToRun.length === 0) {
        // Quick mode: just run workflow tests
        suitesToRun = TEST_SUITES.filter(s => s.name === 'Workflow Tests');
      }
      break;
    case 'security':
      suitesToRun = TEST_SUITES.filter(s => s.category === 'security');
      break;
    case 'financial':
      suitesToRun = TEST_SUITES.filter(s => s.category === 'financial');
      break;
    case 'workflow':
      suitesToRun = TEST_SUITES.filter(s => s.category === 'workflow');
      break;
    case 'full':
    case 'all':
    default:
      suitesToRun = TEST_SUITES;
  }
  
  if (suitesToRun.length === 0) {
    log(`No test suites found for mode: ${mode}`, 'error');
    process.exit(1);
  }
  
  // Verify scripts exist
  for (const suite of suitesToRun) {
    const scriptPath = join(SCRIPTS_DIR, suite.script);
    if (!existsSync(scriptPath)) {
      log(`⚠ Script not found: ${suite.script}`, 'warn');
    }
  }
  
  // Run test suites
  const results: { suite: TestSuite; success: boolean; duration: number; output: string }[] = [];
  let totalDuration = 0;
  
  for (let i = 0; i < suitesToRun.length; i++) {
    const suite = suitesToRun[i];
    const scriptPath = join(SCRIPTS_DIR, suite.script);
    
    console.log('\n' + '═'.repeat(70));
    log(`[${i + 1}/${suitesToRun.length}] ${suite.name}`, 'title');
    log(`   ${suite.description}`, 'info');
    console.log('═'.repeat(70));
    
    if (!existsSync(scriptPath)) {
      log(`   ⚠ Skipped (script not found)`, 'warn');
      results.push({ suite, success: false, duration: 0, output: 'Script not found' });
      continue;
    }
    
    log(`   Running ${suite.script}...`, 'info');
    const startTime = Date.now();
    
    const result = await runScript(scriptPath, suite.timeout);
    
    results.push({ suite, ...result });
    totalDuration += result.duration;
    
    if (result.success) {
      log(`   ✅ PASSED (${formatDuration(result.duration)})`, 'success');
    } else {
      log(`   ❌ FAILED (${formatDuration(result.duration)})`, 'error');
      
      // Show last few lines of output on failure
      if (!process.env.VERBOSE) {
        const lines = result.output.split('\n').slice(-10);
        console.log('\n   Last output:');
        lines.forEach(line => console.log(`   ${line}`));
      }
    }
  }
  
  // Final Summary
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(68) + '║');
  console.log(`║${C.bright}                    TEST EXECUTION SUMMARY${C.reset}` + ' '.repeat(26) + '║');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('  Suite Results:');
  console.log('  ' + '─'.repeat(60));
  
  for (const result of results) {
    const status = result.success ? `${C.green}✅ PASS${C.reset}` : `${C.red}❌ FAIL${C.reset}`;
    const duration = formatDuration(result.duration).padStart(8);
    console.log(`  ${status}  ${result.suite.name.padEnd(30)} ${duration}`);
  }
  
  console.log('  ' + '─'.repeat(60));
  console.log(`  Total Suites: ${results.length}`);
  log(`  Passed: ${passed}`, 'success');
  if (failed > 0) {
    log(`  Failed: ${failed}`, 'error');
  }
  console.log(`  Total Duration: ${formatDuration(totalDuration)}`);
  
  // Success rate
  const successRate = (passed / results.length * 100).toFixed(1);
  console.log('\n' + '─'.repeat(70));
  
  if (passed === results.length) {
    log(`\n🏆 ALL TESTS PASSED! (${successRate}%)`, 'success');
    log('   Your NerdPOS system is ready for production! 🎉\n', 'success');
  } else {
    log(`\n⚠ Some tests failed (${successRate}% passed)`, 'warn');
    log('   Review failed tests and fix issues before deployment.\n', 'warn');
    
    console.log('  Failed Suites:');
    results.filter(r => !r.success).forEach(r => {
      log(`    • ${r.suite.name} - ${r.suite.description}`, 'error');
    });
  }
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${C.bright}NERDPOS E2E TEST RUNNER${C.reset}

Usage: npx ts-node scripts/run-all-tests.ts [mode]

Modes:
  all, full    Run all test suites (default)
  quick        Quick smoke test
  security     Security & RBAC tests only
  financial    Financial validation tests only
  workflow     Workflow tests only

Environment Variables:
  API_URL      Target API URL (default: http://localhost:3001/api/v1)
  VERBOSE      Show detailed output (set to 'true')

Examples:
  npx ts-node scripts/run-all-tests.ts
  npx ts-node scripts/run-all-tests.ts security
  VERBOSE=true npx ts-node scripts/run-all-tests.ts workflow
  API_URL=http://production:3001/api/v1 npx ts-node scripts/run-all-tests.ts

Test Suites:
${TEST_SUITES.map(s => `  • ${s.name}: ${s.description}`).join('\n')}
`);
  process.exit(0);
}

main().catch(console.error);
