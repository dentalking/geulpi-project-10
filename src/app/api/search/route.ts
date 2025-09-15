import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/supabase-auth';
import { LocalCalendarService } from '@/lib/local-calendar';
import { getCalendarClient } from '@/lib/google-auth';
import { convertGoogleEventsToCalendarEvents } from '@/utils/typeConverters';
import { logger } from '@/lib/logger';
import type { CalendarEvent } from '@/types';

interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  includeAutoComplete?: boolean;
  filters?: {
    dateRange?: string;
    type?: string;
    location?: boolean;
    tags?: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;

    logger.debug('Search API - Cookie check', { 
      hasAuthToken: !!authToken, 
      hasAccessToken: !!accessToken,
      cookies: cookieStore.getAll().map(c => c.name)
    });

    if (!authToken && !accessToken) {
      logger.warn('Search API - No authentication tokens found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SearchRequest = await request.json();
    const { 
      query, 
      limit = 20, 
      offset = 0, 
      includeAutoComplete = false,
      filters 
    } = body;

    // Validate query
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const searchTerm = query.trim().toLowerCase();
    let allEvents: CalendarEvent[] = [];
    let userId = 'anonymous';

    // Get events based on auth method
    if (authToken) {
      try {
        // Email auth - use LocalCalendarService
        const user = await verifyToken(authToken);
        if (!user) {
          logger.warn('Search API - Email auth token verification returned null');
          return NextResponse.json(
            { error: 'Invalid auth token' },
            { status: 401 }
          );
        }
        userId = user.id;
        const localCalendar = new LocalCalendarService(userId);
        allEvents = localCalendar.searchEvents(searchTerm);
        
        logger.debug('Search with email auth', { 
          userId, 
          query: searchTerm, 
          resultsCount: allEvents.length 
        });
      } catch (error) {
        logger.error('Email auth token validation failed', error);
        return NextResponse.json(
          { error: 'Invalid auth token' },
          { status: 401 }
        );
      }
    } else if (accessToken) {
      try {
        // Google OAuth - fetch from Google Calendar
        const calendar = getCalendarClient(accessToken);
        const now = new Date();
        
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          timeMax: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          maxResults: 250,
          singleEvents: true,
          orderBy: 'startTime',
          q: searchTerm // Google Calendar API's search parameter
        });

        const googleEvents = response.data.items || [];
        allEvents = convertGoogleEventsToCalendarEvents(googleEvents);
        
        logger.debug('Search with Google OAuth', { 
          query: searchTerm, 
          resultsCount: allEvents.length 
        });
      } catch (error) {
        logger.error('Google Calendar search failed', error);
        return NextResponse.json(
          { error: 'Failed to search Google Calendar' },
          { status: 500 }
        );
      }
    }

    // Apply date range filter
    if (filters?.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      allEvents = allEvents.filter(event => {
        const eventStartTime = event.start?.dateTime || event.start?.date;
        if (!eventStartTime) return false;
        const eventDate = new Date(eventStartTime);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    // Apply location filter
    if (filters?.location) {
      allEvents = allEvents.filter(event => event.location && event.location.length > 0);
    }

    // Calculate relevance scores and sort
    const scoredResults = allEvents.map(event => ({
      ...event,
      score: calculateRelevanceScore(event, searchTerm)
    }));

    // Sort by relevance score
    scoredResults.sort((a, b) => (b.score || 0) - (a.score || 0));

    // Apply pagination
    const paginatedResults = scoredResults.slice(offset, offset + limit);

    // Format results for the frontend
    const results = paginatedResults.map(event => ({
      id: event.id,
      type: 'event' as const,
      title: event.summary || 'Untitled Event',
      description: event.description,
      date: event.start?.dateTime || event.start?.date,
      location: event.location,
      score: event.score
    }));

    // Generate autocomplete suggestions
    let suggestions: string[] = [];
    if (includeAutoComplete && offset === 0) {
      // Get unique event titles that match the query
      const uniqueTitles = new Set<string>();
      allEvents.forEach(event => {
        if (event.summary && event.summary.toLowerCase().includes(searchTerm)) {
          uniqueTitles.add(event.summary);
        }
      });
      suggestions = Array.from(uniqueTitles).slice(0, 5);
    }

    const hasMore = offset + limit < scoredResults.length;

    // Save search to history (localStorage on client side)
    logger.info('Search completed', {
      userId,
      query: searchTerm,
      resultsCount: results.length,
      totalMatches: scoredResults.length
    });

    return NextResponse.json({
      results,
      suggestions,
      hasMore,
      total: scoredResults.length
    });

  } catch (error: any) {
    logger.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}

// Calculate relevance score for search results
function calculateRelevanceScore(event: CalendarEvent, searchTerm: string): number {
  let score = 0;
  const term = searchTerm.toLowerCase();
  
  // Title match (highest weight)
  if (event.summary?.toLowerCase().includes(term)) {
    score += 10;
    // Exact match bonus
    if (event.summary.toLowerCase() === term) {
      score += 5;
    }
    // Starts with bonus
    if (event.summary.toLowerCase().startsWith(term)) {
      score += 3;
    }
  }
  
  // Description match (medium weight)
  if (event.description?.toLowerCase().includes(term)) {
    score += 5;
  }
  
  // Location match (low weight)
  if (event.location?.toLowerCase().includes(term)) {
    score += 3;
  }
  
  // Recent events get a small boost
  const eventStartTime = event.start?.dateTime || event.start?.date;
  if (eventStartTime) {
    const daysDiff = Math.abs(new Date().getTime() - new Date(eventStartTime).getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 7) {
      score += 2;
    } else if (daysDiff < 30) {
      score += 1;
    }
  }
  
  return score;
}

// GET endpoint for search suggestions based on recent events
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;
    const accessToken = cookieStore.get('access_token')?.value;

    logger.debug('Search suggestions API - Cookie check', { 
      hasAuthToken: !!authToken, 
      hasAccessToken: !!accessToken 
    });

    if (!authToken && !accessToken) {
      logger.warn('Search suggestions API - No authentication tokens found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let popularTitles: string[] = [];

    if (authToken) {
      try {
        const user = await verifyToken(authToken);
        if (!user) {
          logger.warn('Search suggestions API - Email auth token verification returned null');
        } else {
          const localCalendar = new LocalCalendarService(user.id);
          const events = localCalendar.getEvents();
          
          // Get unique event titles
          const titles = new Set<string>();
          events.forEach(event => {
            if (event.summary) {
              titles.add(event.summary);
            }
          });
          popularTitles = Array.from(titles).slice(0, 10);
        }
      } catch (error) {
        logger.error('Failed to get suggestions', error);
      }
    } else if (accessToken) {
      try {
        const calendar = getCalendarClient(accessToken);
        const now = new Date();
        
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: now.toISOString(),
          timeMax: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          maxResults: 20,
          singleEvents: true,
          orderBy: 'startTime'
        });

        const googleEvents = response.data.items || [];
        const titles = new Set<string>();
        googleEvents.forEach(event => {
          if (event.summary) {
            titles.add(event.summary);
          }
        });
        popularTitles = Array.from(titles).slice(0, 10);
      } catch (error) {
        logger.error('Failed to get Google Calendar suggestions', error);
      }
    }

    return NextResponse.json({
      recent: [],  // Will be managed by client-side localStorage
      popular: popularTitles
    });

  } catch (error: any) {
    logger.error('Failed to get search suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}