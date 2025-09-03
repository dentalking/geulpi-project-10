/**
 * 캘린더 API 통합 테스트
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => ({ value: 'mock-access-token' }))
  }))
}));

// Mock Google Calendar Client
vi.mock('@/lib/google-auth', () => ({
  getCalendarClient: vi.fn(() => ({
    events: {
      list: vi.fn(() => Promise.resolve({
        data: {
          items: [
            {
              id: 'test-event-1',
              summary: '테스트 미팅',
              start: { dateTime: '2024-01-15T10:00:00+09:00' },
              end: { dateTime: '2024-01-15T11:00:00+09:00' }
            },
            {
              id: 'test-event-2',
              summary: '점심 약속',
              start: { dateTime: '2024-01-15T12:00:00+09:00' },
              end: { dateTime: '2024-01-15T13:00:00+09:00' }
            }
          ]
        }
      })),
      insert: vi.fn(() => Promise.resolve({
        data: {
          id: 'new-event-id',
          summary: '새 일정',
          start: { dateTime: '2024-01-16T14:00:00+09:00' },
          end: { dateTime: '2024-01-16T15:00:00+09:00' }
        }
      })),
      update: vi.fn(() => Promise.resolve({
        data: {
          id: 'test-event-1',
          summary: '수정된 미팅',
          start: { dateTime: '2024-01-15T11:00:00+09:00' },
          end: { dateTime: '2024-01-15T12:00:00+09:00' }
        }
      })),
      delete: vi.fn(() => Promise.resolve()),
      get: vi.fn(() => Promise.resolve({
        data: {
          id: 'test-event-1',
          summary: '테스트 미팅',
          start: { dateTime: '2024-01-15T10:00:00+09:00' },
          end: { dateTime: '2024-01-15T11:00:00+09:00' }
        }
      }))
    }
  }))
}));

describe('Calendar API Integration Tests', () => {
  describe('GET /api/calendar/events', () => {
    it('should fetch events successfully', async () => {
      const { GET } = await import('@/app/api/calendar/events/route');
      
      const request = new Request('http://localhost:3000/api/calendar/events?maxResults=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.events).toHaveLength(2);
      expect(data.events[0].summary).toBe('테스트 미팅');
    });

    it('should handle missing authentication', async () => {
      vi.resetModules();
      vi.mock('next/headers', () => ({
        cookies: vi.fn(() => ({
          get: vi.fn(() => null)
        }))
      }));

      const { GET } = await import('@/app/api/calendar/events/route');
      const request = new Request('http://localhost:3000/api/calendar/events');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/calendar/events', () => {
    it('should create event successfully', async () => {
      const { POST } = await import('@/app/api/calendar/events/route');
      
      const eventData = {
        summary: '새 일정',
        startDateTime: '2024-01-16T14:00:00+09:00',
        endDateTime: '2024-01-16T15:00:00+09:00',
        location: '회의실 A',
        description: '중요한 미팅'
      };

      const request = new Request('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.event.id).toBe('new-event-id');
      expect(data.message).toContain('새 일정');
    });

    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/calendar/events/route');
      
      const invalidData = {
        summary: '제목만 있는 일정'
        // startDateTime, endDateTime 누락
      };

      const request = new Request('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('필수 필드');
    });

    it('should validate date range', async () => {
      const { POST } = await import('@/app/api/calendar/events/route');
      
      const invalidDateRange = {
        summary: '잘못된 시간',
        startDateTime: '2024-01-16T15:00:00+09:00',
        endDateTime: '2024-01-16T14:00:00+09:00' // 종료가 시작보다 빠름
      };

      const request = new Request('http://localhost:3000/api/calendar/events', {
        method: 'POST',
        body: JSON.stringify(invalidDateRange)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(data.error.message).toContain('시작 시간이 종료 시간보다');
    });
  });

  describe('PUT /api/calendar/events', () => {
    it('should update event successfully', async () => {
      const { PUT } = await import('@/app/api/calendar/events/route');
      
      const updateData = {
        eventId: 'test-event-1',
        updates: {
          summary: '수정된 미팅',
          startDateTime: '2024-01-15T11:00:00+09:00',
          endDateTime: '2024-01-15T12:00:00+09:00'
        }
      };

      const request = new Request('http://localhost:3000/api/calendar/events', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.event.summary).toBe('수정된 미팅');
    });

    it('should require event ID', async () => {
      const { PUT } = await import('@/app/api/calendar/events/route');
      
      const updateData = {
        updates: { summary: '수정된 제목' }
        // eventId 누락
      };

      const request = new Request('http://localhost:3000/api/calendar/events', {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Event ID is required');
    });
  });

  describe('DELETE /api/calendar/events', () => {
    it('should delete event successfully', async () => {
      const { DELETE } = await import('@/app/api/calendar/events/route');
      
      const deleteData = {
        eventId: 'test-event-1'
      };

      const request = new Request('http://localhost:3000/api/calendar/events', {
        method: 'DELETE',
        body: JSON.stringify(deleteData)
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedEventId).toBe('test-event-1');
    });

    it('should require event ID', async () => {
      const { DELETE } = await import('@/app/api/calendar/events/route');
      
      const request = new Request('http://localhost:3000/api/calendar/events', {
        method: 'DELETE',
        body: JSON.stringify({})
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Event ID is required');
    });
  });
});