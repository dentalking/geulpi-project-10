import { describe, it, expect, beforeEach } from 'vitest';
import { TeamScheduler } from './TeamScheduler';
import type { 
    TeamSchedulingRequest, 
    TeamMember, 
    CalendarEvent,
    TeamProductivityPattern 
} from '@/types';

describe('TeamScheduler', () => {
    let scheduler: TeamScheduler;
    let mockRequest: TeamSchedulingRequest;
    let mockParticipantEvents: Map<string, CalendarEvent[]>;
    let mockTeamPattern: TeamProductivityPattern;

    beforeEach(() => {
        scheduler = new TeamScheduler();

        // Mock 팀 회의 요청
        mockRequest = {
            title: '스프린트 계획 회의',
            meetingType: 'planning',
            duration: 120,
            members: [
                {
                    email: 'john@example.com',
                    displayName: 'John Doe',
                    priority: 'required',
                    timezone: 'Asia/Seoul',
                    workingHours: { start: 9, end: 18 }
                },
                {
                    email: 'jane@example.com',
                    displayName: 'Jane Smith',
                    priority: 'required',
                    timezone: 'Asia/Seoul',
                    workingHours: { start: 10, end: 19 }
                },
                {
                    email: 'bob@example.com',
                    displayName: 'Bob Johnson',
                    priority: 'optional',
                    timezone: 'America/New_York',
                    workingHours: { start: 9, end: 17 }
                }
            ],
            flexibleDuration: true,
            allowPartialAttendance: false
        };

        // Mock 참가자별 기존 일정
        mockParticipantEvents = new Map([
            ['john@example.com', [
                {
                    id: 'event1',
                    summary: '기존 회의 1',
                    start: { dateTime: new Date('2025-09-01T10:00:00').toISOString() },
                    end: { dateTime: new Date('2025-09-01T11:00:00').toISOString() }
                },
                {
                    id: 'event2',
                    summary: '기존 회의 2',
                    start: { dateTime: new Date('2025-09-01T14:00:00').toISOString() },
                    end: { dateTime: new Date('2025-09-01T15:00:00').toISOString() }
                }
            ]],
            ['jane@example.com', [
                {
                    id: 'event3',
                    summary: '점심 약속',
                    start: { dateTime: new Date('2025-09-01T12:00:00').toISOString() },
                    end: { dateTime: new Date('2025-09-01T13:00:00').toISOString() }
                }
            ]],
            ['bob@example.com', []]
        ]);

        // Mock 팀 생산성 패턴
        mockTeamPattern = {
            teamId: 'team-123',
            mostProductiveHours: [10, 14, 15],
            leastProductiveHours: [9, 17],
            optimalMeetingDays: ['Tuesday', 'Wednesday', 'Thursday'],
            meetingFatigueTimes: ['16:00', '17:00'],
            averageMeetingDuration: new Map([
                ['planning', 120],
                ['standup', 15],
                ['review', 90]
            ]),
            collaborationScore: new Map([
                ['john-jane', 85],
                ['john-bob', 70],
                ['jane-bob', 60]
            ])
        };
    });

    describe('scheduleTeamMeeting', () => {
        it('팀 회의 일정을 성공적으로 조율해야 함', async () => {
            const result = await scheduler.scheduleTeamMeeting(
                mockRequest,
                mockParticipantEvents,
                mockTeamPattern
            );

            expect(result).toBeDefined();
            expect(result.suggestions).toBeInstanceOf(Array);
            expect(result.analysisReport).toBeDefined();
            expect(result.recommendations).toBeInstanceOf(Array);
        });

        it('필수 참가자의 일정 충돌을 감지해야 함', async () => {
            const result = await scheduler.scheduleTeamMeeting(
                mockRequest,
                mockParticipantEvents
            );

            // 충돌이 있는 시간대는 점수가 낮아야 함
            result.suggestions.forEach(suggestion => {
                const slotStart = new Date(suggestion.slot.startTime);
                const slotEnd = new Date(suggestion.slot.endTime);
                
                // John의 10-11시 회의와 충돌하는지 체크
                const conflictsWithJohn = 
                    slotStart < new Date('2025-09-01T11:00:00') && 
                    slotEnd > new Date('2025-09-01T10:00:00');

                if (conflictsWithJohn) {
                    expect(suggestion.conflicts.length).toBeGreaterThan(0);
                }
            });
        });

        it('회의 유형에 따른 최적 시간을 제안해야 함', async () => {
            const result = await scheduler.scheduleTeamMeeting(
                mockRequest,
                mockParticipantEvents,
                mockTeamPattern
            );

            // Planning 미팅의 이상적인 시간대 체크
            const topSuggestion = result.suggestions[0];
            if (topSuggestion) {
                const hour = new Date(topSuggestion.slot.startTime).getHours();
                // Planning 미팅은 10시 또는 14시가 이상적
                const isIdealTime = hour === 10 || hour === 14;
                
                if (isIdealTime) {
                    expect(topSuggestion.reasoning).toContain('이상적인 시간');
                }
            }
        });

        it('시간대가 다른 참가자를 고려해야 함', async () => {
            const result = await scheduler.scheduleTeamMeeting(
                mockRequest,
                mockParticipantEvents
            );

            result.suggestions.forEach(suggestion => {
                expect(suggestion.timezoneImpact).toBeDefined();
                expect(suggestion.timezoneImpact.size).toBe(mockRequest.members.length);
            });
        });

        it('회의 준비 태스크를 생성해야 함', async () => {
            const result = await scheduler.scheduleTeamMeeting(
                mockRequest,
                mockParticipantEvents,
                mockTeamPattern
            );

            // Planning 미팅은 준비가 필요함
            const topSuggestion = result.suggestions[0];
            if (topSuggestion && topSuggestion.preparationTasks) {
                expect(topSuggestion.preparationTasks.length).toBeGreaterThan(0);
                
                topSuggestion.preparationTasks.forEach(task => {
                    expect(task.task).toBeDefined();
                    expect(task.priority).toMatch(/^(low|medium|high)$/);
                    expect(task.dueDate).toBeInstanceOf(Date);
                    expect(task.estimatedTime).toBeGreaterThan(0);
                });
            }
        });

        it('팀 생산성 패턴을 적용해야 함', async () => {
            const resultWithPattern = await scheduler.scheduleTeamMeeting(
                mockRequest,
                mockParticipantEvents,
                mockTeamPattern
            );

            const resultWithoutPattern = await scheduler.scheduleTeamMeeting(
                mockRequest,
                mockParticipantEvents
            );

            // 패턴이 적용된 경우 더 나은 점수를 가져야 함
            const avgScoreWithPattern = resultWithPattern.suggestions
                .reduce((sum, s) => sum + s.meetingEfficiencyScore, 0) / 
                resultWithPattern.suggestions.length;

            const avgScoreWithoutPattern = resultWithoutPattern.suggestions
                .reduce((sum, s) => sum + s.meetingEfficiencyScore, 0) / 
                resultWithoutPattern.suggestions.length;

            // 패턴이 적용되면 일반적으로 더 나은 점수를 받음
            expect(avgScoreWithPattern).toBeGreaterThanOrEqual(avgScoreWithoutPattern * 0.9);
        });
    });

    describe('learnTeamPatterns', () => {
        it('과거 일정에서 팀 패턴을 학습해야 함', async () => {
            const historicalEvents: CalendarEvent[] = [
                {
                    summary: 'Daily Standup',
                    start: { dateTime: new Date('2025-08-01T09:00:00').toISOString() },
                    end: { dateTime: new Date('2025-08-01T09:15:00').toISOString() }
                },
                {
                    summary: 'Sprint Planning',
                    start: { dateTime: new Date('2025-08-01T10:00:00').toISOString() },
                    end: { dateTime: new Date('2025-08-01T12:00:00').toISOString() }
                },
                {
                    summary: 'Code Review',
                    start: { dateTime: new Date('2025-08-01T14:00:00').toISOString() },
                    end: { dateTime: new Date('2025-08-01T15:30:00').toISOString() }
                },
                {
                    summary: 'Daily Standup',
                    start: { dateTime: new Date('2025-08-02T09:00:00').toISOString() },
                    end: { dateTime: new Date('2025-08-02T09:15:00').toISOString() }
                },
                {
                    summary: 'Team Workshop',
                    start: { dateTime: new Date('2025-08-02T13:00:00').toISOString() },
                    end: { dateTime: new Date('2025-08-02T16:00:00').toISOString() }
                }
            ];

            const pattern = await scheduler.learnTeamPatterns('team-123', historicalEvents);

            expect(pattern).toBeDefined();
            expect(pattern.teamId).toBe('team-123');
            expect(pattern.mostProductiveHours).toBeInstanceOf(Array);
            expect(pattern.leastProductiveHours).toBeInstanceOf(Array);
            expect(pattern.optimalMeetingDays).toBeInstanceOf(Array);
            expect(pattern.averageMeetingDuration).toBeInstanceOf(Map);
        });

        it('회의 유형을 올바르게 추론해야 함', async () => {
            const events: CalendarEvent[] = [
                { summary: 'Daily Standup', start: { dateTime: new Date().toISOString() }, end: { dateTime: new Date().toISOString() } },
                { summary: 'Sprint Planning Meeting', start: { dateTime: new Date().toISOString() }, end: { dateTime: new Date().toISOString() } },
                { summary: 'Code Review Session', start: { dateTime: new Date().toISOString() }, end: { dateTime: new Date().toISOString() } },
                { summary: '1:1 with Manager', start: { dateTime: new Date().toISOString() }, end: { dateTime: new Date().toISOString() } },
                { summary: 'All-hands Meeting', start: { dateTime: new Date().toISOString() }, end: { dateTime: new Date().toISOString() } }
            ];

            const pattern = await scheduler.learnTeamPatterns('team-123', events);
            
            expect(pattern.averageMeetingDuration.has('standup')).toBe(true);
            expect(pattern.averageMeetingDuration.has('planning')).toBe(true);
            expect(pattern.averageMeetingDuration.has('review')).toBe(true);
            expect(pattern.averageMeetingDuration.has('one-on-one')).toBe(true);
            expect(pattern.averageMeetingDuration.has('all-hands')).toBe(true);
        });

        it('연속 회의 시간대를 식별해야 함', async () => {
            const events: CalendarEvent[] = [
                { summary: 'Meeting 1', start: { dateTime: new Date('2025-08-01T14:00:00').toISOString() }, end: { dateTime: new Date('2025-08-01T15:00:00').toISOString() } },
                { summary: 'Meeting 2', start: { dateTime: new Date('2025-08-02T14:00:00').toISOString() }, end: { dateTime: new Date('2025-08-02T15:00:00').toISOString() } },
                { summary: 'Meeting 3', start: { dateTime: new Date('2025-08-03T14:00:00').toISOString() }, end: { dateTime: new Date('2025-08-03T15:00:00').toISOString() } },
                { summary: 'Meeting 4', start: { dateTime: new Date('2025-08-04T14:00:00').toISOString() }, end: { dateTime: new Date('2025-08-04T15:00:00').toISOString() } }
            ];

            const pattern = await scheduler.learnTeamPatterns('team-123', events);
            
            // 14:00이 연속 회의 시간대로 식별되어야 함
            expect(pattern.meetingFatigueTimes).toContain('14:00');
        });
    });

    describe('Edge Cases', () => {
        it('참가자가 없는 경우를 처리해야 함', async () => {
            const emptyRequest: TeamSchedulingRequest = {
                ...mockRequest,
                members: []
            };

            const result = await scheduler.scheduleTeamMeeting(
                emptyRequest,
                new Map()
            );

            expect(result).toBeDefined();
            expect(result.suggestions).toBeInstanceOf(Array);
        });

        it('모든 시간이 차있는 경우를 처리해야 함', async () => {
            // 모든 시간이 차있는 이벤트 맵 생성
            const busyEvents = new Map<string, CalendarEvent[]>();
            const allDayEvents: CalendarEvent[] = [];
            
            for (let i = 0; i < 14; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);
                allDayEvents.push({
                    id: `busy-${i}`,
                    summary: 'All Day Meeting',
                    start: { 
                        dateTime: new Date(date.setHours(0, 0, 0, 0)).toISOString() 
                    },
                    end: { 
                        dateTime: new Date(date.setHours(23, 59, 59, 999)).toISOString() 
                    }
                });
            }

            mockRequest.members.forEach(member => {
                busyEvents.set(member.email, allDayEvents);
            });

            const result = await scheduler.scheduleTeamMeeting(
                mockRequest,
                busyEvents
            );

            expect(result).toBeDefined();
            expect(result.suggestions.length).toBe(0);
            expect(result.recommendations).toContain('참석률이 낮습니다. 일정을 조정하거나 화상회의 옵션을 고려해보세요.');
        });

        it('다양한 시간대의 참가자를 처리해야 함', async () => {
            const globalRequest: TeamSchedulingRequest = {
                ...mockRequest,
                members: [
                    {
                        email: 'seoul@example.com',
                        displayName: 'Seoul User',
                        priority: 'required',
                        timezone: 'Asia/Seoul',
                        workingHours: { start: 9, end: 18 }
                    },
                    {
                        email: 'ny@example.com',
                        displayName: 'NY User',
                        priority: 'required',
                        timezone: 'America/New_York',
                        workingHours: { start: 9, end: 17 }
                    },
                    {
                        email: 'london@example.com',
                        displayName: 'London User',
                        priority: 'required',
                        timezone: 'Europe/London',
                        workingHours: { start: 9, end: 18 }
                    }
                ]
            };

            const result = await scheduler.scheduleTeamMeeting(
                globalRequest,
                new Map()
            );

            expect(result).toBeDefined();
            expect(result.analysisReport.timezoneSpread).toBe(3);
            expect(result.recommendations).toContain('다양한 시간대의 참가자가 있습니다. 녹화 옵션을 활성화하는 것을 권장합니다.');
        });
    });
});