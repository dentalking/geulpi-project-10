import type { 
    CalendarEvent, 
    PatternInsight, 
    UserPattern, 
    LearningData,
    WeeklyPattern,
    EventPattern,
    InsightType 
} from '@/types';

/**
 * 패턴 학습 서비스
 * 사용자의 일정 패턴을 분석하고 학습하여 인사이트 제공
 */
export class PatternLearner {
    private readonly MIN_EVENTS_FOR_PATTERN = 5;
    private readonly CONFIDENCE_THRESHOLD = 0.6;
    private learningCache: Map<string, LearningData> = new Map();

    /**
     * 사용자 일정 패턴 분석
     */
    async analyzeUserBehavior(
        userId: string, 
        events: CalendarEvent[]
    ): Promise<PatternInsight[]> {
        const insights: PatternInsight[] = [];

        // 최소 이벤트 수 체크
        if (events.length < this.MIN_EVENTS_FOR_PATTERN) {
            return insights;
        }

        // 다양한 패턴 분석
        insights.push(...this.analyzeMeetingPatterns(events));
        insights.push(...this.analyzeSchedulingPreferences(events));
        insights.push(...this.analyzeAttendancePatterns(events));
        insights.push(...this.analyzeDurationPatterns(events));
        insights.push(...this.analyzeLocationPreferences(events));
        insights.push(...this.analyzeCollaborationPatterns(events));

        // 학습 데이터 캐싱
        this.updateLearningCache(userId, events, insights);

        return insights.filter(i => i.confidence >= this.CONFIDENCE_THRESHOLD);
    }

