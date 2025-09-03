import type { UserContext, CalendarEvent, UserPattern, ConversationHistory } from '@/types';

interface PendingClarification {
  type: 'date' | 'time' | 'person' | 'location' | 'duration';
  options: string[];
  originalQuery: string;
}

interface ConversationContext {
  lastMentionedDate?: Date;
  lastMentionedPerson?: string;
  lastMentionedLocation?: string;
  lastEventCreated?: CalendarEvent;
  pendingClarification?: PendingClarification;
}

/**
 * 사용자 컨텍스트 관리 서비스
 * - 대화 히스토리 유지
 * - 사용자 패턴 분석
 * - 컨텍스트 기반 응답 생성
 * - 자연어 시간 표현 해석
 * - 충돌 감지 및 최적 시간 제안
 */
export class ContextManager {
    private contexts: Map<string, UserContext> = new Map();
    private conversationHistories: Map<string, ConversationHistory[]> = new Map();
    private conversationContexts: Map<string, ConversationContext> = new Map();
    private readonly MAX_HISTORY_SIZE = 50;
    private readonly CONTEXT_TTL = 24 * 60 * 60 * 1000; // 24시간

    /**
     * 사용자 컨텍스트 조회
     */
    getContext(userId: string): UserContext {
        if (!this.contexts.has(userId)) {
            this.contexts.set(userId, this.createDefaultContext(userId));
        }

        const context = this.contexts.get(userId)!;
        context.currentTime = new Date(); // 항상 최신 시간으로 업데이트
        
        // TTL 체크
        if (this.isContextExpired(context)) {
            this.refreshContext(userId);
        }
        
        return context;
    }

