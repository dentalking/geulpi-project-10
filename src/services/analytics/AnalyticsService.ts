import { CalendarEvent, UserContext, PatternInsight } from '@/types';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfDay,
  endOfDay,
  differenceInMinutes,
  format,
  isWithinInterval,
  getDay,
  getHours,
  addDays,
  subDays
} from 'date-fns';

export interface TimeStatistics {
  totalHours: number;
  meetingHours: number;
  focusHours: number;
  breakHours: number;
  overtimeHours: number;
}

export interface ProductivityMetrics {
  productivityScore: number;
  meetingEfficiency: number;
  focusTimeRatio: number;
  workLifeBalance: number;
  trends: TrendData[];
}

export interface TrendData {
  date: string;
  value: number;
  label: string;
}

export interface CategoryBreakdown {
  category: string;
  hours: number;
  percentage: number;
  count: number;
  color: string;
}

export interface HeatmapData {
  day: number;
  hour: number;
  value: number;
}

export interface AttendeeStats {
  email: string;
  name: string;
  meetingCount: number;
  totalHours: number;
  averageDuration: number;
}

export class AnalyticsService {
  async getTimeStatistics(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date,
    context: UserContext
  ): Promise<TimeStatistics> {
    const filteredEvents = this.filterEventsByDateRange(events, startDate, endDate);
    
    let totalMinutes = 0;
    let meetingMinutes = 0;
    let focusMinutes = 0;
    let breakMinutes = 0;

    filteredEvents.forEach(event => {
      if (!event.start?.dateTime || !event.end?.dateTime) return;
      
      const duration = differenceInMinutes(
        new Date(event.end.dateTime),
        new Date(event.start.dateTime)
      );

      totalMinutes += duration;

      if (this.isMeeting(event)) {
        meetingMinutes += duration;
      } else if (this.isFocusTime(event)) {
        focusMinutes += duration;
      } else if (this.isBreak(event)) {
        breakMinutes += duration;
      }
    });

    const workingHoursPerDay = context.preferences.workingHours.end - context.preferences.workingHours.start;
    const workDays = this.getWorkDaysCount(startDate, endDate);
    const expectedHours = workDays * workingHoursPerDay;
    const actualHours = totalMinutes / 60;
    const overtimeHours = Math.max(0, actualHours - expectedHours);

    return {
      totalHours: actualHours,
      meetingHours: meetingMinutes / 60,
      focusHours: focusMinutes / 60,
      breakHours: breakMinutes / 60,
      overtimeHours
    };
  }

  async getProductivityMetrics(
    events: CalendarEvent[],
    context: UserContext
  ): Promise<ProductivityMetrics> {
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const stats = await this.getTimeStatistics(events, weekAgo, now, context);

    // 생산성 점수 계산 (0-100)
    const productivityScore = this.calculateProductivityScore(stats);
    
    // 회의 효율성 (짧은 회의 선호)
    const meetingEfficiency = this.calculateMeetingEfficiency(events);
    
    // 집중 시간 비율
    const focusTimeRatio = stats.focusHours / (stats.totalHours || 1);
    
    // 워라밸 점수 (초과 근무 반영)
    const workLifeBalance = Math.max(0, 100 - (stats.overtimeHours * 10));

    // 7일간 트렌드 데이터
    const trends = this.generateTrendData(events, 7);

    return {
      productivityScore,
      meetingEfficiency,
      focusTimeRatio,
      workLifeBalance,
      trends
    };
  }

  async getCategoryBreakdown(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date
  ): Promise<CategoryBreakdown[]> {
    const categories = new Map<string, { hours: number; count: number }>();
    const filteredEvents = this.filterEventsByDateRange(events, startDate, endDate);

    filteredEvents.forEach(event => {
      if (!event.start?.dateTime || !event.end?.dateTime) return;
      
      const category = this.categorizeEvent(event);
      const duration = differenceInMinutes(
        new Date(event.end.dateTime),
        new Date(event.start.dateTime)
      ) / 60;

      const current = categories.get(category) || { hours: 0, count: 0 };
      categories.set(category, {
        hours: current.hours + duration,
        count: current.count + 1
      });
    });

    const totalHours = Array.from(categories.values())
      .reduce((sum, cat) => sum + cat.hours, 0);

    const colors = {
      '회의': '#3B82F6',
      '집중 시간': '#10B981',
      '휴식': '#F59E0B',
      '개인 일정': '#8B5CF6',
      '교육': '#EC4899',
      '기타': '#6B7280'
    };

    return Array.from(categories.entries()).map(([category, data]) => ({
      category,
      hours: data.hours,
      percentage: (data.hours / totalHours) * 100,
      count: data.count,
      color: colors[category as keyof typeof colors] || '#6B7280'
    })).sort((a, b) => b.hours - a.hours);
  }