    /**
     * 미팅 패턴 분석
     */
    private analyzeMeetingPatterns(events: CalendarEvent[]): PatternInsight[] {
        const insights: PatternInsight[] = [];
        const timeFrequency = new Map<number, number>();
        const dayFrequency = new Map<string, number>();

        events.forEach(event => {
            const startDate = new Date(event.start?.dateTime || event.start?.date || '');
            const hour = startDate.getHours();
            const day = startDate.toLocaleDateString('ko-KR', { weekday: 'long' });

            timeFrequency.set(hour, (timeFrequency.get(hour) || 0) + 1);
            dayFrequency.set(day, (dayFrequency.get(day) || 0) + 1);
        });

        // 선호 시간대 분석
        const topHours = Array.from(timeFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (topHours.length > 0) {
            const [hour, count] = topHours[0];
            const confidence = count / events.length;
            
            insights.push({
                type: 'meeting_pattern',
                pattern: `대부분의 미팅이 ${hour}시에 시작됩니다`,
                confidence,
                frequency: count,
                suggestion: `${hour}시에 중요한 미팅을 잡는 것을 추천합니다`,
                data: { preferredHour: hour, occurrences: count }
            });
        }

        // 선호 요일 분석
        const topDays = Array.from(dayFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        if (topDays.length > 0) {
            const [day, count] = topDays[0];
            const confidence = count / events.length;
            
            insights.push({
                type: 'scheduling_preference',
                pattern: `${day}에 가장 많은 일정이 있습니다`,
                confidence,
                frequency: count,
                suggestion: `${day}에는 추가 일정을 최소화하는 것이 좋습니다`,
                data: { preferredDay: day, occurrences: count }
            });
        }

        return insights;
    }

    /**
     * 스케줄링 선호도 분석
     */
    private analyzeSchedulingPreferences(events: CalendarEvent[]): PatternInsight[] {
        const insights: PatternInsight[] = [];
        
        // 버퍼 시간 패턴 분석
        const bufferTimes: number[] = [];
        for (let i = 0; i < events.length - 1; i++) {
            const currentEnd = new Date(events[i].end?.dateTime || events[i].end?.date || '');
            const nextStart = new Date(events[i + 1].start?.dateTime || events[i + 1].start?.date || '');
            const buffer = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60); // 분 단위
            
            if (buffer > 0 && buffer < 120) { // 2시간 이내 버퍼만 고려
                bufferTimes.push(buffer);
            }
        }

        if (bufferTimes.length > 3) {
            const avgBuffer = bufferTimes.reduce((a, b) => a + b, 0) / bufferTimes.length;
            
            insights.push({
                type: 'scheduling_preference',
                pattern: `평균적으로 미팅 사이에 ${Math.round(avgBuffer)}분의 여유를 둡니다`,
                confidence: 0.8,
                frequency: bufferTimes.length,
                suggestion: `일정 사이에 ${Math.round(avgBuffer)}분의 버퍼를 자동으로 추가하세요`,
                data: { averageBuffer: avgBuffer }
            });
        }

        // 연속 미팅 패턴 분석
        let consecutiveMeetings = 0;
        for (let i = 0; i < events.length - 1; i++) {
            const currentEnd = new Date(events[i].end?.dateTime || events[i].end?.date || '');
            const nextStart = new Date(events[i + 1].start?.dateTime || events[i + 1].start?.date || '');
            const gap = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
            
            if (gap <= 15) { // 15분 이내
                consecutiveMeetings++;
            }
        }

        if (consecutiveMeetings > events.length * 0.3) {
            insights.push({
                type: 'scheduling_preference',
                pattern: '연속된 미팅을 자주 잡는 경향이 있습니다',
                confidence: 0.7,
                frequency: consecutiveMeetings,
                suggestion: '미팅 사이에 짧은 휴식 시간을 추가하는 것을 고려하세요',
                data: { consecutiveCount: consecutiveMeetings }
            });
        }

        return insights;
    }

    /**
     * 참석 패턴 분석
     */
    private analyzeAttendancePatterns(events: CalendarEvent[]): PatternInsight[] {
        const insights: PatternInsight[] = [];
        const attendeeFrequency = new Map<string, number>();
        const teamSize: number[] = [];

        events.forEach(event => {
            const attendees = event.attendees || [];
            teamSize.push(attendees.length);
            
            attendees.forEach(attendee => {
                if (attendee.email) {
                    attendeeFrequency.set(
                        attendee.email, 
                        (attendeeFrequency.get(attendee.email) || 0) + 1
                    );
                }
            });
        });

        // 자주 함께하는 사람들 분석
        const topCollaborators = Array.from(attendeeFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (topCollaborators.length > 0) {
            const collaboratorNames = topCollaborators
                .map(([email]) => email.split('@')[0])
                .join(', ');
            
            insights.push({
                type: 'collaboration_pattern',
                pattern: `주로 ${collaboratorNames}와 함께 일합니다`,
                confidence: 0.8,
                frequency: topCollaborators[0][1],
                suggestion: '이들과의 정기 미팅을 고려해보세요',
                data: { topCollaborators: topCollaborators.map(([email, count]) => ({ email, count })) }
            });
        }

        // 평균 팀 크기 분석
        if (teamSize.length > 0) {
            const avgTeamSize = teamSize.reduce((a, b) => a + b, 0) / teamSize.length;
            
            insights.push({
                type: 'attendance_pattern',
                pattern: `평균 미팅 참석자 수는 ${Math.round(avgTeamSize)}명입니다`,
                confidence: 0.9,
                frequency: teamSize.length,
                suggestion: avgTeamSize > 5 
                    ? '대규모 미팅은 효율성이 떨어질 수 있습니다' 
                    : '적절한 팀 크기를 유지하고 있습니다',
                data: { averageTeamSize: avgTeamSize }
            });
        }

        return insights;
    }

    /**
     * 소요 시간 패턴 분석
     */
    private analyzeDurationPatterns(events: CalendarEvent[]): PatternInsight[] {
        const insights: PatternInsight[] = [];
        const durations: number[] = [];
        const durationByType = new Map<string, number[]>();

        events.forEach(event => {
            const start = new Date(event.start?.dateTime || event.start?.date || '');
            const end = new Date(event.end?.dateTime || event.end?.date || '');
            const duration = (end.getTime() - start.getTime()) / (1000 * 60); // 분 단위
            
            if (duration > 0 && duration < 480) { // 8시간 이내
                durations.push(duration);
                
                // 이벤트 타입별 분류 (제목 기반)
                const eventType = this.classifyEventType(event.summary);
                if (!durationByType.has(eventType)) {
                    durationByType.set(eventType, []);
                }
                durationByType.get(eventType)!.push(duration);
            }
        });

        // 평균 미팅 시간 분석
        if (durations.length > 0) {
            const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
            
            insights.push({
                type: 'duration_pattern',
                pattern: `평균 미팅 시간은 ${Math.round(avgDuration)}분입니다`,
                confidence: 0.9,
                frequency: durations.length,
                suggestion: avgDuration > 60 
                    ? '긴 미팅은 중간 휴식을 고려하세요' 
                    : '효율적인 미팅 시간을 유지하고 있습니다',
                data: { averageDuration: avgDuration }
            });
        }

        // 타입별 소요 시간 패턴
        durationByType.forEach((durations, type) => {
            if (durations.length >= 3) {
                const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
                
                insights.push({
                    type: 'duration_pattern',
                    pattern: `${type} 미팅은 보통 ${Math.round(avgDuration)}분 소요됩니다`,
                    confidence: 0.7,
                    frequency: durations.length,
                    suggestion: `${type} 일정 생성 시 ${Math.round(avgDuration)}분으로 자동 설정`,
                    data: { eventType: type, averageDuration: avgDuration }
                });
            }
        });

        return insights;
    }

    /**
     * 장소 선호도 분석
     */
    private analyzeLocationPreferences(events: CalendarEvent[]): PatternInsight[] {
        const insights: PatternInsight[] = [];
        const locationFrequency = new Map<string, number>();
        const virtualMeetings = events.filter(e => 
            e.location?.toLowerCase().includes('zoom') || 
            e.location?.toLowerCase().includes('meet') ||
            e.location?.toLowerCase().includes('teams')
        ).length;

        events.forEach(event => {
            if (event.location) {
                locationFrequency.set(
                    event.location,
                    (locationFrequency.get(event.location) || 0) + 1
                );
            }
        });

        // 자주 사용하는 장소 분석
        const topLocations = Array.from(locationFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (topLocations.length > 0) {
            const locations = topLocations.map(([loc]) => loc).join(', ');
            
            insights.push({
                type: 'location_preference',
                pattern: `주로 ${locations}에서 미팅을 진행합니다`,
                confidence: 0.8,
                frequency: topLocations[0][1],
                suggestion: '자주 가는 장소를 기본값으로 설정하세요',
                data: { topLocations: topLocations.map(([location, count]) => ({ location, count })) }
            });
        }

        // 원격 vs 대면 미팅 비율
        const virtualRatio = virtualMeetings / events.length;
        if (events.length > 10) {
            insights.push({
                type: 'location_preference',
                pattern: `미팅의 ${Math.round(virtualRatio * 100)}%가 온라인으로 진행됩니다`,
                confidence: 0.9,
                frequency: virtualMeetings,
                suggestion: virtualRatio > 0.7 
                    ? '화상 미팅 설정을 최적화하세요' 
                    : '대면 미팅과 온라인 미팅의 균형이 좋습니다',
                data: { virtualRatio, virtualCount: virtualMeetings }
            });
        }

        return insights;
    }

    /**
     * 협업 패턴 분석
     */
    private analyzeCollaborationPatterns(events: CalendarEvent[]): PatternInsight[] {
        const insights: PatternInsight[] = [];
        const collaborationGraph = new Map<string, Set<string>>();

        // 협업 네트워크 구축
        events.forEach(event => {
            const attendees = event.attendees || [];
            attendees.forEach(a1 => {
                if (!collaborationGraph.has(a1.email)) {
                    collaborationGraph.set(a1.email, new Set());
                }
                attendees.forEach(a2 => {
                    if (a1.email !== a2.email) {
                        collaborationGraph.get(a1.email)!.add(a2.email);
                    }
                });
            });
        });

        // 핵심 협업자 식별
        const collaborationScores = Array.from(collaborationGraph.entries())
            .map(([email, connections]) => ({ email, score: connections.size }))
            .sort((a, b) => b.score - a.score);

        if (collaborationScores.length > 0) {
            const topCollaborator = collaborationScores[0];
            
            insights.push({
                type: 'collaboration_pattern',
                pattern: `${topCollaborator.email.split('@')[0]}가 가장 많은 사람들과 협업합니다`,
                confidence: 0.7,
                frequency: topCollaborator.score,
                suggestion: '핵심 협업자와의 정기 체크인을 고려하세요',
                data: { keyCollaborator: topCollaborator }
            });
        }

        return insights;
    }

    /**
     * 이벤트 타입 분류
     */
    private classifyEventType(summary: string): string {
        const lowerSummary = summary.toLowerCase();
        
        if (lowerSummary.includes('1:1') || lowerSummary.includes('one on one')) {
            return '1:1 미팅';
        } else if (lowerSummary.includes('standup') || lowerSummary.includes('daily')) {
            return '스탠드업';
        } else if (lowerSummary.includes('review') || lowerSummary.includes('retro')) {
            return '리뷰';
        } else if (lowerSummary.includes('interview')) {
            return '인터뷰';
        } else if (lowerSummary.includes('workshop') || lowerSummary.includes('training')) {
            return '워크샵';
        } else {
            return '일반 미팅';
        }
    }

    /**
     * 다음 액션 예측
     */
    async predictNextAction(
        userId: string, 
        currentContext: any
    ): Promise<string[]> {
        const predictions: string[] = [];
        const learningData = this.learningCache.get(userId);
        
        if (!learningData) {
            return predictions;
        }

        const currentHour = new Date().getHours();
        const currentDay = new Date().toLocaleDateString('ko-KR', { weekday: 'long' });

        // 시간 기반 예측
        const timePatterns = learningData.patterns.filter(p => 
            p.type === 'meeting_pattern' && 
            p.data?.preferredHour === currentHour
        );
        
        if (timePatterns.length > 0) {
            predictions.push(`${currentHour}시에 주로 미팅을 시작합니다. 일정을 확인하세요.`);
        }

        // 요일 기반 예측
        const dayPatterns = learningData.patterns.filter(p => 
            p.type === 'scheduling_preference' && 
            p.data?.preferredDay === currentDay
        );
        
        if (dayPatterns.length > 0) {
            predictions.push(`${currentDay}은 보통 바쁜 날입니다. 일정을 미리 준비하세요.`);
        }

        return predictions;
    }

    /**
     * 최적 시간 제안
     */
    async suggestOptimalTime(
        userId: string,
        eventType: string,
        duration: number
    ): Promise<Date[]> {
        const suggestions: Date[] = [];
        const learningData = this.learningCache.get(userId);
        
        if (!learningData) {
            return suggestions;
        }

        // 선호 시간대 기반 제안
        const timePatterns = learningData.patterns.filter(p => 
            p.type === 'meeting_pattern'
        );

        timePatterns.forEach(pattern => {
            const preferredHour = pattern.data?.preferredHour;
            if (preferredHour) {
                const suggestedDate = new Date();
                suggestedDate.setHours(preferredHour, 0, 0, 0);
                
                // 다음 가능한 날짜로 조정
                if (suggestedDate < new Date()) {
                    suggestedDate.setDate(suggestedDate.getDate() + 1);
                }
                
                suggestions.push(suggestedDate);
            }
        });

        return suggestions.slice(0, 3); // 상위 3개 제안
    }

    /**
     * 주간 패턴 분석
     */
    analyzeWeeklyPattern(events: CalendarEvent[]): WeeklyPattern {
        const dayDensity = new Map<string, number>();
        const days = ['월요일', '화요일', '수요일', '목요일', '금요일'];
        
        days.forEach(day => dayDensity.set(day, 0));

        events.forEach(event => {
            const date = new Date(event.start?.dateTime || event.start?.date || '');
            const day = date.toLocaleDateString('ko-KR', { weekday: 'long' });
            dayDensity.set(day, (dayDensity.get(day) || 0) + 1);
        });

        const sortedDays = Array.from(dayDensity.entries())
            .sort((a, b) => b[1] - a[1]);

        return {
            busyDays: sortedDays.slice(0, 2).map(([day]) => day),
            quietDays: sortedDays.slice(-2).map(([day]) => day),
            meetingDensity: dayDensity
        };
    }

    /**
     * 학습 캐시 업데이트
     */
    private updateLearningCache(
        userId: string, 
        events: CalendarEvent[], 
        patterns: PatternInsight[]
    ): void {
        this.learningCache.set(userId, {
            userId,
            events,
            patterns,
            lastAnalyzed: new Date(),
            version: '1.0.0'
        });
    }

    /**
     * 학습 데이터 초기화
     */
    clearLearningData(userId: string): void {
        this.learningCache.delete(userId);
    }
}

// 싱글톤 인스턴스
export const patternLearner = new PatternLearner();