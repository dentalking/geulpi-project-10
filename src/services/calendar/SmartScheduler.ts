import type {
    CalendarEvent,
    SchedulingConstraint,
    SchedulingSuggestion,
    TimeRange,
    TimeSlot,
    ConflictInfo,
    UserContext
} from '@/types';
import { patternLearner } from '../ai/PatternLearner';

/**
 * 스마트 스케줄링 서비스
 * AI 기반 최적 일정 시간 제안 및 충돌 해결
 */
export class SmartScheduler {
    private readonly SLOT_DURATION = 30; // 30분 단위 슬롯
    private readonly MAX_SUGGESTIONS = 5;
    private readonly WORKING_HOURS = { start: 9, end: 18 };

    /**
     * 최적 시간 찾기
     */
    async findOptimalTime(
        constraint: SchedulingConstraint,
        existingEvents: CalendarEvent[],
        userContext: UserContext
    ): Promise<SchedulingSuggestion[]> {
        const suggestions: SchedulingSuggestion[] = [];
        
        // 1. 가능한 시간 슬롯 생성
        const availableSlots = this.generateAvailableSlots(
            constraint,
            existingEvents,
            userContext
        );

        // 2. 각 슬롯 점수 계산
        const scoredSlots = availableSlots.map(slot => 
            this.scoreTimeSlot(slot, constraint, existingEvents, userContext)
        );

        // 3. 상위 제안 선택
        const topSuggestions = scoredSlots
            .sort((a, b) => b.score - a.score)
            .slice(0, this.MAX_SUGGESTIONS);

        return topSuggestions;
    }

    /**
     * 일정 충돌 감지
     */
    detectConflicts(
        newEvent: CalendarEvent,
        existingEvents: CalendarEvent[]
    ): ConflictInfo[] {
        const conflicts: ConflictInfo[] = [];
        const newStart = new Date(newEvent.start?.dateTime || newEvent.start?.date || '');
        const newEnd = new Date(newEvent.end?.dateTime || newEvent.end?.date || '');

        existingEvents.forEach(event => {
            const existingStart = new Date(event.start?.dateTime || event.start?.date || '');
            const existingEnd = new Date(event.end?.dateTime || event.end?.date || '');

            // 시간 겹침 체크
            if (this.isOverlapping(newStart, newEnd, existingStart, existingEnd)) {
                conflicts.push({
                    eventId: event.id || '',
                    eventTitle: event.summary,
                    conflictType: 'overlap',
                    severity: 'high'
                });
            }
            // 버퍼 시간 체크
            else if (this.isWithinBuffer(newStart, newEnd, existingStart, existingEnd, 15)) {
                conflicts.push({
                    eventId: event.id || '',
                    eventTitle: event.summary,
                    conflictType: 'buffer',
                    severity: 'medium'
                });
            }
        });

        return conflicts;
    }

    /**
     * 충돌 해결 제안
     */
    async suggestReschedule(
        conflict: ConflictInfo,
        constraint: SchedulingConstraint,
        existingEvents: CalendarEvent[],
        userContext: UserContext
    ): Promise<SchedulingSuggestion[]> {
        // 충돌하는 이벤트 제외하고 새로운 시간 찾기
        const eventsWithoutConflict = existingEvents.filter(
            e => e.id !== conflict.eventId
        );

        const suggestions = await this.findOptimalTime(
            constraint,
            eventsWithoutConflict,
            userContext
        );

        // 재조정 이유 추가
        suggestions.forEach(s => {
            s.reasoning = `${conflict.eventTitle}와의 충돌을 피하기 위한 대안 시간입니다. ${s.reasoning}`;
        });

        return suggestions;
    }

    /**
     * 이동 시간 계산
     */
    async calculateTravelTime(
        from: string | undefined,
        to: string | undefined
    ): Promise<number> {
        if (!from || !to) return 0;
        
        // 간단한 예측 로직 (실제로는 지도 API 사용)
        const commonLocations: Record<string, Record<string, number>> = {
            '강남': { '판교': 30, '여의도': 25, '강북': 40 },
            '판교': { '강남': 30, '여의도': 35, '강북': 50 },
            '여의도': { '강남': 25, '판교': 35, '강북': 30 },
            '강북': { '강남': 40, '판교': 50, '여의도': 30 }
        };

        // 위치 키워드 추출
        const fromKey = this.extractLocationKey(from);
        const toKey = this.extractLocationKey(to);

        if (fromKey && toKey && commonLocations[fromKey]?.[toKey]) {
            return commonLocations[fromKey][toKey];
        }

        // 기본 이동 시간
        return from.toLowerCase() === to.toLowerCase() ? 0 : 20;
    }

