# Codebase Migration Guide 🔧

## Overview
This guide documents the refactoring patterns implemented to improve code quality, security, and maintainability.

## Phase 1 Completed Changes ✅

### 1. Environment Variable Security
**Before:**
```typescript
const apiKey = process.env.GEMINI_API_KEY;
// No validation, could be undefined
```

**After:**
```typescript
import { env } from '@/lib/env';
const apiKey = env.get('GEMINI_API_KEY');
// Type-safe, validated at startup
```

**Migration Steps:**
1. Replace all `process.env.X` with `env.get('X')`
2. Use `env.getPublicConfig()` for client-side safe config
3. Check logs for any validation warnings at startup

### 2. Supabase Client Singleton Pattern
**Before:**
```typescript
// In every API route
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

**After:**
```typescript
import { getServiceRoleSupabase, requireAuth } from '@/lib/supabase-server';

// For admin operations
const supabase = getServiceRoleSupabase();

// For authenticated operations
const user = await requireAuth();
```

**Available Functions:**
- `getServiceRoleSupabase()` - Admin access, bypasses RLS
- `getServerSupabase()` - Anon key, respects RLS
- `getAuthenticatedSupabase()` - User session aware
- `getCurrentUser()` - Get current user or null
- `requireAuth()` - Throws if not authenticated

### 3. Logging Service
**Before:**
```typescript
console.log('Debug info', data);
console.error('Error occurred', error);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.debug('Debug info', data);
logger.info('Operation completed', { userId, action });
logger.warn('Deprecated function used');
logger.error('Operation failed', error, 'API');
```

**Log Levels:**
- `debug` - Detailed debugging (dev only)
- `info` - General information
- `warn` - Warning messages
- `error` - Error messages (tracked in production)

### 4. Standardized API Responses
**Before:**
```typescript
// Inconsistent responses
return NextResponse.json({ data }, { status: 200 });
return NextResponse.json({ error: 'Failed' }, { status: 500 });
```

**After:**
```typescript
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';

// Success response
return apiSuccess({ users }, 'Users fetched successfully');

// Error responses
return ApiErrors.unauthorized();
return ApiErrors.notFound('User');
return ApiErrors.validationError(['Invalid email']);
return ApiErrors.databaseError('Query failed');

// Validation
const validation = validateBody(body, ['email', 'name']);
if (!validation.valid) {
  return ApiErrors.validationError(validation.errors);
}

// Automatic error handling
export const GET = withErrorHandling(async (req) => {
  // Your code here - errors automatically handled
});
```

## Example: Complete API Route Refactor

### Before:
```typescript
export async function POST(req: NextRequest) {
  console.log('Creating notification');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const body = await req.json();

    if (!body.title || !body.message) {
      return NextResponse.json(
        { error: 'Missing fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(body);

    if (error) {
      console.error('Error:', error);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal error' },
      { status: 500 }
    );
  }
}
```

### After:
```typescript
import { logger } from '@/lib/logger';
import { getServiceRoleSupabase, requireAuth } from '@/lib/supabase-server';
import { apiSuccess, ApiErrors, validateBody, withErrorHandling } from '@/lib/api-utils';

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Authenticate user
  const user = await requireAuth();
  const supabase = getServiceRoleSupabase();

  const body = await req.json();

  // Validate required fields
  const validation = validateBody(body, ['title', 'message']);
  if (!validation.valid) {
    return ApiErrors.validationError(validation.errors);
  }

  logger.debug('Creating notification', { userId: user.id });

  const { data, error } = await supabase
    .from('notifications')
    .insert({ ...body, user_id: user.id })
    .select()
    .single();

  if (error) {
    logger.error('Notification creation error', error, 'API');
    return ApiErrors.databaseError('Failed to create notification');
  }

  logger.info(`Created notification ${data.id} for user ${user.id}`);
  return apiSuccess({ notification: data }, 'Notification created successfully');
});
```

## Quick Reference Checklist

### For New API Routes:
- [ ] Use `withErrorHandling` wrapper
- [ ] Use `requireAuth()` for authenticated endpoints
- [ ] Use `getServiceRoleSupabase()` singleton
- [ ] Use `validateBody()` for input validation
- [ ] Use `apiSuccess()` and `ApiErrors` for responses
- [ ] Use `logger` instead of console

### For Existing Code:
- [ ] Replace `console.log` → `logger.debug`
- [ ] Replace `console.error` → `logger.error`
- [ ] Replace `process.env.X` → `env.get('X')`
- [ ] Replace `createClient()` → `getServiceRoleSupabase()`
- [ ] Wrap handlers with `withErrorHandling`
- [ ] Standardize response format

## File Organization

### Documentation moved to `/docs`:
All `.md` files have been moved from root to `/docs/archive/` for better organization.

### Import Paths:
```typescript
// Core utilities
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

// Supabase utilities
import {
  getServiceRoleSupabase,
  getServerSupabase,
  requireAuth
} from '@/lib/supabase-server';

// API utilities
import {
  apiSuccess,
  ApiErrors,
  validateBody,
  withErrorHandling,
  paginatedResponse
} from '@/lib/api-utils';
```

## Testing Your Changes

### 1. Environment Validation
```bash
npm run dev
# Check console for any env warnings
```

### 2. Logger Output
```bash
# Development shows all levels
NODE_ENV=development npm run dev

# Production only shows warn/error
NODE_ENV=production npm run build && npm start
```

### 3. API Response Format
All API responses should follow:
```json
// Success
{
  "success": true,
  "data": {...},
  "message": "Optional message",
  "metadata": {
    "timestamp": "2025-09-21T..."
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": ["field specific errors"]
  },
  "metadata": {
    "timestamp": "2025-09-21T..."
  }
}
```

## Common Pitfalls to Avoid

1. **Don't create new Supabase clients** - Use the singletons
2. **Don't use console.log in production code** - Use logger
3. **Don't access process.env directly** - Use env.get()
4. **Don't return inconsistent API responses** - Use utilities
5. **Don't skip validation** - Always validate inputs
6. **Don't ignore errors** - Log them properly

## Questions or Issues?

If you encounter any issues during migration:
1. Check the logger output for detailed error messages
2. Verify environment variables are properly set
3. Ensure you're using the latest utility functions
4. Reference the refactored `/api/notifications/route.ts` as an example

## Next Steps

After applying these patterns:
1. Run `npm run lint` to check for remaining issues
2. Test your API endpoints thoroughly
3. Monitor logs for any deprecation warnings
4. Consider adding unit tests for critical functions

---

*Last Updated: 2025-09-21*
*Migration Guide Version: 1.0*