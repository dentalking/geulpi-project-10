import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Simple in-memory analytics (could be replaced with a database)
const suggestionAnalytics = new Map<string, {
  count: number;
  lastUsed: Date;
  category: string;
}>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suggestion, category, locale, sessionId, timestamp } = body;

    // Create analytics key
    const key = `${locale}-${category}-${suggestion}`;

    // Update analytics
    const existing = suggestionAnalytics.get(key) || { count: 0, lastUsed: new Date(), category };
    suggestionAnalytics.set(key, {
      count: existing.count + 1,
      lastUsed: new Date(timestamp),
      category
    });

    // Log for monitoring
    logger.info('[Suggestion Analytics] Tracked suggestion click', {
      suggestion,
      category,
      locale,
      sessionId,
      totalCount: existing.count + 1
    });

    // Clean up old entries if map gets too large (keep top 500)
    if (suggestionAnalytics.size > 500) {
      const entries = Array.from(suggestionAnalytics.entries());
      const sorted = entries.sort((a, b) => b[1].count - a[1].count);
      const toKeep = sorted.slice(0, 400);
      suggestionAnalytics.clear();
      toKeep.forEach(([key, value]) => suggestionAnalytics.set(key, value));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Suggestion Analytics] Failed to track', error);
    // Don't return error to client - analytics shouldn't interrupt user flow
    return NextResponse.json({ success: false });
  }
}

// Optional: GET endpoint to retrieve analytics
export async function GET() {
  try {
    const analytics = Array.from(suggestionAnalytics.entries()).map(([key, data]) => ({
      suggestion: key.split('-').slice(2).join('-'),
      locale: key.split('-')[0],
      category: data.category,
      count: data.count,
      lastUsed: data.lastUsed
    }));

    // Sort by count (most used first)
    analytics.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalSuggestions: analytics.length,
      topSuggestions: analytics.slice(0, 20),
      analytics: analytics
    });
  } catch (error) {
    logger.error('[Suggestion Analytics] Failed to retrieve', error);
    return NextResponse.json({ error: 'Failed to retrieve analytics' }, { status: 500 });
  }
}