  async getHeatmapData(
    events: CalendarEvent[],
    weeks: number = 4
  ): Promise<HeatmapData[]> {
    const heatmap: Map<string, number> = new Map();
    const now = new Date();
    const startDate = subDays(now, weeks * 7);

    const filteredEvents = this.filterEventsByDateRange(events, startDate, now);

    filteredEvents.forEach(event => {
      if (!event.start?.dateTime || !event.end?.dateTime) return;

      const start = new Date(event.start.dateTime);
      const duration = differenceInMinutes(
        new Date(event.end.dateTime),
        start
      );

      const day = getDay(start);
      const hour = getHours(start);
      const key = `${day}-${hour}`;

      heatmap.set(key, (heatmap.get(key) || 0) + duration);
    });

    const result: HeatmapData[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        result.push({
          day,
          hour,
          value: heatmap.get(key) || 0
        });
      }
    }

    return result;
  }

  async getTopAttendees(
    events: CalendarEvent[],
    limit: number = 10
  ): Promise<AttendeeStats[]> {
    const attendeeMap = new Map<string, AttendeeStats>();

    events.forEach(event => {
      if (!event.attendees || !event.start?.dateTime || !event.end?.dateTime) return;

      const duration = differenceInMinutes(
        new Date(event.end.dateTime),
        new Date(event.start.dateTime)
      ) / 60;

      event.attendees.forEach(attendee => {
        if (!attendee.email) return;

        const current = attendeeMap.get(attendee.email) || {
          email: attendee.email,
          name: attendee.displayName || attendee.email,
          meetingCount: 0,
          totalHours: 0,
          averageDuration: 0
        };

        current.meetingCount += 1;
        current.totalHours += duration;
        current.averageDuration = current.totalHours / current.meetingCount;

        attendeeMap.set(attendee.email, current);
      });
    });

    return Array.from(attendeeMap.values())
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, limit);
  }

  async generateInsights(
    events: CalendarEvent[],
    context: UserContext
  ): Promise<PatternInsight[]> {
    const insights: PatternInsight[] = [];
    const now = new Date();
    const monthAgo = subDays(now, 30);

    // 회의 패턴 분석
    const meetingPattern = this.analyzeMeetingPattern(events, monthAgo, now);
    if (meetingPattern) insights.push(meetingPattern);

    // 초과 근무 패턴
    const overtimePattern = this.analyzeOvertimePattern(events, context);
    if (overtimePattern) insights.push(overtimePattern);

    // 집중 시간 패턴
    const focusPattern = this.analyzeFocusTimePattern(events);
    if (focusPattern) insights.push(focusPattern);

    // 협업 패턴
    const collaborationPattern = await this.analyzeCollaborationPattern(events);
    if (collaborationPattern) insights.push(collaborationPattern);

    return insights;
  }

  private filterEventsByDateRange(
    events: CalendarEvent[],
    startDate: Date,
    endDate: Date
  ): CalendarEvent[] {
    return events.filter(event => {
      if (!event.start?.dateTime) return false;
      const eventDate = new Date(event.start.dateTime);
      return isWithinInterval(eventDate, { start: startDate, end: endDate });
    });
  }

  private isMeeting(event: CalendarEvent): boolean {
    const meetingKeywords = ['meeting', '회의', 'sync', '미팅', 'call'];
    const summary = event.summary?.toLowerCase() || '';
    return meetingKeywords.some(keyword => summary.includes(keyword)) ||
           (event.attendees && event.attendees.length > 1) || false;
  }

  private isFocusTime(event: CalendarEvent): boolean {
    const focusKeywords = ['focus', '집중', 'deep work', '작업', 'coding', '개발'];
    const summary = event.summary?.toLowerCase() || '';
    return focusKeywords.some(keyword => summary.includes(keyword));
  }

  private isBreak(event: CalendarEvent): boolean {
    const breakKeywords = ['break', '휴식', 'lunch', '점심', 'coffee', '커피'];
    const summary = event.summary?.toLowerCase() || '';
    return breakKeywords.some(keyword => summary.includes(keyword));
  }

  private categorizeEvent(event: CalendarEvent): string {
    if (this.isMeeting(event)) return '회의';
    if (this.isFocusTime(event)) return '집중 시간';
    if (this.isBreak(event)) return '휴식';
    
    const summary = event.summary?.toLowerCase() || '';
    if (summary.includes('교육') || summary.includes('training') || summary.includes('학습')) {
      return '교육';
    }
    if (summary.includes('개인') || summary.includes('personal')) {
      return '개인 일정';
    }
    
    return '기타';
  }

  private getWorkDaysCount(startDate: Date, endDate: Date): number {
    let count = 0;
    let current = new Date(startDate);
    
    while (current <= endDate) {
      const day = getDay(current);
      if (day !== 0 && day !== 6) { // 주말 제외
        count++;
      }
      current = addDays(current, 1);
    }
    
    return count;
  }

  private calculateProductivityScore(stats: TimeStatistics): number {
    const focusRatio = stats.focusHours / (stats.totalHours || 1);
    const meetingRatio = stats.meetingHours / (stats.totalHours || 1);
    const overtimePenalty = Math.min(stats.overtimeHours * 5, 30);
    
    const score = (focusRatio * 50) + 
                  ((1 - meetingRatio) * 30) + 
                  20 - overtimePenalty;
    
    return Math.max(0, Math.min(100, score * 100));
  }

  private calculateMeetingEfficiency(events: CalendarEvent[]): number {
    const meetings = events.filter(e => this.isMeeting(e));
    if (meetings.length === 0) return 100;

    let efficiencyScore = 0;
    meetings.forEach(meeting => {
      if (!meeting.start?.dateTime || !meeting.end?.dateTime) return;
      
      const duration = differenceInMinutes(
        new Date(meeting.end.dateTime),
        new Date(meeting.start.dateTime)
      );

      // 30분 미팅이 가장 효율적
      if (duration === 30) efficiencyScore += 100;
      else if (duration === 60) efficiencyScore += 80;
      else if (duration < 30) efficiencyScore += 70;
      else if (duration > 90) efficiencyScore += 40;
      else efficiencyScore += 60;
    });

    return efficiencyScore / meetings.length;
  }

  private generateTrendData(events: CalendarEvent[], days: number): TrendData[] {
    const trends: TrendData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayEvents = this.filterEventsByDateRange(
        events,
        this.startOfDay(date),
        this.endOfDay(date)
      );

      let totalMinutes = 0;
      dayEvents.forEach(event => {
        if (!event.start?.dateTime || !event.end?.dateTime) return;
        totalMinutes += differenceInMinutes(
          new Date(event.end.dateTime),
          new Date(event.start.dateTime)
        );
      });

      trends.push({
        date: format(date, 'MM/dd'),
        value: totalMinutes / 60,
        label: format(date, 'EEE')
      });
    }

    return trends;
  }

  private analyzeMeetingPattern(
    events: CalendarEvent[],
    _startDate: Date,
    _endDate: Date
  ): PatternInsight | null {
    const meetings = events.filter(e => this.isMeeting(e));
    const totalEvents = events.length;
    
    if (meetings.length === 0) return null;

    const meetingRatio = meetings.length / totalEvents;
    
    if (meetingRatio > 0.6) {
      return {
        type: 'meeting_pattern',
        pattern: '회의가 전체 일정의 60% 이상을 차지합니다',
        confidence: 0.9,
        frequency: meetings.length,
        suggestion: '집중 시간 블록을 확보하는 것을 고려해보세요'
      };
    }

    return null;
  }

  private analyzeOvertimePattern(
    events: CalendarEvent[],
    context: UserContext
  ): PatternInsight | null {
    let overtimeDays = 0;
    const now = new Date();
    const weekAgo = subDays(now, 7);

    for (let i = 0; i < 7; i++) {
      const date = subDays(now, i);
      const dayEvents = this.filterEventsByDateRange(
        events,
        this.startOfDay(date),
        this.endOfDay(date)
      );

      const lastEvent = dayEvents
        .filter(e => e.end?.dateTime)
        .sort((a, b) => {
          const aEnd = new Date(a.end!.dateTime!);
          const bEnd = new Date(b.end!.dateTime!);
          return bEnd.getTime() - aEnd.getTime();
        })[0];

      if (lastEvent && lastEvent.end?.dateTime) {
        const endHour = getHours(new Date(lastEvent.end.dateTime));
        if (endHour > context.preferences.workingHours.end) {
          overtimeDays++;
        }
      }
    }

    if (overtimeDays >= 3) {
      return {
        type: 'scheduling_preference',
        pattern: `최근 7일 중 ${overtimeDays}일 초과 근무`,
        confidence: 0.85,
        frequency: overtimeDays,
        suggestion: '업무 시간 관리와 우선순위 조정이 필요할 수 있습니다'
      };
    }

    return null;
  }

  private analyzeFocusTimePattern(events: CalendarEvent[]): PatternInsight | null {
    const focusEvents = events.filter(e => this.isFocusTime(e));
    
    if (focusEvents.length < 3) {
      return {
        type: 'scheduling_preference',
        pattern: '집중 시간이 부족합니다',
        confidence: 0.8,
        frequency: focusEvents.length,
        suggestion: '하루 2-3시간의 집중 시간 블록을 캘린더에 추가해보세요'
      };
    }

    return null;
  }

  private async analyzeCollaborationPattern(
    events: CalendarEvent[]
  ): Promise<PatternInsight | null> {
    const attendeeStats = await this.getTopAttendees(events, 5);
    
    if (attendeeStats.length > 0 && attendeeStats[0].totalHours > 10) {
      return {
        type: 'collaboration_pattern',
        pattern: `${attendeeStats[0].name}와(과) 가장 많은 시간 협업`,
        confidence: 0.9,
        frequency: attendeeStats[0].meetingCount,
        suggestion: '정기 미팅을 고려해보세요',
        data: {
          topCollaborator: attendeeStats[0]
        }
      };
    }

    return null;
  }

  private startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
}

export default AnalyticsService;