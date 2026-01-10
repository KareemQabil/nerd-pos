# Scripts: Validate Architecture

**Purpose**: Enforce architectural rules  
**Run**: Pre-commit, CI/CD  
**Language**: TypeScript (ts-node)  

---

## **VALIDATION SCRIPT**

```typescript
// scripts/validate-architecture.ts
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ValidationError {
  file: string;
  line: number;
  rule: string;
  message: string;
}

class ArchitectureValidator {
  private errors: ValidationError[] = [];
  private srcPath: string;

  constructor() {
    this.srcPath = path.join(process.cwd(), 'src');
  }

  async validate(): Promise<boolean> {
    console.log('🔍 Validating architecture...\n');

    await this.checkDecimalUsage();
    await this.checkRepositoryPattern();
    await this.checkEventBusUsage();
    await this.checkModuleBoundaries();
    await this.checkDTOValidation();

    this.printResults();

    return this.errors.length === 0;
  }

  // ==================== RULE 1: Decimal.js for money ====================
  async checkDecimalUsage(): Promise<void> {
    console.log('Checking Decimal.js usage for money calculations...');

    const files = await glob('src/**/*.{ts,tsx}', {
      ignore: ['**/*.spec.ts', '**/*.test.ts', '**/node_modules/**']
    });

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for direct arithmetic on price/amount fields
        const moneyArithmetic = /\b(price|amount|total|cost|subtotal|grandTotal|tax)\s*[\+\-\*\/]\s*/;
        
        if (moneyArithmetic.test(line) && !line.includes('Decimal')) {
          this.errors.push({
            file,
            line: index + 1,
            rule: 'DECIMAL_USAGE',
            message: 'Money calculation must use Decimal.js, not direct arithmetic'
          });
        }

        // Check for toFixed without Decimal
        if (line.includes('.toFixed(') && !line.includes('Decimal')) {
          const hasMoneyField = /(price|amount|total|cost)/i.test(line);
          if (hasMoneyField) {
            this.errors.push({
              file,
              line: index + 1,
              rule: 'DECIMAL_USAGE',
              message: 'Use Decimal.toFixed() instead of Number.toFixed() for money'
            });
          }
        }
      });
    }
  }

  // ==================== RULE 2: Repository pattern ====================
  async checkRepositoryPattern(): Promise<void> {
    console.log('Checking repository pattern...');

    const serviceFiles = await glob('src/**/services/*.service.ts');

    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Check for direct Prisma usage in services
        if (line.includes('this.prisma.') && !file.includes('repository')) {
          this.errors.push({
            file,
            line: index + 1,
            rule: 'REPOSITORY_PATTERN',
            message: 'Services must not use Prisma directly. Use repositories instead.'
          });
        }

        // Check for direct DB queries
        if (line.match(/\.(findMany|findUnique|create|update|delete)\(/)) {
          if (!file.includes('repository')) {
            this.errors.push({
              file,
              line: index + 1,
              rule: 'REPOSITORY_PATTERN',
              message: 'Services must not use direct DB queries. Use repositories.'
            });
          }
        }
      });
    }
  }

  // ==================== RULE 3: Event Bus usage ====================
  async checkEventBusUsage(): Promise<void> {
    console.log('Checking EventBus usage for state changes...');

    const serviceFiles = await glob('src/**/services/*.service.ts');

    for (const file of serviceFiles) {
      const content = fs.readFileSync(file, 'utf-8');

      // Check for state-changing methods without events
      const methods = [
        'create', 'update', 'delete', 'submit', 'complete', 
        'approve', 'reject', 'cancel'
      ];

      methods.forEach(method => {
        const methodRegex = new RegExp(`async\\s+${method}\\s*\\([^)]*\\)`, 'g');
        const matches = content.match(methodRegex);

        if (matches) {
          // Check if method emits event
          const methodStart = content.indexOf(matches[0]);
          const nextMethod = content.indexOf('async ', methodStart + 1);
          const methodBody = content.substring(
            methodStart,
            nextMethod === -1 ? content.length : nextMethod
          );

          if (!methodBody.includes('eventBus.publish')) {
            const lineNumber = content.substring(0, methodStart).split('\n').length;
            
            this.errors.push({
              file,
              line: lineNumber,
              rule: 'EVENT_BUS',
              message: `Method '${method}' should emit an event after state change`
            });
          }
        }
      });
    }
  }

  // ==================== RULE 4: Module boundaries ====================
  async checkModuleBoundaries(): Promise<void> {
    console.log('Checking module boundaries...');

    const moduleFiles = await glob('src/modules/**/services/*.service.ts');

    for (const file of moduleFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const currentModule = file.split('/modules/')[1].split('/')[0];

      // Check for direct imports from other modules
      const importRegex = /from\s+['"]@\/modules\/([^\/]+)\//g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        const importedModule = match[1];

        if (importedModule !== currentModule) {
          // Only repositories and DTOs should be imported
          if (!content.includes(`${importedModule}Repository`) && 
              !content.includes('Dto')) {
            
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            this.errors.push({
              file,
              line: lineNumber,
              rule: 'MODULE_BOUNDARIES',
              message: `Module '${currentModule}' should not directly import from '${importedModule}'. Use events or shared interfaces.`
            });
          }
        }
      }
    }
  }

  // ==================== RULE 5: DTO validation ====================
  async checkDTOValidation(): Promise<void> {
    console.log('Checking DTO validation decorators...');

    const dtoFiles = await glob('src/**/dto/*.dto.ts');

    for (const file of dtoFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      let insideClass = false;
      let lastDecorator = false;

      lines.forEach((line, index) => {
        if (line.includes('export class') && line.includes('Dto')) {
          insideClass = true;
        }

        if (insideClass) {
          // Check if property has decorator
          if (line.trim().match(/^\w+[\?]?:\s*(string|number|boolean|Date)/)) {
            if (!lastDecorator) {
              this.errors.push({
                file,
                line: index + 1,
                rule: 'DTO_VALIDATION',
                message: 'DTO property must have validation decorator (@IsString, @IsNumber, etc.)'
              });
            }
            lastDecorator = false;
          }

          // Check for decorators
          if (line.trim().startsWith('@Is') || line.trim().startsWith('@ValidateNested')) {
            lastDecorator = true;
          } else if (!line.trim().startsWith('//') && line.trim() !== '') {
            lastDecorator = false;
          }
        }
      });
    }
  }

  // ==================== Print results ====================
  private printResults(): void {
    console.log('\n📊 Validation Results\n');

    if (this.errors.length === 0) {
      console.log('✅ All architecture rules passed!\n');
      return;
    }

    console.log(`❌ Found ${this.errors.length} violations:\n`);

    // Group by rule
    const byRule = this.errors.reduce((acc, error) => {
      if (!acc[error.rule]) acc[error.rule] = [];
      acc[error.rule].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    Object.entries(byRule).forEach(([rule, errors]) => {
      console.log(`\n🚨 ${rule} (${errors.length} violations)`);
      errors.forEach(error => {
        console.log(`   ${error.file}:${error.line}`);
        console.log(`   ${error.message}\n`);
      });
    });
  }
}

// ==================== Run validator ====================
async function main() {
  const validator = new ArchitectureValidator();
  const isValid = await validator.validate();

  if (!isValid) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Validation failed:', error);
  process.exit(1);
});
```

---

## **PACKAGE.JSON**

```json
{
  "scripts": {
    "validate": "ts-node scripts/validate-architecture.ts",
    "validate:watch": "nodemon --exec ts-node scripts/validate-architecture.ts",
    "precommit": "npm run validate && npm run lint && npm run test"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "glob": "^10.3.10",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

---

## **HUSKY PRE-COMMIT**

```bash
#!/bin/sh
# .husky/pre-commit

npm run validate
```

---

## **CI/CD (GitHub Actions)**

```yaml
# .github/workflows/validate.yml
name: Validate Architecture

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run validate
```

---

## **RULES ENFORCED**

1. **DECIMAL_USAGE** - All money calculations use Decimal.js
2. **REPOSITORY_PATTERN** - Services use repositories, not Prisma
3. **EVENT_BUS** - State changes emit events
4. **MODULE_BOUNDARIES** - No direct cross-module imports
5. **DTO_VALIDATION** - All DTO properties have validators

---

## **USAGE**

```bash
# Run validation
npm run validate

# Watch mode (during development)
npm run validate:watch

# CI/CD
# Automatically runs on git push
```

---

**NEXT**: [generate-types.ts](generate-types.ts)
