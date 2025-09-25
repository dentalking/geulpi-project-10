#!/usr/bin/env node

/**
 * Batch refactoring script for all remaining API routes
 * Applies standard patterns to API routes
 */

const fs = require('fs').promises;
const path = require('path');

// Categories to refactor
const categories = [
  {
    name: 'friends',
    path: 'friends',
    files: [
      'route.ts',
      'add/route.ts',
      'request/route.ts',
      'respond/route.ts',
      'requests/route.ts',
      'availability/route.ts',
      'schedule-meeting/route.ts',
      'integrated/route.ts',
      'requests/integrated/route.ts'
    ]
  },
  {
    name: 'calendar',
    path: 'calendar',
    files: [
      'events/route.ts',
      'events/[id]/route.ts',
      'create/route.ts',
      'update/route.ts',
      'delete/route.ts',
      'sync/route.ts'
    ]
  },
  {
    name: 'events',
    path: 'events',
    files: [
      'route.ts',
      'share/route.ts',
      'shared/route.ts'
    ]
  },
  {
    name: 'email',
    path: 'email',
    files: [
      'send-invitation/route.ts'
    ]
  },
  {
    name: 'invitations',
    path: 'invitations',
    files: [
      'accept/route.ts',
      'info/route.ts'
    ]
  },
  {
    name: 'profile',
    path: 'profile',
    files: [
      'route.ts'
    ]
  },
  {
    name: 'user',
    path: 'user',
    files: [
      'profile/route.ts',
      'change-password/route.ts'
    ]
  },
  {
    name: 'maps',
    path: 'maps',
    files: [
      'places/route.ts',
      'search/route.ts',
      'midpoint/route.ts'
    ]
  },
  {
    name: 'ai',
    path: 'ai',
    files: [
      'chat/route.ts',
      'suggestions/route.ts',
      'process-image/route.ts'
    ]
  },
  {
    name: 'chat',
    path: 'chat',
    files: [
      'messages/[messageId]/route.ts'
    ]
  },
  {
    name: 'admin',
    path: 'admin',
    files: [
      'cleanup-sessions/route.ts',
      'check-chat-db/route.ts',
      'setup-chat-db/route.ts'
    ]
  },
  {
    name: 'health',
    path: 'health',
    files: [
      'route.ts'
    ]
  },
  {
    name: 'cron',
    path: 'cron',
    files: [
      'notifications/route.ts'
    ]
  },
  {
    name: 'kakao',
    path: 'kakao',
    files: [
      'webhook/route.ts'
    ]
  },
  {
    name: 'discord',
    path: 'discord',
    files: [
      'webhook/route.ts'
    ]
  },
  {
    name: 'ws',
    path: 'ws',
    files: [
      'notifications/route.ts'
    ]
  }
];

// Function to detect if file needs refactoring
async function needsRefactoring(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return (
      content.includes('console.log') ||
      content.includes('console.error') ||
      content.includes('console.warn') ||
      (content.includes('process.env.') && !content.includes('env.get')) ||
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
  // Replace console.log with logger.debug or logger.info based on context
  content = content.replace(/console\.log\(/g, 'logger.debug(');

  // Replace console.error with logger.error
  content = content.replace(/console\.error\(/g, 'logger.error(');

  // Replace console.warn with logger.warn
  content = content.replace(/console\.warn\(/g, 'logger.warn(');

  return content;
}

// Replace process.env with env.get
function replaceProcessEnv(content) {
  // Skip if already using env.get
  if (content.includes('env.get') || content.includes('env.isProduction')) {
    return content;
  }

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
    /process\.env\.([A-Z_]+)(?!\s*\|\|)/g,
    (match, p1) => `env.get('${p1}')`
  );

  return content;
}

// Add missing imports if needed
function ensureImports(content) {
  const hasLoggerImport = content.includes("import { logger }");
  const hasEnvImport = content.includes("import { env }");
  const needsEnv = content.includes('env.') || content.includes('process.env');

  if (!hasLoggerImport || (!hasEnvImport && needsEnv)) {
    const lines = content.split('\n');
    const lastImportIndex = lines.findIndex(line =>
      line.includes('import') && !line.includes('type')
    );

    if (lastImportIndex !== -1) {
      const imports = [];
      if (!hasLoggerImport) imports.push("import { logger } from '@/lib/logger';");
      if (!hasEnvImport && needsEnv) imports.push("import { env } from '@/lib/env';");

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
  console.log('🔧 Starting batch refactoring of API routes...\n');

  const baseDir = path.join(__dirname, '..', 'src', 'app', 'api');
  let totalRefactored = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const category of categories) {
    console.log(`\n📂 Processing ${category.name} routes...`);
    console.log('─'.repeat(40));

    let categoryRefactored = 0;
    let categorySkipped = 0;
    let categoryErrors = 0;

    for (const file of category.files) {
      const filePath = path.join(baseDir, category.path, file);

      try {
        // Check if file exists
        await fs.access(filePath);

        // Check if needs refactoring
        if (await needsRefactoring(filePath)) {
          console.log(`  📝 Refactoring: ${category.path}/${file}`);

          if (await refactorFile(filePath)) {
            console.log(`  ✅ Refactored: ${category.path}/${file}`);
            categoryRefactored++;
          } else {
            console.log(`  ⚠️  No changes: ${category.path}/${file}`);
            categorySkipped++;
          }
        } else {
          console.log(`  ⏭️  Already done: ${category.path}/${file}`);
          categorySkipped++;
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`  ⚠️  Not found: ${category.path}/${file}`);
        } else {
          console.error(`  ❌ Error: ${category.path}/${file}: ${error.message}`);
        }
        categoryErrors++;
      }
    }

    // Category summary
    console.log(`  └─ Summary: ${categoryRefactored} refactored, ${categorySkipped} skipped, ${categoryErrors} errors`);

    totalRefactored += categoryRefactored;
    totalSkipped += categorySkipped;
    totalErrors += categoryErrors;
  }

  // Overall summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Overall Refactoring Summary:');
  console.log(`✅ Refactored: ${totalRefactored} files`);
  console.log(`⏭️  Skipped: ${totalSkipped} files`);
  console.log(`❌ Errors: ${totalErrors} files`);
  console.log('═'.repeat(50));
  console.log('\n✨ Batch refactoring complete!');

  // Reminder
  if (totalRefactored > 0) {
    console.log('\n⚠️  Note: This script performs basic transformations.');
    console.log('Complex routes may still need manual review for:');
    console.log('- withErrorHandling wrapper');
    console.log('- apiSuccess/ApiErrors usage');
    console.log('- validateBody implementation');
    console.log('- Supabase singleton pattern');
    console.log('- requireAuth middleware');
  }
}

// Run the script
main().catch(console.error);