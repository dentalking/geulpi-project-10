import type {
    CalendarEvent,
    SchedulingConstraint,
    SchedulingSuggestion,
    TimeSlot,
    UserContext,
    ConflictInfo,
    Attendee
} from '@/types';
import { smartScheduler } from './SmartScheduler';

export interface TeamMember {
    email: string;
    displayName?: string;
    priority: 'required' | 'optional' | 'informational';
    timezone?: string;
    workingHours?: {
        start: number;
        end: number;
    };
    preferences?: {
        preferredMeetingDays?: string[];
        avoidMeetingTimes?: string[];
    };
}

export interface MeetingType {
    type: 'standup' | 'planning' | 'review' | 'brainstorm' | 'one-on-one' | 'all-hands' | 'workshop' | 'social';
    optimalDuration: number;
    idealTimeSlots: string[];
    requiresPreparation?: boolean;
    preparationTime?: number;
    requiresFollowUp?: boolean;
    followUpTime?: number;
}

export interface TeamSchedulingRequest {
    title: string;
    meetingType: MeetingType['type'];
    members: TeamMember[];
    duration: number;
    deadline?: Date;
    flexibleDuration?: boolean;
    allowPartialAttendance?: boolean;
    preferredRooms?: string[];
    requiresEquipment?: string[];
    isRecurring?: boolean;
    recurrencePattern?: string;
}

export interface TeamSchedulingResult {
    suggestions: TeamSchedulingSuggestion[];
    analysisReport: {
        totalConflicts: number;
        attendeeCoverage: number;
        timezoneSpread: number;
        preparationNeeded: boolean;
        followUpRequired: boolean;
    };
    recommendations: string[];
}

export interface TeamSchedulingSuggestion extends SchedulingSuggestion {
    attendeeAvailability: Map<string, 'available' | 'busy' | 'tentative'>;
    timezoneImpact: Map<string, string>;
    meetingEfficiencyScore: number;
    preparationTasks?: PreparationTask[];
}

export interface PreparationTask {
    task: string;
    assignee?: string;
    dueDate: Date;
    priority: 'low' | 'medium' | 'high';
    estimatedTime: number;
}

export interface TeamProductivityPattern {
    teamId: string;
    mostProductiveHours: number[];
    leastProductiveHours: number[];
    optimalMeetingDays: string[];
    meetingFatigueTimes: string[];
    averageMeetingDuration: Map<string, number>;
    collaborationScore: Map<string, number>;
}

export class TeamScheduler {
    private readonly meetingTypeConfigs: Map<MeetingType['type'], MeetingType> = new Map([
        ['standup', {
            type: 'standup',
            optimalDuration: 15,
            idealTimeSlots: ['09:00', '09:30'],
            requiresPreparation: false
        }],
        ['planning', {
            type: 'planning',
            optimalDuration: 120,
            idealTimeSlots: ['10:00', '14:00'],
            requiresPreparation: true,
            preparationTime: 60,
            requiresFollowUp: true,
            followUpTime: 30
        }],
        ['review', {
            type: 'review',
            optimalDuration: 90,
            idealTimeSlots: ['14:00', '15:00'],
            requiresPreparation: true,
            preparationTime: 45
        }],
        ['brainstorm', {
            type: 'brainstorm',
            optimalDuration: 60,
            idealTimeSlots: ['10:00', '11:00', '15:00'],
            requiresPreparation: false,
            requiresFollowUp: true,
            followUpTime: 30
        }],
        ['one-on-one', {
            type: 'one-on-one',
            optimalDuration: 30,
            idealTimeSlots: ['11:00', '14:00', '16:00'],
            requiresPreparation: false
        }],
        ['all-hands', {
            type: 'all-hands',
            optimalDuration: 60,
            idealTimeSlots: ['10:00', '14:00'],
            requiresPreparation: true,
            preparationTime: 120,
            requiresFollowUp: false
        }],
        ['workshop', {
            type: 'workshop',
            optimalDuration: 180,
            idealTimeSlots: ['09:00', '13:00'],
            requiresPreparation: true,
            preparationTime: 120,
            requiresFollowUp: true,
            followUpTime: 60
        }],
        ['social', {
            type: 'social',
            optimalDuration: 60,
            idealTimeSlots: ['12:00', '16:00', '17:00'],
            requiresPreparation: false
        }]
    ]);

