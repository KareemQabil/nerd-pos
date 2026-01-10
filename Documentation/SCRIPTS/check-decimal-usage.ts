# Scripts: Check Decimal Usage

**Purpose**: Enforce Decimal.js for all money calculations  
**Run**: Pre-commit, CI/CD  
**Language**: TypeScript  

---

## **VALIDATION SCRIPT**

```typescript
// scripts/check-decimal-usage.ts
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface DecimalViolation {
  file: string;
  line: number;
  type: 'arithmetic' | 'toFixed' | 'parseFloat' | 'multiplication';
  code: string;
  message: string;
}

class DecimalChecker {
  private violations: DecimalViolation[] = [];
  
  // Money-related field names
  private moneyFields = [
    'price', 'cost', 'amount', 'total', 'subtotal', 'grandTotal',
    'tax', 'discount', 'fee', 'balance', 'payment', 'refund',
    'salary', 'wage', 'commission', 'bonus', 'revenue', 'expense'
  ];

  async check(): Promise<boolean> {
    console.log('💰 Checking Decimal.js usage for money calculations...\n');

    const files = await glob('src/**/*.{ts,tsx}', {
      ignore: ['**/*.spec.ts', '**/*.test.ts', '**/node_modules/**', '**/*.d.ts']
    });

    for (const file of files) {
      await this.checkFile(file);
    }

    this.printResults();

    return this.violations.length === 0;
  }

  private async checkFile(filePath: string): Promise<void> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    // Check if file imports Decimal
    const hasDecimalImport = content.includes("from 'decimal.js'") ||
                             content.includes('from "decimal.js"');

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const trimmedLine = line.trim();

      // Skip comments
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('/*') || trimmedLine.startsWith('*')) {
        return;
      }

      // Check 1: Direct arithmetic on money fields
      this.checkArithmetic(filePath, lineNumber, line);

      // Check 2: toFixed() without Decimal
      this.checkToFixed(filePath, lineNumber, line, hasDecimalImport);

      // Check 3: parseFloat on money
      this.checkParseFloat(filePath, lineNumber, line);

      // Check 4: Multiplication/division
      this.checkMultiplication(filePath, lineNumber, line);
    });
  }

  private checkArithmetic(file: string, line: number, code: string): void {
    for (const field of this.moneyFields) {
      // Pattern: price + something or something + price
      const arithmeticPattern = new RegExp(
        `\\b${field}\\s*[+\\-*/]\\s*\\w+|\\w+\\s*[+\\-*/]\\s*${field}\\b`,
        'g'
      );

      if (arithmeticPattern.test(code) && !code.includes('Decimal') && !code.includes('new Decimal')) {
        // Exclude comparisons (>, <, >=, <=, ==, ===)
        if (!/[<>=!]/.test(code)) {
          this.violations.push({
            file,
            line,
            type: 'arithmetic',
            code: code.trim(),
            message: `Direct arithmetic on '${field}' without Decimal.js`
          });
        }
      }
    }
  }

  private checkToFixed(file: string, line: number, code: string, hasDecimalImport: boolean): void {
    if (code.includes('.toFixed(') && !code.includes('Decimal')) {
      // Check if it's used on a money field
      for (const field of this.moneyFields) {
        if (code.includes(field)) {
          this.violations.push({
            file,
            line,
            type: 'toFixed',
            code: code.trim(),
            message: `Use Decimal.toFixed() instead of Number.toFixed() for money`
          });
          break;
        }
      }
    }
  }

  private checkParseFloat(file: string, line: number, code: string): void {
    if (code.includes('parseFloat(') || code.includes('Number(')) {
      for (const field of this.moneyFields) {
        if (code.includes(field)) {
          this.violations.push({
            file,
            line,
            type: 'parseFloat',
            code: code.trim(),
            message: `Use new Decimal() instead of parseFloat/Number for money`
          });
          break;
        }
      }
    }
  }

  private checkMultiplication(file: string, line: number, code: string): void {
    // Check for * or / with money fields
    for (const field of this.moneyFields) {
      const multiplicationPattern = new RegExp(
        `\\b${field}\\s*[*/]\\s*\\d+|\\d+\\s*[*/]\\s*${field}\\b`
      );

      if (multiplicationPattern.test(code) && !code.includes('Decimal')) {
        this.violations.push({
          file,
          line,
          type: 'multiplication',
          code: code.trim(),
          message: `Use Decimal.times() or Decimal.dividedBy() for money calculations`
        });
      }
    }
  }

  private printResults(): void {
    console.log('\n📊 Decimal.js Check Results\n');

    if (this.violations.length === 0) {
      console.log('✅ All money calculations use Decimal.js!\n');
      return;
    }

    console.log(`❌ Found ${this.violations.length} violations:\n`);

    // Group by type
    const byType = this.violations.reduce((acc, v) => {
      if (!acc[v.type]) acc[v.type] = [];
      acc[v.type].push(v);
      return acc;
    }, {} as Record<string, DecimalViolation[]>);

    Object.entries(byType).forEach(([type, violations]) => {
      console.log(`\n🚨 ${type.toUpperCase()} (${violations.length} violations)`);
      
      violations.slice(0, 10).forEach(v => {
        console.log(`\n   ${v.file}:${v.line}`);
        console.log(`   ${v.code}`);
        console.log(`   → ${v.message}`);
      });

      if (violations.length > 10) {
        console.log(`\n   ... and ${violations.length - 10} more`);
      }
    });

    console.log('\n\n💡 How to fix:');
    console.log('   ❌ const total = price * quantity;');
    console.log('   ✅ const total = new Decimal(price).times(quantity);');
    console.log('');
    console.log('   ❌ const formatted = price.toFixed(2);');
    console.log('   ✅ const formatted = new Decimal(price).toFixed(2);');
    console.log('');
    console.log('   ❌ const result = price + tax;');
    console.log('   ✅ const result = new Decimal(price).plus(tax);');
    console.log('');
  }
}

// ==================== Run checker ====================
async function main() {
  const checker = new DecimalChecker();
  const isValid = await checker.check();

  if (!isValid) {
    console.error('\n❌ Decimal.js validation failed!\n');
    process.exit(1);
  }

  console.log('✅ Decimal.js validation passed!\n');
  process.exit(0);
}

main().catch(error => {
  console.error('Check failed:', error);
  process.exit(1);
});
```