    /**
     * 가능한 시간 슬롯 생성
     */
    private generateAvailableSlots(
        constraint: SchedulingConstraint,
        existingEvents: CalendarEvent[],
        userContext: UserContext
    ): TimeSlot[] {
        const slots: TimeSlot[] = [];
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 14); // 2주 이내

        // 근무 시간 설정
        const workingHours = userContext.preferences.workingHours || this.WORKING_HOURS;

        for (let date = new Date(now); date < endDate; date.setDate(date.getDate() + 1)) {
            // 주말 제외 (선택적)
            if (date.getDay() === 0 || date.getDay() === 6) {
                continue;
            }

            // 하루 내 시간 슬롯 생성
            for (let hour = workingHours.start; hour < workingHours.end; hour++) {
                for (let minute = 0; minute < 60; minute += this.SLOT_DURATION) {
                    const slotStart = new Date(date);
                    slotStart.setHours(hour, minute, 0, 0);
                    
                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + constraint.duration);

                    // 근무 시간 내인지 체크
                    if (slotEnd.getHours() > workingHours.end || 
                        (slotEnd.getHours() === workingHours.end && slotEnd.getMinutes() > 0)) {
                        continue;
                    }

                    // 기존 일정과 충돌하는지 체크
                    const hasConflict = existingEvents.some(event => {
                        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
                        return this.isOverlapping(slotStart, slotEnd, eventStart, eventEnd);
                    });

                    if (!hasConflict) {
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
     * 시간 슬롯 점수 계산
     */
    private scoreTimeSlot(
        slot: TimeSlot,
        constraint: SchedulingConstraint,
        existingEvents: CalendarEvent[],
        userContext: UserContext
    ): SchedulingSuggestion {
        let score = 100; // 기본 점수
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        const conflicts: ConflictInfo[] = [];
        let reasoning = '';

        // 1. 선호 시간대 점수
        if (constraint.preferredTimeRanges) {
            const inPreferredRange = constraint.preferredTimeRanges.some(range =>
                slotStart >= range.start && slotEnd <= range.end
            );
            if (inPreferredRange) {
                score += 20;
                reasoning += '선호 시간대입니다. ';
            }
        }

        // 2. 회피 시간대 체크
        if (constraint.avoidTimeRanges) {
            const inAvoidRange = constraint.avoidTimeRanges.some(range =>
                this.isOverlapping(slotStart, slotEnd, range.start, range.end)
            );
            if (inAvoidRange) {
                score -= 30;
                reasoning += '회피하려는 시간대입니다. ';
            }
        }

        // 3. 버퍼 시간 점수
        const hasBufferBefore = this.hasBufferBefore(slotStart, existingEvents, constraint.buffer?.before || 0);
        const hasBufferAfter = this.hasBufferAfter(slotEnd, existingEvents, constraint.buffer?.after || 0);
        
        if (hasBufferBefore && hasBufferAfter) {
            score += 15;
            reasoning += '전후 여유 시간이 충분합니다. ';
        } else if (hasBufferBefore || hasBufferAfter) {
            score += 8;
            reasoning += '일부 여유 시간이 있습니다. ';
        }

        // 4. 패턴 기반 점수
        const hour = slotStart.getHours();
        const patterns = userContext.patterns;
        
        if (patterns.commonMeetingTimes.includes(`${hour}:00`)) {
            score += 10;
            reasoning += '자주 사용하는 시간대입니다. ';
        }

        // 5. 연속 미팅 페널티
        const consecutiveMeetings = this.countConsecutiveMeetings(slotStart, slotEnd, existingEvents);
        if (consecutiveMeetings > 2) {
            score -= consecutiveMeetings * 5;
            reasoning += `연속된 미팅이 ${consecutiveMeetings}개 있습니다. `;
        }

        // 6. 시간대별 에너지 레벨 고려
        if (hour >= 14 && hour <= 15) {
            score -= 5; // 점심 직후 피로 시간
            reasoning += '점심 후 집중력이 떨어지는 시간입니다. ';
        } else if (hour >= 10 && hour <= 11) {
            score += 5; // 오전 집중 시간
            reasoning += '오전 집중력이 높은 시간입니다. ';
        }

        // 7. 요일별 점수
        const dayOfWeek = slotStart.getDay();
        if (dayOfWeek === 1) { // 월요일
            score -= 3;
            reasoning += '주 시작일이라 바쁠 수 있습니다. ';
        } else if (dayOfWeek === 5) { // 금요일
            score -= 2;
            reasoning += '주말 전이라 집중력이 떨어질 수 있습니다. ';
        }

        return {
            slot,
            score: Math.max(0, Math.min(100, score)),
            conflicts,
            reasoning: reasoning.trim() || '적절한 시간입니다.'
        };
    }

    /**
     * 시간 겹침 체크
     */
    private isOverlapping(
        start1: Date,
        end1: Date,
        start2: Date,
        end2: Date
    ): boolean {
        return start1 < end2 && end1 > start2;
    }

    /**
     * 버퍼 시간 내 체크
     */
    private isWithinBuffer(
        start1: Date,
        end1: Date,
        start2: Date,
        end2: Date,
        bufferMinutes: number
    ): boolean {
        const buffer = bufferMinutes * 60 * 1000; // 밀리초로 변환
        
        // 끝나는 시간과 시작 시간 사이 체크
        const gap1 = Math.abs(start1.getTime() - end2.getTime());
        const gap2 = Math.abs(start2.getTime() - end1.getTime());
        
        return (gap1 > 0 && gap1 <= buffer) || (gap2 > 0 && gap2 <= buffer);
    }

    /**
     * 이전 버퍼 체크
     */
    private hasBufferBefore(
        slotStart: Date,
        existingEvents: CalendarEvent[],
        bufferMinutes: number
    ): boolean {
        if (bufferMinutes === 0) return true;
        
        const bufferStart = new Date(slotStart);
        bufferStart.setMinutes(bufferStart.getMinutes() - bufferMinutes);
        
        return !existingEvents.some(event => {
            const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
            return eventEnd > bufferStart && eventEnd <= slotStart;
        });
    }

    /**
     * 이후 버퍼 체크
     */
    private hasBufferAfter(
        slotEnd: Date,
        existingEvents: CalendarEvent[],
        bufferMinutes: number
    ): boolean {
        if (bufferMinutes === 0) return true;
        
        const bufferEnd = new Date(slotEnd);
        bufferEnd.setMinutes(bufferEnd.getMinutes() + bufferMinutes);
        
        return !existingEvents.some(event => {
            const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
            return eventStart >= slotEnd && eventStart < bufferEnd;
        });
    }

    /**
     * 연속 미팅 수 계산
     */
    private countConsecutiveMeetings(
        slotStart: Date,
        slotEnd: Date,
        existingEvents: CalendarEvent[]
    ): number {
        const dayStart = new Date(slotStart);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(slotStart);
        dayEnd.setHours(23, 59, 59, 999);

        const dayEvents = existingEvents.filter(event => {
            const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
            return eventStart >= dayStart && eventStart <= dayEnd;
        }).sort((a, b) => {
            const aStart = new Date(a.start?.dateTime || a.start?.date || '');
            const bStart = new Date(b.start?.dateTime || b.start?.date || '');
            return aStart.getTime() - bStart.getTime();
        });

        let consecutiveCount = 0;
        let inSequence = false;

        for (const event of dayEvents) {
            const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
            const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');

            if (this.isOverlapping(slotStart, slotEnd, eventStart, eventEnd) ||
                this.isWithinBuffer(slotStart, slotEnd, eventStart, eventEnd, 30)) {
                if (!inSequence) {
                    inSequence = true;
                    consecutiveCount = 1;
                } else {
                    consecutiveCount++;
                }
            } else if (inSequence && eventStart > slotEnd) {
                break;
            }
        }

        return consecutiveCount;
    }

    /**
     * 위치 키워드 추출
     */
    private extractLocationKey(location: string): string | null {
        const keywords = ['강남', '판교', '여의도', '강북'];
        const lowerLocation = location.toLowerCase();
        
        for (const keyword of keywords) {
            if (lowerLocation.includes(keyword)) {
                return keyword;
            }
        }
        
        return null;
    }

    /**
     * 팀 공통 시간 찾기
     */
    async findCommonSlots(
        participants: string[],
        duration: number,
        participantEvents: Map<string, CalendarEvent[]>
    ): Promise<TimeSlot[]> {
        const commonSlots: TimeSlot[] = [];
        const now = new Date();
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 7); // 1주일 이내

        for (let date = new Date(now); date < endDate; date.setDate(date.getDate() + 1)) {
            // 주말 제외
            if (date.getDay() === 0 || date.getDay() === 6) {
                continue;
            }

            for (let hour = this.WORKING_HOURS.start; hour < this.WORKING_HOURS.end; hour++) {
                for (let minute = 0; minute < 60; minute += this.SLOT_DURATION) {
                    const slotStart = new Date(date);
                    slotStart.setHours(hour, minute, 0, 0);
                    
                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

                    // 모든 참가자가 가능한지 체크
                    const allAvailable = participants.every(participant => {
                        const events = participantEvents.get(participant) || [];
                        return !events.some(event => {
                            const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
                            const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
                            return this.isOverlapping(slotStart, slotEnd, eventStart, eventEnd);
                        });
                    });

                    if (allAvailable) {
                        commonSlots.push({
                            startTime: slotStart.toISOString(),
                            endTime: slotEnd.toISOString()
                        });
                    }
                }
            }
        }

        return commonSlots.slice(0, 10); // 상위 10개만 반환
    }
}

// 싱글톤 인스턴스
export const smartScheduler = new SmartScheduler();