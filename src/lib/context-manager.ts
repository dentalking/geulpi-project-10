import type { UserContext, CalendarEvent } from '@/types';

class ContextManager {
    private contexts: Map<string, UserContext> = new Map();

    getContext(userId: string): UserContext {
        if (!this.contexts.has(userId)) {
            this.contexts.set(userId, {
                userId,
                currentTime: new Date(),
                timeZone: 'Asia/Seoul',
                preferences: {
                    workingHours: { start: 9, end: 18 },
                    briefingTime: '08:00',
                    language: 'ko',
                    defaultDuration: 60,
                    reminderMinutes: 15
                },
                recentEvents: [],
                patterns: {
                    frequentLocations: [],
                    commonMeetingTimes: [],
                    regularAttendees: [],
                    preferredDurations: new Map(),
                    eventTypePatterns: new Map()
                }
            });
        }

        const context = this.contexts.get(userId)!;
        context.currentTime = new Date(); // 항상 최신 시간으로 업데이트
        return context;
    }

    updateRecentEvents(userId: string, events: CalendarEvent[]) {
        const context = this.getContext(userId);
        context.recentEvents = events.slice(0, 10); // 최근 10개만 유지
    }

    updatePatterns(userId: string, events: CalendarEvent[]) {
        const context = this.getContext(userId);

        // 자주 사용하는 위치 추출
        const locations = events
            .map(e => e.location)
            .filter((loc): loc is string => Boolean(loc))
            .reduce((acc: Record<string, number>, loc: string) => {
                acc[loc] = (acc[loc] || 0) + 1;
                return acc;
            }, {});

        context.patterns.frequentLocations = Object.entries(locations)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([location]) => location);
    }
}

export const contextManager = new ContextManager();