    /**
     * 팀 일정 조율 메인 메서드
     */
    async scheduleTeamMeeting(
        request: TeamSchedulingRequest,
        participantEvents: Map<string, CalendarEvent[]>,
        teamContext?: TeamProductivityPattern
    ): Promise<TeamSchedulingResult> {
        const meetingConfig = this.meetingTypeConfigs.get(request.meetingType);
        const duration = request.flexibleDuration && meetingConfig 
            ? meetingConfig.optimalDuration 
            : request.duration;

        // 1. 참가자 우선순위별 그룹화
        const requiredMembers = request.members.filter(m => m.priority === 'required');
        const optionalMembers = request.members.filter(m => m.priority === 'optional');

        // 2. 시간대 분석
        const timezoneAnalysis = this.analyzeTimezones(request.members);

        // 3. 팀 생산성 패턴 적용
        const productivityScore = teamContext 
            ? this.applyTeamProductivityPattern(teamContext)
            : new Map<string, number>();

        // 4. 가능한 시간 슬롯 찾기
        const possibleSlots = await this.findTeamSlots(
            requiredMembers,
            duration,
            participantEvents,
            request.deadline
        );

        // 5. 슬롯 점수 계산 및 순위 매기기
        const scoredSlots = possibleSlots.map(slot => 
            this.scoreTeamSlot(
                slot,
                request,
                participantEvents,
                productivityScore,
                meetingConfig
            )
        );

        // 6. 상위 제안 선택
        const topSuggestions = scoredSlots
            .sort((a, b) => b.meetingEfficiencyScore - a.meetingEfficiencyScore)
            .slice(0, 5);

        // 7. 회의 준비 태스크 생성
        if (meetingConfig?.requiresPreparation) {
            topSuggestions.forEach(suggestion => {
                suggestion.preparationTasks = this.generatePreparationTasks(
                    request,
                    suggestion.slot,
                    meetingConfig
                );
            });
        }

        // 8. 분석 리포트 생성
        const analysisReport = this.generateAnalysisReport(
            topSuggestions,
            request,
            timezoneAnalysis
        );

        // 9. 추천 사항 생성
        const recommendations = this.generateRecommendations(
            request,
            analysisReport,
            topSuggestions
        );

        return {
            suggestions: topSuggestions,
            analysisReport,
            recommendations
        };
    }

    /**
     * 시간대 분석
     */
    private analyzeTimezones(members: TeamMember[]): Map<string, number> {
        const timezoneGroups = new Map<string, number>();
        
        members.forEach(member => {
            const tz = member.timezone || 'Asia/Seoul';
            timezoneGroups.set(tz, (timezoneGroups.get(tz) || 0) + 1);
        });

        return timezoneGroups;
    }

    /**
     * 팀 생산성 패턴 적용
     */
    private applyTeamProductivityPattern(
        pattern: TeamProductivityPattern
    ): Map<string, number> {
        const scores = new Map<string, number>();
        
        // 생산적인 시간대에 가중치 부여
        pattern.mostProductiveHours.forEach(hour => {
            scores.set(`${hour}:00`, 20);
        });

        // 비생산적 시간대에 페널티
        pattern.leastProductiveHours.forEach(hour => {
            scores.set(`${hour}:00`, -20);
        });

        // 최적 회의 요일에 가중치
        pattern.optimalMeetingDays.forEach(day => {
            scores.set(`day_${day}`, 15);
        });

        // 회의 피로 시간대에 페널티
        pattern.meetingFatigueTimes.forEach(time => {
            scores.set(time, -15);
        });

        return scores;
    }

