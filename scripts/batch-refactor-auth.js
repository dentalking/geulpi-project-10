#!/usr/bin/env node

/**
 * Batch refactoring script for auth API routes
 * Applies standard patterns to remaining auth routes
 */

const fs = require('fs').promises;
const path = require('path');

// Routes to refactor
const authRoutes = [
  'refresh/route.ts',
  'logout/route.ts',
  'forgot-password/route.ts',
  'reset-password/route.ts',
  'sessions/route.ts',
  '2fa/status/route.ts',
  '2fa/setup/route.ts',
  '2fa/verify-setup/route.ts',
  '2fa/enable/route.ts',
  '2fa/disable/route.ts',
  '2fa/verify-login/route.ts',
  'test/route.ts'
];

// Common imports to add
const commonImports = `import { logger } from '@/lib/logger';
import { env } from '@/lib/env';`;

// Function to detect if file needs refactoring
async function needsRefactoring(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return (
      content.includes('console.log') ||
      content.includes('console.error') ||
      content.includes('console.warn') ||
      content.includes('process.env.') ||
      !content.includes("import { logger }") ||
      !content.includes("withErrorHandling")
    );
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return false;
  }
}

// Simple console.log replacements
function replaceConsoleLogs(content) {
  // Replace console.log with logger.debug
  content = content.replace(/console\.log\(/g, 'logger.debug(');

  // Replace console.error with logger.error
  content = content.replace(/console\.error\(/g, 'logger.error(');

  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(/g, 'logger.warn(');

  return content;
}

// Replace process.env with env.get
function replaceProcessEnv(content) {
  // Replace process.env.NODE_ENV === 'production' with env.isProduction()
  content = content.replace(
    /process\.env\.NODE_ENV\s*===\s*['"]production['"]/g,
    'env.isProduction()'
  );

  // Replace process.env.NODE_ENV === 'development' with env.isDevelopment()
  content = content.replace(
    /process\.env\.NODE_ENV\s*===\s*['"]development['"]/g,
    'env.isDevelopment()'
  );

  // Replace other process.env.X with env.get('X')
  content = content.replace(
    /process\.env\.([A-Z_]+)/g,
    (match, p1) => `env.get('${p1}')`
  );

  return content;
}

// Add missing imports if needed
function ensureImports(content) {
  const hasLoggerImport = content.includes("import { logger }");
  const hasEnvImport = content.includes("import { env }");

  if (!hasLoggerImport || !hasEnvImport) {
    const lines = content.split('\n');
    const lastImportIndex = lines.findIndex(line =>
      line.includes('import') && !line.includes('type')
    );

    if (lastImportIndex !== -1) {
      const imports = [];
      if (!hasLoggerImport) imports.push("import { logger } from '@/lib/logger';");
      if (!hasEnvImport && content.includes('env.')) imports.push("import { env } from '@/lib/env';");

      if (imports.length > 0) {
        lines.splice(lastImportIndex + 1, 0, ...imports);
        content = lines.join('\n');
      }
    }
  }

  return content;
}

// Main refactoring function
async function refactorFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;

    // Apply transformations
    content = replaceConsoleLogs(content);
    content = replaceProcessEnv(content);
    content = ensureImports(content);

    // Only write if changes were made
    if (content !== originalContent) {
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error refactoring ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 Starting batch refactoring of auth routes...\n');

  const baseDir = path.join(__dirname, '..', 'src', 'app', 'api', 'auth');
  let refactoredCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const route of authRoutes) {
    const filePath = path.join(baseDir, route);
    const fileName = path.basename(path.dirname(filePath));

    try {
      // Check if file exists
      await fs.access(filePath);

      // Check if needs refactoring
      if (await needsRefactoring(filePath)) {
        console.log(`📝 Refactoring: auth/${route}`);

        if (await refactorFile(filePath)) {
          console.log(`✅ Refactored: auth/${route}`);
          refactoredCount++;
        } else {
          console.log(`⚠️  No changes needed: auth/${route}`);
          skippedCount++;
        }
      } else {
        console.log(`⏭️  Already refactored: auth/${route}`);
        skippedCount++;
      }
    } catch (error) {
      console.error(`❌ Error with auth/${route}: ${error.message}`);
      errorCount++;
    }

    console.log(''); // Empty line for readability
  }

  // Summary
  console.log('\n📊 Refactoring Summary:');
  console.log(`✅ Refactored: ${refactoredCount} files`);
  console.log(`⏭️  Skipped: ${skippedCount} files`);
  console.log(`❌ Errors: ${errorCount} files`);
  console.log('\n✨ Batch refactoring complete!');

  // Reminder
  if (refactoredCount > 0) {
    console.log('\n⚠️  Note: This script performs basic transformations.');
    console.log('Complex routes may need manual review for:');
    console.log('- withErrorHandling wrapper');
    console.log('- apiSuccess/ApiErrors usage');
    console.log('- validateBody implementation');
    console.log('- Supabase singleton pattern');
  }
}

// Run the script
main().catch(console.error);