#!/usr/bin/env ts-node

/**
 * Validate workflow documentation files
 * - Check file size < 12KB
 * - Verify required sections
 * - Validate code examples
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const MAX_FILE_SIZE = 12000; // 12KB in bytes
const WORKFLOW_DIRS = [
  'WORKFLOWS-BACKEND',
  'WORKFLOWS-FRONTEND',
  'WORKFLOWS-INTEGRATION',
];

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  size: number;
}

async function validateWorkflows() {
  console.log('🔍 Validating workflow documentation...\n');

  const results: ValidationResult[] = [];

  for (const dir of WORKFLOW_DIRS) {
    const pattern = path.join(__dirname, '../', dir, '*.md');
    const files = glob.sync(pattern);

    for (const file of files) {
      const result = validateFile(file);
      results.push(result);
    }
  }

  // Print results
  let hasErrors = false;

  for (const result of results) {
    const icon = result.valid ? '✅' : '❌';
    console.log(`${icon} ${path.basename(result.file)} (${result.size} bytes)`);

    if (result.errors.length > 0) {
      hasErrors = true;
      result.errors.forEach(error => console.log(`   ❌ ${error}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
    }

    console.log('');
  }

  // Summary
  const totalFiles = results.length;
  const validFiles = results.filter(r => r.valid).length;
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  console.log('═══════════════════════════════════════');
  console.log(`📊 Summary:`);
  console.log(`   Files validated: ${totalFiles}`);
  console.log(`   Valid: ${validFiles}`);
  console.log(`   Invalid: ${totalFiles - validFiles}`);
  console.log(`   Errors: ${totalErrors}`);
  console.log(`   Warnings: ${totalWarnings}`);
  console.log('═══════════════════════════════════════');

  if (hasErrors) {
    process.exit(1);
  }
}

function validateFile(filePath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Read file
  const content = fs.readFileSync(filePath, 'utf-8');
  const size = Buffer.byteLength(content, 'utf-8');

  // Check size
  if (size > MAX_FILE_SIZE) {
    errors.push(`File size (${size} bytes) exceeds limit (${MAX_FILE_SIZE} bytes)`);
  }

  // Check required sections
  const requiredSections = ['##'];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      warnings.push(`Missing section: ${section}`);
    }
  }

  // Check for code blocks
  const codeBlockCount = (content.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    errors.push('Unclosed code block detected');
  }

  if (codeBlockCount === 0) {
    warnings.push('No code examples found');
  }

  // Check for TypeScript examples
  if (!content.includes('```typescript') && !content.includes('```tsx')) {
    warnings.push('No TypeScript code examples found');
  }

  // Validate workflow structure
  const fileName = path.basename(filePath);
  if (fileName.match(/^\d{2}-/)) {
    // Numbered workflow file - should have step-by-step structure
    if (!content.includes('Step 1') && !content.includes('### **1.')) {
      warnings.push('Missing step-by-step structure');
    }
  }

  return {
    file: filePath,
    valid: errors.length === 0,
    errors,
    warnings,
    size,
  };
}

validateWorkflows();