    /**
     * 기본 컨텍스트 생성
     */
    private createDefaultContext(userId: string): UserContext {
        // 브라우저 시간대 감지 또는 기본값 사용
        const timeZone = this.getSystemTimeZone();
        
        return {
            userId,
            currentTime: new Date(),
            timeZone,
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
            },
            lastUpdated: new Date()
        };
    }

    /**
     * 컨텍스트 만료 체크
     */
    private isContextExpired(context: UserContext): boolean {
        const now = new Date().getTime();
        const lastUpdated = context.lastUpdated?.getTime() || 0;
        return (now - lastUpdated) > this.CONTEXT_TTL;
    }

    /**
     * 컨텍스트 새로고침
     */
    private refreshContext(userId: string): void {
        const context = this.contexts.get(userId);
        if (context) {
            context.lastUpdated = new Date();
            // 오래된 이벤트 정리
            context.recentEvents = context.recentEvents.slice(0, 20);
        }
    }

    /**
     * 최근 이벤트 업데이트
     */
    updateRecentEvents(userId: string, events: CalendarEvent[]): void {
        const context = this.getContext(userId);
        context.recentEvents = events.slice(0, 10); // 최근 10개만 유지
        context.lastUpdated = new Date();
    }

    /**
     * 사용자 패턴 학습 및 업데이트
     */
    updatePatterns(userId: string, events: CalendarEvent[]): UserPattern {
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

        // 일반적인 미팅 시간 분석
        const meetingTimes = events
            .map(e => {
                const startTime = e.start?.dateTime || e.start?.date;
                if (!startTime) return -1;
                const date = new Date(startTime);
                return date.getHours();
            })
            .filter(hour => hour >= 0 && hour <= 23);

        const timeFrequency = meetingTimes.reduce((acc: Record<number, number>, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        context.patterns.commonMeetingTimes = Object.entries(timeFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([hour]) => `${hour}:00`);

        // 자주 함께하는 참석자 분석
        const attendees = events
            .flatMap(e => e.attendees || [])
            .map(a => a.email)
            .filter(Boolean);

        const attendeeFrequency = attendees.reduce((acc: Record<string, number>, email) => {
            acc[email] = (acc[email] || 0) + 1;
            return acc;
        }, {});

        context.patterns.regularAttendees = Object.entries(attendeeFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([email]) => email);

        context.lastUpdated = new Date();
        return context.patterns;
    }

    /**
     * 대화 히스토리 추가
     */
    addToHistory(userId: string, role: 'user' | 'assistant', content: string): void {
        if (!this.conversationHistories.has(userId)) {
            this.conversationHistories.set(userId, []);
        }

        const history = this.conversationHistories.get(userId)!;
        history.push({
            role,
            content,
            timestamp: new Date()
        });

        // 히스토리 크기 제한
        if (history.length > this.MAX_HISTORY_SIZE) {
            history.shift();
        }
    }

    /**
     * 대화 히스토리 조회
     */
    getConversationHistory(userId: string, limit: number = 10): ConversationHistory[] {
        const history = this.conversationHistories.get(userId) || [];
        return history.slice(-limit);
    }

    /**
     * 시스템 시간대 감지
     */
    private getSystemTimeZone(): string {
        try {
            // Intl API를 사용하여 시간대 감지
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul';
        } catch {
            // 폴백으로 기본 시간대 사용
            return 'Asia/Seoul';
        }
    }

    /**
     * 사용자 시간대 설정 업데이트
     */
    updateTimeZone(userId: string, timeZone: string): void {
        const context = this.getContext(userId);
        context.timeZone = timeZone;
        context.lastUpdated = new Date();
    }

    /**
     * 컨텍스트 기반 프롬프트 향상
     */
    enhancePromptWithContext(userId: string, prompt: string): string {
        const context = this.getContext(userId);
        const history = this.getConversationHistory(userId, 5);

        let enhancedPrompt = `
현재 시간: ${context.currentTime.toLocaleString('ko-KR')}
사용자 타임존: ${context.timeZone}
근무 시간: ${context.preferences.workingHours.start}시-${context.preferences.workingHours.end}시
`;

        if (context.patterns.frequentLocations.length > 0) {
            enhancedPrompt += `자주 가는 장소: ${context.patterns.frequentLocations.join(', ')}\n`;
        }

        if (context.patterns.commonMeetingTimes.length > 0) {
            enhancedPrompt += `선호 미팅 시간: ${context.patterns.commonMeetingTimes.join(', ')}\n`;
        }

        if (history.length > 0) {
            enhancedPrompt += '\n최근 대화:\n';
            history.forEach(h => {
                enhancedPrompt += `${h.role}: ${h.content.substring(0, 100)}...\n`;
            });
        }

        enhancedPrompt += `\n사용자 요청: ${prompt}`;
        
        return enhancedPrompt;
    }

    /**
     * 대화 컨텍스트 업데이트
     */
    updateConversationContext(userId: string, update: Partial<ConversationContext>): void {
        const current = this.conversationContexts.get(userId) || {};
        this.conversationContexts.set(userId, { ...current, ...update });
    }

    /**
     * 자연어 시간 표현 해석
     */
    resolveTimeExpression(expression: string, userId: string): Date | null {
        const context = this.conversationContexts.get(userId);
        const now = new Date();
        
        // 상대적 시간 표현 처리
        const relativeTimeMap: Record<string, () => Date> = {
            '지금': () => now,
            '곧': () => new Date(now.getTime() + 30 * 60000),
            '조금 있다가': () => new Date(now.getTime() + 60 * 60000),
            '오늘': () => {
                const date = new Date(now);
                date.setHours(14, 0, 0, 0); // 기본 오후 2시
                return date;
            },
            '내일': () => {
                const date = new Date(now);
                date.setDate(date.getDate() + 1);
                date.setHours(10, 0, 0, 0); // 기본 오전 10시
                return date;
            },
            '모레': () => {
                const date = new Date(now);
                date.setDate(date.getDate() + 2);
                date.setHours(10, 0, 0, 0);
                return date;
            },
            '이번 주': () => {
                const date = new Date(now);
                const dayOfWeek = date.getDay();
                const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 5;
                date.setDate(date.getDate() + daysUntilFriday);
                date.setHours(14, 0, 0, 0);
                return date;
            },
            '다음 주': () => {
                const date = new Date(now);
                date.setDate(date.getDate() + (7 - date.getDay() + 1));
                date.setHours(10, 0, 0, 0);
                return date;
            },
            '주말': () => {
                const date = new Date(now);
                const dayOfWeek = date.getDay();
                const daysUntilSaturday = dayOfWeek <= 6 ? 6 - dayOfWeek : 7;
                date.setDate(date.getDate() + daysUntilSaturday);
                date.setHours(10, 0, 0, 0);
                return date;
            }
        };
        
        // 표현 파싱
        for (const [key, resolver] of Object.entries(relativeTimeMap)) {
            if (expression.includes(key)) {
                const resolved = resolver();
                // 해석된 날짜를 컨텍스트에 저장
                this.updateConversationContext(userId, { lastMentionedDate: resolved });
                return resolved;
            }
        }
        
        // 컨텍스트에서 마지막 언급된 날짜 참조
        if ((expression.includes('그때') || expression.includes('같은 시간')) && context?.lastMentionedDate) {
            return context.lastMentionedDate;
        }
        
        return null;
    }

    /**
     * 충돌 감지
     */
    detectConflicts(
        newEvent: { start: Date; end: Date },
        existingEvents: CalendarEvent[]
    ): CalendarEvent[] {
        return existingEvents.filter(event => {
            const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
            const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
            
            // 시간 겹침 체크
            return (
                (newEvent.start >= eventStart && newEvent.start < eventEnd) ||
                (newEvent.end > eventStart && newEvent.end <= eventEnd) ||
                (newEvent.start <= eventStart && newEvent.end >= eventEnd)
            );
        });
    }

    /**
     * 최적 시간 제안
     */
    suggestOptimalTime(
        duration: number, // minutes
        existingEvents: CalendarEvent[],
        userId: string
    ): Date[] {
        const suggestions: Date[] = [];
        const now = new Date();
        const context = this.getContext(userId);
        const workStart = context.preferences.workingHours.start;
        const workEnd = context.preferences.workingHours.end;
        
        // 다음 7일간 체크
        for (let day = 0; day < 7; day++) {
            const checkDate = new Date(now);
            checkDate.setDate(checkDate.getDate() + day);
            checkDate.setHours(workStart, 0, 0, 0);
            
            // 30분 단위로 체크
            for (let hour = workStart; hour < workEnd; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    checkDate.setHours(hour, minute, 0, 0);
                    
                    const endTime = new Date(checkDate);
                    endTime.setMinutes(endTime.getMinutes() + duration);
                    
                    // 충돌 체크
                    const conflicts = this.detectConflicts(
                        { start: new Date(checkDate), end: endTime },
                        existingEvents
                    );
                    
                    if (conflicts.length === 0) {
                        suggestions.push(new Date(checkDate));
                        
                        if (suggestions.length >= 3) {
                            return suggestions; // 최대 3개 제안
                        }
                    }
                }
            }
        }
        
        return suggestions;
    }

    /**
     * 스마트 제안 생성
     */
    generateSmartSuggestions(
        userId: string,
        upcomingEvents: CalendarEvent[]
    ): string[] {
        const suggestions: string[] = [];
        const context = this.getContext(userId);
        const hour = new Date().getHours();
        
        // 시간대별 제안
        if (hour < 9) {
            suggestions.push('오늘 일정 브리핑 받기');
            suggestions.push('오전 일정 확인');
        } else if (hour < 12) {
            suggestions.push('점심 약속 잡기');
            suggestions.push('오후 일정 확인');
        } else if (hour < 18) {
            suggestions.push('내일 일정 준비');
            suggestions.push('퇴근 후 일정 추가');
        } else {
            suggestions.push('내일 일정 확인');
            suggestions.push('이번 주 일정 요약');
        }
        
        // 패턴 기반 제안
        if (context.patterns.frequentLocations.length > 0) {
            suggestions.push(`${context.patterns.frequentLocations[0]}에서 미팅`);
        }
        
        const today = new Date().getDay();
        const commonDays = this.getMostCommonMeetingDays(context.recentEvents);
        if (commonDays.includes(today)) {
            suggestions.push('오늘 미팅 일정 추가');
        }
        
        // 다가오는 일정 기반 제안
        if (upcomingEvents.length === 0) {
            suggestions.push('이번 주 계획 세우기');
        } else if (upcomingEvents.length > 5) {
            suggestions.push('바쁜 일정 정리하기');
        }
        
        return suggestions.slice(0, 5);
    }

    /**
     * 가장 빈번한 미팅 요일 분석
     */
    private getMostCommonMeetingDays(events: CalendarEvent[]): number[] {
        const dayFrequency: Record<number, number> = {};
        
        events.forEach(event => {
            const startTime = event.start?.dateTime || event.start?.date;
            if (startTime) {
                const day = new Date(startTime).getDay();
                dayFrequency[day] = (dayFrequency[day] || 0) + 1;
            }
        });
        
        return Object.entries(dayFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([day]) => Number(day));
    }

    /**
     * 컨텍스트 초기화
     */
    clearContext(userId: string): void {
        this.contexts.delete(userId);
        this.conversationHistories.delete(userId);
        this.conversationContexts.delete(userId);
    }

    /**
     * 모든 컨텍스트 정리 (메모리 관리)
     */
    cleanupExpiredContexts(): void {
        const now = new Date().getTime();
        
        this.contexts.forEach((context, userId) => {
            const lastUpdated = context.lastUpdated?.getTime() || 0;
            if ((now - lastUpdated) > this.CONTEXT_TTL) {
                this.contexts.delete(userId);
                this.conversationHistories.delete(userId);
            }
        });
    }
}

// 싱글톤 인스턴스
export const contextManager = new ContextManager();