    /**
     * 팀 공통 시간 슬롯 찾기
     */
    private async findTeamSlots(
        requiredMembers: TeamMember[],
        duration: number,
        participantEvents: Map<string, CalendarEvent[]>,
        deadline?: Date
    ): Promise<TimeSlot[]> {
        const slots: TimeSlot[] = [];
        const now = new Date();
        const endDate = deadline || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

        for (let date = new Date(now); date < endDate; date.setDate(date.getDate() + 1)) {
            // 주말 체크 (설정에 따라)
            if (date.getDay() === 0 || date.getDay() === 6) {
                continue;
            }

            // 각 멤버의 근무 시간 교집합 찾기
            const commonWorkingHours = this.findCommonWorkingHours(requiredMembers);

            for (let hour = commonWorkingHours.start; hour < commonWorkingHours.end; hour++) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const slotStart = new Date(date);
                    slotStart.setHours(hour, minute, 0, 0);
                    
                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

                    // 모든 필수 참가자가 가능한지 체크
                    const allAvailable = requiredMembers.every(member => {
                        const events = participantEvents.get(member.email) || [];
                        return !this.hasConflict(slotStart, slotEnd, events);
                    });

                    if (allAvailable) {
                        slots.push({
                            startTime: slotStart.toISOString(),
                            endTime: slotEnd.toISOString()
                        });
                    }
                }
            }
        }

        return slots;
    }

    /**
     * 공통 근무 시간 찾기
     */
    private findCommonWorkingHours(members: TeamMember[]): { start: number, end: number } {
        let commonStart = 0;
        let commonEnd = 24;

        members.forEach(member => {
            const wh = member.workingHours || { start: 9, end: 18 };
            
            // 시간대 조정 (간단한 버전, 실제로는 더 복잡한 시간대 계산 필요)
            const adjustedStart = this.adjustForTimezone(wh.start, member.timezone);
            const adjustedEnd = this.adjustForTimezone(wh.end, member.timezone);

            commonStart = Math.max(commonStart, adjustedStart);
            commonEnd = Math.min(commonEnd, adjustedEnd);
        });

        // 유효한 시간 범위인지 확인
        if (commonStart >= commonEnd) {
            // 공통 시간이 없는 경우 기본값 반환
            return { start: 9, end: 18 };
        }

        return { start: commonStart, end: commonEnd };
    }

    /**
     * 시간대 조정 (간단한 버전)
     */
    private adjustForTimezone(hour: number, timezone?: string): number {
        if (!timezone || timezone === 'Asia/Seoul') {
            return hour;
        }

        // 실제로는 더 복잡한 시간대 계산이 필요
        const timezoneOffsets: Record<string, number> = {
            'UTC': -9,
            'America/New_York': -14,
            'America/Los_Angeles': -17,
            'Europe/London': -9,
            'Europe/Paris': -8,
            'Asia/Tokyo': 0
        };

        const offset = timezoneOffsets[timezone] || 0;
        return (hour + offset + 24) % 24;
    }

    /**
     * 충돌 체크
     */
    private hasConflict(start: Date, end: Date, events: CalendarEvent[]): boolean {
        return events.some(event => {
            const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
            const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
            return start < eventEnd && end > eventStart;
        });
    }

    /**
     * 팀 슬롯 점수 계산
     */
    private scoreTeamSlot(
        slot: TimeSlot,
        request: TeamSchedulingRequest,
        participantEvents: Map<string, CalendarEvent[]>,
        productivityScore: Map<string, number>,
        meetingConfig?: MeetingType
    ): TeamSchedulingSuggestion {
        let score = 100;
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        const conflicts: ConflictInfo[] = [];
        let reasoning = '';

        // 1. 참가자 가용성 체크
        const attendeeAvailability = new Map<string, 'available' | 'busy' | 'tentative'>();
        let availableCount = 0;
        let totalRequired = 0;

        request.members.forEach(member => {
            const events = participantEvents.get(member.email) || [];
            const hasConflict = this.hasConflict(slotStart, slotEnd, events);
            
            if (!hasConflict) {
                attendeeAvailability.set(member.email, 'available');
                availableCount++;
            } else if (member.priority === 'optional') {
                attendeeAvailability.set(member.email, 'tentative');
            } else {
                attendeeAvailability.set(member.email, 'busy');
                if (member.priority === 'required') {
                    score -= 50;
                    conflicts.push({
                        eventId: `conflict_${member.email}`,
                        eventTitle: `${member.displayName || member.email} 참석 불가`,
                        conflictType: 'overlap',
                        severity: 'high'
                    });
                }
            }

            if (member.priority === 'required') {
                totalRequired++;
            }
        });

        const attendanceCoverage = totalRequired > 0 ? (availableCount / totalRequired) * 100 : 100;
        score = score * (attendanceCoverage / 100);

        // 2. 회의 유형별 최적 시간 체크
        if (meetingConfig) {
            const hourStr = `${slotStart.getHours()}:00`;
            if (meetingConfig.idealTimeSlots.includes(hourStr)) {
                score += 15;
                reasoning += `${meetingConfig.type} 회의에 이상적인 시간입니다. `;
            }
        }

        // 3. 팀 생산성 패턴 점수 적용
        const hourKey = `${slotStart.getHours()}:00`;
        const dayKey = `day_${slotStart.toLocaleDateString('en-US', { weekday: 'long' })}`;
        
        if (productivityScore.has(hourKey)) {
            score += productivityScore.get(hourKey) || 0;
        }
        if (productivityScore.has(dayKey)) {
            score += productivityScore.get(dayKey) || 0;
        }

        // 4. 시간대 영향 분석
        const timezoneImpact = new Map<string, string>();
        request.members.forEach(member => {
            const localTime = this.getLocalTime(slotStart, member.timezone);
            timezoneImpact.set(member.email, localTime);
            
            // 극단적인 시간대(너무 이른 아침이나 늦은 저녁) 페널티
            const localHour = parseInt(localTime.split(':')[0]);
            if (localHour < 7 || localHour > 20) {
                score -= 10;
                reasoning += `${member.displayName || member.email}에게 불편한 시간대입니다. `;
            }
        });

        // 5. 연속 회의 체크
        const consecutiveMeetings = this.checkConsecutiveMeetings(
            slotStart,
            slotEnd,
            request.members,
            participantEvents
        );
        if (consecutiveMeetings > 2) {
            score -= consecutiveMeetings * 5;
            reasoning += `일부 참가자에게 연속 회의가 많습니다. `;
        }

        // 6. 회의 효율성 점수 계산
        const meetingEfficiencyScore = this.calculateMeetingEfficiency(
            score,
            attendanceCoverage,
            request,
            slotStart
        );

        return {
            slot,
            score: Math.max(0, Math.min(100, score)),
            conflicts,
            reasoning: reasoning.trim() || '적절한 시간입니다.',
            attendeeAvailability,
            timezoneImpact,
            meetingEfficiencyScore,
            preparationTasks: []
        };
    }

    /**
     * 로컬 시간 가져오기
     */
    private getLocalTime(date: Date, timezone?: string): string {
        // 간단한 구현, 실제로는 더 정확한 시간대 변환 필요
        const localDate = new Date(date);
        
        if (timezone && timezone !== 'Asia/Seoul') {
            // 시간대 오프셋 적용
            const timezoneOffsets: Record<string, number> = {
                'UTC': -9,
                'America/New_York': -14,
                'America/Los_Angeles': -17,
                'Europe/London': -9,
                'Europe/Paris': -8,
                'Asia/Tokyo': 0
            };
            
            const offset = timezoneOffsets[timezone] || 0;
            localDate.setHours(localDate.getHours() + offset);
        }

        return `${localDate.getHours()}:${localDate.getMinutes().toString().padStart(2, '0')}`;
    }

    /**
     * 연속 회의 체크
     */
    private checkConsecutiveMeetings(
        slotStart: Date,
        slotEnd: Date,
        members: TeamMember[],
        participantEvents: Map<string, CalendarEvent[]>
    ): number {
        let maxConsecutive = 0;

        members.forEach(member => {
            const events = participantEvents.get(member.email) || [];
            const dayStart = new Date(slotStart);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(slotStart);
            dayEnd.setHours(23, 59, 59, 999);

            const dayEvents = events.filter(event => {
                const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                return eventStart >= dayStart && eventStart <= dayEnd;
            });

            let consecutive = 0;
            dayEvents.forEach(event => {
                const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
                
                const gap = Math.abs(eventEnd.getTime() - slotStart.getTime()) / (1000 * 60);
                if (gap <= 30) {
                    consecutive++;
                }
            });

            maxConsecutive = Math.max(maxConsecutive, consecutive);
        });

        return maxConsecutive;
    }

    /**
     * 회의 효율성 점수 계산
     */
    private calculateMeetingEfficiency(
        baseScore: number,
        attendanceCoverage: number,
        request: TeamSchedulingRequest,
        slotStart: Date
    ): number {
        let efficiency = baseScore;

        // 참석률 가중치
        efficiency += attendanceCoverage * 0.3;

        // 회의 시간 효율성 (너무 이르거나 늦지 않은 시간)
        const hour = slotStart.getHours();
        if (hour >= 10 && hour <= 16) {
            efficiency += 10;
        }

        // 요일 효율성 (화-목요일 선호)
        const day = slotStart.getDay();
        if (day >= 2 && day <= 4) {
            efficiency += 5;
        }

        // 회의 유형별 가중치
        const meetingTypeWeights: Record<string, number> = {
            'standup': 1.0,
            'planning': 1.5,
            'review': 1.3,
            'brainstorm': 1.2,
            'one-on-one': 1.1,
            'all-hands': 1.4,
            'workshop': 1.6,
            'social': 0.9
        };

        const typeWeight = meetingTypeWeights[request.meetingType] || 1.0;
        efficiency *= typeWeight;

        return Math.min(100, efficiency);
    }

    /**
     * 회의 준비 태스크 생성
     */
    private generatePreparationTasks(
        request: TeamSchedulingRequest,
        slot: TimeSlot,
        meetingConfig: MeetingType
    ): PreparationTask[] {
        const tasks: PreparationTask[] = [];
        const meetingStart = new Date(slot.startTime);

        if (meetingConfig.requiresPreparation && meetingConfig.preparationTime) {
            const prepDeadline = new Date(meetingStart);
            prepDeadline.setMinutes(prepDeadline.getMinutes() - meetingConfig.preparationTime);

            // 회의 유형별 준비 태스크
            switch (request.meetingType) {
                case 'planning':
                    tasks.push({
                        task: '스프린트 백로그 정리 및 우선순위 설정',
                        priority: 'high',
                        dueDate: prepDeadline,
                        estimatedTime: 30
                    });
                    tasks.push({
                        task: '이전 스프린트 회고 정리',
                        priority: 'medium',
                        dueDate: prepDeadline,
                        estimatedTime: 15
                    });
                    break;

                case 'review':
                    tasks.push({
                        task: '리뷰 자료 준비 및 공유',
                        priority: 'high',
                        dueDate: prepDeadline,
                        estimatedTime: 45
                    });
                    tasks.push({
                        task: '주요 성과 및 이슈 정리',
                        priority: 'medium',
                        dueDate: prepDeadline,
                        estimatedTime: 20
                    });
                    break;

                case 'all-hands':
                    tasks.push({
                        task: '발표 자료 준비',
                        priority: 'high',
                        dueDate: prepDeadline,
                        estimatedTime: 60
                    });
                    tasks.push({
                        task: 'Q&A 예상 질문 준비',
                        priority: 'medium',
                        dueDate: prepDeadline,
                        estimatedTime: 30
                    });
                    break;

                case 'workshop':
                    tasks.push({
                        task: '워크샵 자료 및 템플릿 준비',
                        priority: 'high',
                        dueDate: prepDeadline,
                        estimatedTime: 90
                    });
                    tasks.push({
                        task: '필요 도구 및 리소스 확인',
                        priority: 'high',
                        dueDate: prepDeadline,
                        estimatedTime: 30
                    });
                    break;

                default:
                    tasks.push({
                        task: '회의 아젠다 준비',
                        priority: 'medium',
                        dueDate: prepDeadline,
                        estimatedTime: 15
                    });
            }
        }

        return tasks;
    }

    /**
     * 분석 리포트 생성
     */
    private generateAnalysisReport(
        suggestions: TeamSchedulingSuggestion[],
        request: TeamSchedulingRequest,
        timezoneAnalysis: Map<string, number>
    ): {
        totalConflicts: number;
        attendeeCoverage: number;
        timezoneSpread: number;
        preparationNeeded: boolean;
        followUpRequired: boolean;
    } {
        const totalConflicts = suggestions.reduce((sum, s) => sum + s.conflicts.length, 0);
        
        const avgCoverage = suggestions.length > 0
            ? suggestions.reduce((sum, s) => {
                const available = Array.from(s.attendeeAvailability.values())
                    .filter(status => status === 'available').length;
                return sum + (available / request.members.length) * 100;
            }, 0) / suggestions.length
            : 0;

        const timezoneSpread = timezoneAnalysis.size;
        
        const meetingConfig = this.meetingTypeConfigs.get(request.meetingType);
        const preparationNeeded = meetingConfig?.requiresPreparation || false;
        const followUpRequired = meetingConfig?.requiresFollowUp || false;

        return {
            totalConflicts,
            attendeeCoverage: Math.round(avgCoverage),
            timezoneSpread,
            preparationNeeded,
            followUpRequired
        };
    }

    /**
     * 추천 사항 생성
     */
    private generateRecommendations(
        request: TeamSchedulingRequest,
        report: any,
        suggestions: TeamSchedulingSuggestion[]
    ): string[] {
        const recommendations: string[] = [];

        // 참석률 기반 추천
        if (report.attendeeCoverage < 80) {
            recommendations.push('참석률이 낮습니다. 일정을 조정하거나 화상회의 옵션을 고려해보세요.');
        }

        // 시간대 기반 추천
        if (report.timezoneSpread > 2) {
            recommendations.push('다양한 시간대의 참가자가 있습니다. 녹화 옵션을 활성화하는 것을 권장합니다.');
        }

        // 회의 유형별 추천
        const meetingConfig = this.meetingTypeConfigs.get(request.meetingType);
        if (meetingConfig) {
            if (request.duration < meetingConfig.optimalDuration) {
                recommendations.push(`${request.meetingType} 회의는 일반적으로 ${meetingConfig.optimalDuration}분이 적절합니다.`);
            }
            
            if (meetingConfig.requiresPreparation) {
                recommendations.push('회의 준비 시간을 확보하세요. 자료 공유는 최소 1일 전에 하는 것이 좋습니다.');
            }

            if (meetingConfig.requiresFollowUp) {
                recommendations.push('회의 후 액션 아이템 정리 시간을 확보하세요.');
            }
        }

        // 최적 시간 추천
        if (suggestions.length > 0 && suggestions[0].meetingEfficiencyScore > 80) {
            const bestTime = new Date(suggestions[0].slot.startTime);
            recommendations.push(`추천 시간: ${bestTime.toLocaleDateString('ko-KR')} ${bestTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`);
        }

        // 연속 회의 경고
        const hasConsecutiveMeetings = suggestions.some(s => {
            const reasoning = s.reasoning.toLowerCase();
            return reasoning.includes('연속');
        });
        if (hasConsecutiveMeetings) {
            recommendations.push('일부 참가자에게 연속 회의가 있습니다. 5-10분의 휴식 시간을 고려하세요.');
        }

        return recommendations;
    }

    /**
     * 회의 패턴 학습
     */
    async learnTeamPatterns(
        teamId: string,
        historicalEvents: CalendarEvent[]
    ): Promise<TeamProductivityPattern> {
        const pattern: TeamProductivityPattern = {
            teamId,
            mostProductiveHours: [],
            leastProductiveHours: [],
            optimalMeetingDays: [],
            meetingFatigueTimes: [],
            averageMeetingDuration: new Map(),
            collaborationScore: new Map()
        };

        // 시간대별 회의 빈도 분석
        const hourFrequency = new Map<number, number>();
        const dayFrequency = new Map<string, number>();
        const typeFrequency = new Map<string, number[]>();

        historicalEvents.forEach(event => {
            if (event.start?.dateTime) {
                const startDate = new Date(event.start.dateTime);
                const hour = startDate.getHours();
                const day = startDate.toLocaleDateString('en-US', { weekday: 'long' });

                hourFrequency.set(hour, (hourFrequency.get(hour) || 0) + 1);
                dayFrequency.set(day, (dayFrequency.get(day) || 0) + 1);

                // 회의 유형별 시간 분석
                const eventType = this.inferMeetingType(event.summary);
                if (!typeFrequency.has(eventType)) {
                    typeFrequency.set(eventType, []);
                }
                
                const duration = this.calculateDuration(event);
                typeFrequency.get(eventType)?.push(duration);
            }
        });

        // 가장 생산적인 시간 찾기
        const sortedHours = Array.from(hourFrequency.entries())
            .sort((a, b) => b[1] - a[1]);
        
        pattern.mostProductiveHours = sortedHours
            .slice(0, 3)
            .map(([hour]) => hour);

        pattern.leastProductiveHours = sortedHours
            .slice(-2)
            .map(([hour]) => hour);

        // 최적 회의 요일 찾기
        const sortedDays = Array.from(dayFrequency.entries())
            .sort((a, b) => b[1] - a[1]);
        
        pattern.optimalMeetingDays = sortedDays
            .slice(0, 3)
            .map(([day]) => day);

        // 회의 피로 시간대 식별 (연속 회의가 많은 시간)
        const consecutiveTimes = this.findConsecutiveMeetingTimes(historicalEvents);
        pattern.meetingFatigueTimes = consecutiveTimes;

        // 평균 회의 시간 계산
        typeFrequency.forEach((durations, type) => {
            const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
            pattern.averageMeetingDuration.set(type, Math.round(avg));
        });

        return pattern;
    }

    /**
     * 회의 유형 추론
     */
    private inferMeetingType(summary: string): string {
        const lowerSummary = summary.toLowerCase();
        
        if (lowerSummary.includes('standup') || lowerSummary.includes('데일리')) {
            return 'standup';
        }
        if (lowerSummary.includes('planning') || lowerSummary.includes('계획')) {
            return 'planning';
        }
        if (lowerSummary.includes('review') || lowerSummary.includes('리뷰')) {
            return 'review';
        }
        if (lowerSummary.includes('1:1') || lowerSummary.includes('one-on-one')) {
            return 'one-on-one';
        }
        if (lowerSummary.includes('workshop') || lowerSummary.includes('워크샵')) {
            return 'workshop';
        }
        if (lowerSummary.includes('all-hands') || lowerSummary.includes('전체')) {
            return 'all-hands';
        }
        
        return 'general';
    }

    /**
     * 회의 시간 계산
     */
    private calculateDuration(event: CalendarEvent): number {
        if (!event.start?.dateTime || !event.end?.dateTime) {
            return 60; // 기본값
        }

        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    }

    /**
     * 연속 회의 시간대 찾기
     */
    private findConsecutiveMeetingTimes(events: CalendarEvent[]): string[] {
        const consecutiveTimes: string[] = [];
        const timeSlots = new Map<string, number>();

        // 시간대별로 그룹화
        events.forEach(event => {
            if (event.start?.dateTime) {
                const startDate = new Date(event.start.dateTime);
                const timeKey = `${startDate.getHours()}:00`;
                timeSlots.set(timeKey, (timeSlots.get(timeKey) || 0) + 1);
            }
        });

        // 연속된 회의가 많은 시간 찾기
        timeSlots.forEach((count, time) => {
            if (count > 3) {
                consecutiveTimes.push(time);
            }
        });

        return consecutiveTimes;
    }
}

// 싱글톤 인스턴스
export const teamScheduler = new TeamScheduler();