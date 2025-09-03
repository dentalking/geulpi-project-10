import type { UserContext, SmartSuggestion } from '@/types';

class SuggestionEngine {
    async generateSuggestions(context: UserContext): Promise<SmartSuggestion[]> {
        const suggestions: SmartSuggestion[] = [];
        const now = context.currentTime;
        const hour = now.getHours();

        // 시간 기반 제안
        if (hour >= 8 && hour <= 9) {
            suggestions.push({
                id: 'morning-briefing',
                type: 'quick_action',
                title: '오늘 브리핑',
                action: '오늘 브리핑'
            });
        }

        if (hour >= 17 && hour <= 18) {
            suggestions.push({
                id: 'tomorrow-prep',
                type: 'quick_action',
                title: '내일 준비',
                action: '내일 일정'
            });
        }

        // 패턴 기반 제안
        if (context.patterns.frequentLocations.length > 0) {
            const topLocation = context.patterns.frequentLocations[0];
            suggestions.push({
                id: 'frequent-location',
                type: 'template',
                title: `${topLocation}에서 미팅`,
                action: `${topLocation}에서 미팅`
            });
        }

        // 빈 시간대 제안
        const nextFreeSlot = this.findNextFreeSlot(context.recentEvents, now);
        if (nextFreeSlot) {
            suggestions.push({
                id: 'free-slot',
                type: 'tip',
                title: `다음 빈 시간: ${nextFreeSlot.toLocaleString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric'
                })}`,
                action: '빈 시간에 일정 추가'
            });
        }

        return suggestions.slice(0, 4); // 최대 4개
    }

    private findNextFreeSlot(events: any[], from: Date): Date | null {
        // 간단한 알고리즘: 다음 2일간 2시간 이상 빈 시간 찾기
        const workStart = 9;
        const workEnd = 18;

        for (let day = 0; day < 2; day++) {
            const checkDate = new Date(from);
            checkDate.setDate(checkDate.getDate() + day);

            for (let hour = workStart; hour < workEnd - 2; hour++) {
                const slotStart = new Date(checkDate);
                slotStart.setHours(hour, 0, 0, 0);

                const slotEnd = new Date(slotStart);
                slotEnd.setHours(hour + 2);

                const hasConflict = events.some(event => {
                    const eventStart = new Date(event.start.dateTime);
                    const eventEnd = new Date(event.end.dateTime);
                    return eventStart < slotEnd && eventEnd > slotStart;
                });

                if (!hasConflict) {
                    return slotStart;
                }
            }
        }

        return null;
    }
}

export const suggestionEngine = new SuggestionEngine();