---

## **PACKAGE.JSON**

```json
{
  "scripts": {
    "check:decimal": "ts-node scripts/check-decimal-usage.ts",
    "check:decimal:fix": "npm run check:decimal -- --fix",
    "precommit": "npm run check:decimal && npm run validate && npm run test"
  }
}
```

---

## **AUTO-FIX MODE (Optional)**

```typescript
// Add --fix flag support
private async fixViolation(violation: DecimalViolation): Promise<void> {
  const content = fs.readFileSync(violation.file, 'utf-8');
  const lines = content.split('\n');
  let line = lines[violation.line - 1];

  switch (violation.type) {
    case 'arithmetic':
      // Transform: price + tax → new Decimal(price).plus(tax)
      line = this.fixArithmetic(line);
      break;

    case 'toFixed':
      // Transform: price.toFixed(2) → new Decimal(price).toFixed(2)
      line = this.fixToFixed(line);
      break;

    case 'parseFloat':
      // Transform: parseFloat(price) → new Decimal(price)
      line = this.fixParseFloat(line);
      break;

    case 'multiplication':
      // Transform: price * quantity → new Decimal(price).times(quantity)
      line = this.fixMultiplication(line);
      break;
  }

  lines[violation.line - 1] = line;
  fs.writeFileSync(violation.file, lines.join('\n'));
}

private fixArithmetic(line: string): string {
  // This is complex - pattern matching and AST manipulation
  // Consider using ts-morph or @babel/parser for accurate transformations
  return line.replace(
    /(\w+)\s*\+\s*(\w+)/g,
    'new Decimal($1).plus($2)'
  );
}
```

---

## **CI/CD INTEGRATION**

```yaml
# .github/workflows/decimal-check.yml
name: Check Decimal.js Usage

on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run check:decimal
```

---

## **COMMON VIOLATIONS**

### ❌ **Wrong:**
```typescript
// Direct arithmetic
const total = price + tax;
const result = quantity * price;
const avg = total / count;

// toFixed on Number
const formatted = price.toFixed(2);

// parseFloat
const parsed = parseFloat(priceString);
```

### ✅ **Correct:**
```typescript
// Decimal arithmetic
const total = new Decimal(price).plus(tax);
const result = new Decimal(quantity).times(price);
const avg = new Decimal(total).dividedBy(count);

// toFixed on Decimal
const formatted = new Decimal(price).toFixed(2);

// Decimal constructor
const parsed = new Decimal(priceString);
```

---

## **WHITELIST (Exceptions)**

```typescript
// config/decimal-whitelist.json
{
  "allowedFiles": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/migrations/**",
    "**/seeds/**"
  ],
  "allowedPatterns": [
    "console.log",
    "// @decimal-ignore"
  ]
}
```

---

**USAGE**

```bash
# Check for violations
npm run check:decimal

# Auto-fix (if implemented)
npm run check:decimal:fix

# Watch mode
nodemon --exec "npm run check:decimal"
```

---

**NEXT**: [generate-types.ts](generate-types.ts)
