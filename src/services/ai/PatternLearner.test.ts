import { describe, it, expect, beforeEach } from 'vitest';
import { PatternLearner } from './PatternLearner';
import type { CalendarEvent, PatternInsight } from '@/types';

describe('PatternLearner', () => {
  let patternLearner: PatternLearner;
  
  beforeEach(() => {
    patternLearner = new PatternLearner();
  });

  describe('analyzeUserBehavior', () => {
    it('should return empty insights for insufficient events', async () => {
      const events: CalendarEvent[] = [
        {
          id: '1',
          summary: 'Test Meeting',
          start: { dateTime: '2024-01-15T10:00:00Z' },
          end: { dateTime: '2024-01-15T11:00:00Z' }
        }
      ];

      const insights = await patternLearner.analyzeUserBehavior('user1', events);
      expect(insights).toEqual([]);
    });

    it('should detect meeting time patterns', async () => {
      const events: CalendarEvent[] = [
        { id: '1', summary: 'Meeting 1', start: { dateTime: '2024-01-15T10:00:00Z' }, end: { dateTime: '2024-01-15T11:00:00Z' } },
        { id: '2', summary: 'Meeting 2', start: { dateTime: '2024-01-16T10:00:00Z' }, end: { dateTime: '2024-01-16T11:00:00Z' } },
        { id: '3', summary: 'Meeting 3', start: { dateTime: '2024-01-17T10:00:00Z' }, end: { dateTime: '2024-01-17T11:00:00Z' } },
        { id: '4', summary: 'Meeting 4', start: { dateTime: '2024-01-18T10:00:00Z' }, end: { dateTime: '2024-01-18T11:00:00Z' } },
        { id: '5', summary: 'Meeting 5', start: { dateTime: '2024-01-19T10:00:00Z' }, end: { dateTime: '2024-01-19T11:00:00Z' } },
      ];

      const insights = await patternLearner.analyzeUserBehavior('user1', events);
      
      const timePattern = insights.find(i => i.type === 'meeting_pattern');
      expect(timePattern).toBeDefined();
      expect(timePattern?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect attendance patterns', async () => {
      const events: CalendarEvent[] = [
        { 
          id: '1', 
          summary: 'Team Meeting', 
          start: { dateTime: '2024-01-15T10:00:00Z' }, 
          end: { dateTime: '2024-01-15T11:00:00Z' },
          attendees: [
            { email: 'john@example.com' },
            { email: 'jane@example.com' }
          ]
        },
        { 
          id: '2', 
          summary: 'Project Review', 
          start: { dateTime: '2024-01-16T10:00:00Z' }, 
          end: { dateTime: '2024-01-16T11:00:00Z' },
          attendees: [
            { email: 'john@example.com' },
            { email: 'jane@example.com' },
            { email: 'bob@example.com' }
          ]
        },
        { 
          id: '3', 
          summary: 'Sprint Planning', 
          start: { dateTime: '2024-01-17T10:00:00Z' }, 
          end: { dateTime: '2024-01-17T11:00:00Z' },
          attendees: [
            { email: 'john@example.com' }
          ]
        },
        { 
          id: '4', 
          summary: 'Daily Standup', 
          start: { dateTime: '2024-01-18T10:00:00Z' }, 
          end: { dateTime: '2024-01-18T10:30:00Z' },
          attendees: [
            { email: 'john@example.com' },
            { email: 'jane@example.com' }
          ]
        },
        { 
          id: '5', 
          summary: 'Retrospective', 
          start: { dateTime: '2024-01-19T10:00:00Z' }, 
          end: { dateTime: '2024-01-19T11:00:00Z' },
          attendees: [
            { email: 'john@example.com' },
            { email: 'jane@example.com' },
            { email: 'bob@example.com' }
          ]
        }
      ];

      const insights = await patternLearner.analyzeUserBehavior('user1', events);
      
      const collaborationPattern = insights.find(i => i.type === 'collaboration_pattern');
      expect(collaborationPattern).toBeDefined();
      expect(collaborationPattern?.data?.topCollaborators).toBeDefined();
    });

    it('should detect duration patterns', async () => {
      const events: CalendarEvent[] = [
        { id: '1', summary: '1:1 Meeting', start: { dateTime: '2024-01-15T10:00:00Z' }, end: { dateTime: '2024-01-15T10:30:00Z' } },
        { id: '2', summary: '1:1 Sync', start: { dateTime: '2024-01-16T10:00:00Z' }, end: { dateTime: '2024-01-16T10:30:00Z' } },
        { id: '3', summary: '1:1 Check-in', start: { dateTime: '2024-01-17T10:00:00Z' }, end: { dateTime: '2024-01-17T10:30:00Z' } },
        { id: '4', summary: 'Workshop', start: { dateTime: '2024-01-18T10:00:00Z' }, end: { dateTime: '2024-01-18T12:00:00Z' } },
        { id: '5', summary: 'Training Session', start: { dateTime: '2024-01-19T10:00:00Z' }, end: { dateTime: '2024-01-19T12:00:00Z' } },
      ];

      const insights = await patternLearner.analyzeUserBehavior('user1', events);
      
      const durationPattern = insights.find(i => i.type === 'duration_pattern');
      expect(durationPattern).toBeDefined();
    });
  });

  describe('predictNextAction', () => {
    it('should predict actions based on patterns', async () => {
      // 먼저 패턴을 학습시킴
      const events: CalendarEvent[] = Array(10).fill(null).map((_, i) => ({
        id: `${i}`,
        summary: `Meeting ${i}`,
        start: { dateTime: `2024-01-${15 + i}T14:00:00Z` },
        end: { dateTime: `2024-01-${15 + i}T15:00:00Z` }
      }));

      await patternLearner.analyzeUserBehavior('user1', events);
      
      const predictions = await patternLearner.predictNextAction('user1', {});
      expect(Array.isArray(predictions)).toBe(true);
    });
  });

  describe('suggestOptimalTime', () => {
    it('should suggest optimal times based on patterns', async () => {
      const events: CalendarEvent[] = Array(10).fill(null).map((_, i) => ({
        id: `${i}`,
        summary: `Meeting ${i}`,
        start: { dateTime: `2024-01-${15 + i}T10:00:00Z` },
        end: { dateTime: `2024-01-${15 + i}T11:00:00Z` }
      }));

      await patternLearner.analyzeUserBehavior('user1', events);
      
      const suggestions = await patternLearner.suggestOptimalTime('user1', 'meeting', 60);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('analyzeWeeklyPattern', () => {
    it('should analyze weekly meeting patterns', () => {
      const events: CalendarEvent[] = [
        { id: '1', summary: 'Monday Meeting', start: { dateTime: '2024-01-15T10:00:00Z' }, end: { dateTime: '2024-01-15T11:00:00Z' } },
        { id: '2', summary: 'Monday Sync', start: { dateTime: '2024-01-15T14:00:00Z' }, end: { dateTime: '2024-01-15T15:00:00Z' } },
        { id: '3', summary: 'Tuesday Meeting', start: { dateTime: '2024-01-16T10:00:00Z' }, end: { dateTime: '2024-01-16T11:00:00Z' } },
        { id: '4', summary: 'Friday Review', start: { dateTime: '2024-01-19T10:00:00Z' }, end: { dateTime: '2024-01-19T11:00:00Z' } },
        { id: '5', summary: 'Friday Wrap-up', start: { dateTime: '2024-01-19T16:00:00Z' }, end: { dateTime: '2024-01-19T17:00:00Z' } },
      ];

      const weeklyPattern = patternLearner.analyzeWeeklyPattern(events);
      
      expect(weeklyPattern.busyDays).toBeDefined();
      expect(weeklyPattern.quietDays).toBeDefined();
      expect(weeklyPattern.meetingDensity).toBeDefined();
    });
  });
});