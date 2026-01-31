#!/usr/bin/env ts-node
/**
 * Repository Type Safety Fix Script
 * Automated fix for 242+ `as any` violations in repository layer
 * 
 * CRITICAL P0 ISSUE:
 * All repositories use `(this.prisma as any).modelName` 
 * instead of proper `this.prisma.modelName` typing
 * 
 * This script:
 * 1. Scans all .repository.ts files
 * 2. Replaces `(this.prisma as any).X` with `this.prisma.X`
 * 3. Generates report of changes
 * 
 * Author: Senior Backend Architect
 * Date: 2026-01-31
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface FixResult {
    file: string;
    originalCount: number;
    fixedCount: number;
    patterns: string[];
}

class RepositoryTypeFixer {
    private results: FixResult[] = [];
    private readonly REPO_PATTERN = 'src/modules/**/*.repository.ts';

    // Regex patterns for different `as any` usages
    private readonly patterns = [
        {
            name: 'Prisma instance casting',
            regex: /\(this\.prisma as any\)\.(\w+)/g,
            replacement: 'this.prisma.$1',
        },
        {
            name: 'Direct prisma casting',
            regex: /\(prisma as any\)\.(\w+)/g,
            replacement: 'prisma.$1',
        },
    ];

    async run(): Promise<void> {
        console.log(`
╔════════════════════════════════════════════════════════╗
║   Repository Type Safety Fix Tool                     ║
║   Fixing 242+ 'as any' violations                     ║
╚════════════════════════════════════════════════════════╝
`);

        // Find all repository files
        const files = await glob(this.REPO_PATTERN);
        console.log(`📁 Found ${files.length} repository files\n`);

        for (const file of files) {
            await this.fixFile(file);
        }

        this.printSummary();
    }

    private async fixFile(filePath: string): Promise<void> {
        const content = fs.readFileSync(filePath, 'utf-8');
        let modified = content;
        const patternsFound: string[] = [];
        let totalReplacements = 0;

        // Count original `as any` occurrences
        const originalCount = (content.match(/as any/g) || []).length;

        // Apply each pattern fix
        for (const pattern of this.patterns) {
            const matches = content.match(pattern.regex);
            if (matches && matches.length > 0) {
                patternsFound.push(pattern.name);
                modified = modified.replace(pattern.regex, pattern.replacement);
                totalReplacements += matches.length;
            }
        }

        // Count remaining `as any` occurrences
        const fixedCount = (modified.match(/as any/g) || []).length;

        if (originalCount !== fixedCount) {
            // Write fixed content back to file
            fs.writeFileSync(filePath, modified, 'utf-8');

            this.results.push({
                file: path.relative(process.cwd(), filePath),
                originalCount,
                fixedCount,
                patterns: patternsFound,
            });

            const reduction = originalCount - fixedCount;
            console.log(`✅ ${path.basename(filePath)}: Fixed ${reduction} violations`);
        }
    }

    private printSummary(): void {
        const totalOriginal = this.results.reduce((sum, r) => sum + r.originalCount, 0);
        const totalFixed = this.results.reduce((sum, r) => sum + r.fixedCount, 0);
        const totalReduction = totalOriginal - totalFixed;

        console.log(`
╔════════════════════════════════════════════════════════╗
║                   FIX SUMMARY                          ║
╚════════════════════════════════════════════════════════╝
`);

        console.log(`Files Modified:       ${this.results.length}`);
        console.log(`Original 'as any':    ${totalOriginal}`);
        console.log(`Remaining 'as any':   ${totalFixed}`);
        console.log(`✅ Violations Fixed:   ${totalReduction}`);
        console.log(`📊 Success Rate:       ${((totalReduction / totalOriginal) * 100).toFixed(2)}%\n`);

        if (totalFixed > 0) {
            console.log(`⚠️  WARNING: ${totalFixed} 'as any' instances remain`);
            console.log(`   These require MANUAL review (likely in test mocks)\n`);
        }

        console.log(`\n📝 NEXT STEPS:`);
        console.log(`   1. Review changes: git diff`);
        console.log(`   2. Run build: npm run build`);
        console.log(`   3. Run tests: npm test`);
        console.log(`   4. Commit if tests pass: git commit -am "fix: remove as any from repositories"`);
        console.log(``);

        if (totalReduction > 0) {
            console.log(`✅ Repository type safety restored!\n`);
            process.exit(0);
        } else {
            console.log(`❌ No fixes applied. Manual review required.\n`);
            process.exit(1);
        }
    }
}

// Execute
const fixer = new RepositoryTypeFixer();
fixer.run().catch(error => {
    console.error(`\n🔥 Fatal Error:`, error);
    process.exit(1);
});
