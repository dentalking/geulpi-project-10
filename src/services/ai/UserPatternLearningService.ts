/**
 * User Pattern Learning Service
 * 사용자 행동 패턴 학습 및 개인화된 제안 최적화
 */

import {
  UserInteraction,
  UserPatternData,
  SmartSuggestion,
  SuggestionType,
  TimeZoneActivity,
  BreakPattern
} from '@/types/suggestions';

export class UserPatternLearningService {
  private readonly STORAGE_KEY = 'user_pattern_data';
  private readonly MAX_INTERACTIONS = 100;
  private readonly PATTERN_CONFIDENCE_THRESHOLD = 0.7;

  /**
   * 사용자 상호작용 기록
   */
  recordInteraction(interaction: UserInteraction): void {
    const patterns = this.loadPatterns(interaction.suggestionId.split('-')[0]); // Extract userId

    // 상호작용 기록 추가
    patterns.lastInteractions.push(interaction);

    // 최대 개수 제한
    if (patterns.lastInteractions.length > this.MAX_INTERACTIONS) {
      patterns.lastInteractions = patterns.lastInteractions.slice(-this.MAX_INTERACTIONS);
    }

    // 패턴 업데이트
    this.updatePatterns(patterns, interaction);

    // 저장
    this.savePatterns(patterns);
  }

  /**
   * 패턴 기반 제안 조정
   */
  adjustSuggestionsBasedOnPatterns(
    suggestions: SmartSuggestion[],
    userId: string
  ): SmartSuggestion[] {
    const patterns = this.loadPatterns(userId);

    if (!patterns || patterns.lastInteractions.length < 10) {
      // 충분한 데이터가 없으면 원본 반환
      return suggestions;
    }

    return suggestions.map(suggestion => {
      const adjustedSuggestion = { ...suggestion };

      // 1. 수락률 기반 우선순위 조정
      const acceptanceRate = this.calculateAcceptanceRate(
        suggestion.type,
        patterns.lastInteractions
      );
      adjustedSuggestion.priority *= (1 + acceptanceRate);

      // 2. 시간대 선호도 반영
      const currentHour = new Date().getHours();
      const timePreference = this.getTimePreference(currentHour, patterns);
      adjustedSuggestion.priority *= timePreference;

      // 3. 반복 패턴 감지
      if (this.detectRepetitionPattern(suggestion.type, patterns)) {
        adjustedSuggestion.priority *= 1.5;
        adjustedSuggestion.reason = `${adjustedSuggestion.reason || ''} (자주 사용하시는 기능)`;
      }

      // 4. 컨텍스트 기반 신뢰도 추가
      adjustedSuggestion.confidence = this.calculateConfidence(
        suggestion,
        patterns
      );

      return adjustedSuggestion;
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * 사용자 패턴 분석
   */
  analyzeUserBehavior(userId: string): {
    insights: string[];
    recommendations: string[];
    patterns: UserPatternData;
  } {
    const patterns = this.loadPatterns(userId);
    const insights: string[] = [];
    const recommendations: string[] = [];

    // 가장 활발한 시간대 분석
    const mostActiveHour = patterns.mostActiveHours[0];
    if (mostActiveHour !== undefined) {
      insights.push(`가장 활발한 시간: ${mostActiveHour}시`);
      recommendations.push(`${mostActiveHour}시에 중요한 일정을 배치하면 좋습니다`);
    }

    // 선호 이벤트 타입
    if (patterns.preferredEventTypes.length > 0) {
      insights.push(`선호 일정 유형: ${patterns.preferredEventTypes.slice(0, 3).join(', ')}`);
    }

    // 휴식 패턴
    const mostFrequentBreak = patterns.breakPatterns
      .sort((a, b) => b.frequency - a.frequency)[0];
    if (mostFrequentBreak) {
      insights.push(`${mostFrequentBreak.timeOfDay}에 주로 휴식을 취하십니다`);
      recommendations.push(`${mostFrequentBreak.timeOfDay}에 ${mostFrequentBreak.averageDuration}분 휴식 시간 확보 권장`);
    }

    return { insights, recommendations, patterns };
  }

  /**
   * 패턴 업데이트
   */
  private updatePatterns(patterns: UserPatternData, interaction: UserInteraction): void {
    const hour = new Date(interaction.timestamp).getHours();

    // 활동 시간 업데이트
    if (!patterns.mostActiveHours.includes(hour)) {
      patterns.mostActiveHours.push(hour);
    }

    // 시간대별 활동 업데이트
    const timeOfDay = this.getTimeOfDay(hour);
    if (interaction.action === 'accepted') {
      this.updateTimeZoneActivity(patterns, timeOfDay, 0.1);
    }

    // 휴식 패턴 감지
    if (interaction.suggestionType === 'schedule_break' && interaction.action === 'accepted') {
      this.updateBreakPattern(patterns, timeOfDay);
    }
  }

  /**
   * 수락률 계산
   */
  private calculateAcceptanceRate(
    type: SuggestionType,
    interactions: UserInteraction[]
  ): number {
    const relevantInteractions = interactions.filter(i => i.suggestionType === type);
    if (relevantInteractions.length === 0) return 0.5; // 기본값

    const accepted = relevantInteractions.filter(i => i.action === 'accepted').length;
    return accepted / relevantInteractions.length;
  }

  /**
   * 시간 선호도 가져오기
   */
  private getTimePreference(hour: number, patterns: UserPatternData): number {
    const timeOfDay = this.getTimeOfDay(hour);
    const activity = patterns.workingHours;

    // 근무 시간 내외 가중치 적용
    if (activity) {
      const startHour = parseInt(activity.start.split(':')[0]);
      const endHour = parseInt(activity.end.split(':')[0]);

      if (hour >= startHour && hour <= endHour) {
        return 1.2; // 근무 시간 내 가중치
      }
    }

    // 시간대별 활동 지수 반환
    const activityMap: TimeZoneActivity = {
      morning: patterns.mostActiveHours.filter(h => h >= 6 && h < 12).length / 6,
      afternoon: patterns.mostActiveHours.filter(h => h >= 12 && h < 18).length / 6,
      evening: patterns.mostActiveHours.filter(h => h >= 18 && h < 22).length / 4,
      night: patterns.mostActiveHours.filter(h => h >= 22 || h < 6).length / 8
    };

    return activityMap[timeOfDay as keyof TimeZoneActivity] || 0.5;
  }

  /**
   * 반복 패턴 감지
   */
  private detectRepetitionPattern(
    type: SuggestionType,
    patterns: UserPatternData
  ): boolean {
    const recentInteractions = patterns.lastInteractions.slice(-20);
    const typeCount = recentInteractions.filter(
      i => i.suggestionType === type && i.action === 'accepted'
    ).length;

    return typeCount >= 5; // 최근 20개 중 5개 이상 수락
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(
    suggestion: SmartSuggestion,
    patterns: UserPatternData
  ): number {
    let confidence = 0.5; // 기본값

    // 과거 수락률 반영
    const acceptanceRate = this.calculateAcceptanceRate(
      suggestion.type,
      patterns.lastInteractions
    );
    confidence = confidence * 0.5 + acceptanceRate * 0.5;

    // 시간대 일치도 반영
    const currentHour = new Date().getHours();
    const timePreference = this.getTimePreference(currentHour, patterns);
    confidence = confidence * 0.7 + timePreference * 0.3;

    return Math.min(Math.max(confidence, 0), 1); // 0-1 범위로 제한
  }

  /**
   * 시간대 구분
   */
  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * 시간대별 활동 업데이트
   */
  private updateTimeZoneActivity(
    patterns: UserPatternData,
    timeOfDay: string,
    delta: number
  ): void {
    // This would need more sophisticated implementation
    // For now, just track in mostActiveHours
  }

  /**
   * 휴식 패턴 업데이트
   */
  private updateBreakPattern(patterns: UserPatternData, timeOfDay: string): void {
    const existing = patterns.breakPatterns.find(p => p.timeOfDay === timeOfDay);

    if (existing) {
      existing.frequency++;
    } else {
      patterns.breakPatterns.push({
        timeOfDay,
        frequency: 1,
        averageDuration: 15 // 기본값
      });
    }
  }

  /**
   * 패턴 데이터 로드
   */
  private loadPatterns(userId: string): UserPatternData {
    if (typeof window === 'undefined') {
      return this.getDefaultPatterns();
    }

    const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('[PatternLearning] Failed to parse stored patterns:', e);
      }
    }

    return this.getDefaultPatterns();
  }

  /**
   * 패턴 데이터 저장
   */
  private savePatterns(patterns: UserPatternData): void {
    if (typeof window === 'undefined') return;

    const userId = patterns.lastInteractions[0]?.suggestionId.split('-')[0] || 'unknown';
    localStorage.setItem(
      `${this.STORAGE_KEY}_${userId}`,
      JSON.stringify(patterns)
    );
  }

  /**
   * 기본 패턴 데이터
   */
  private getDefaultPatterns(): UserPatternData {
    return {
      mostActiveHours: [],
      preferredEventTypes: [],
      averageEventDuration: 60,
      frequentLocations: [],
      workingHours: { start: '09:00', end: '18:00' },
      breakPatterns: [],
      lastInteractions: []
    };
  }

  /**
   * 패턴 데이터 초기화
   */
  clearPatterns(userId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`${this.STORAGE_KEY}_${userId}`);
  }
}

// Singleton instance
let patternInstance: UserPatternLearningService | null = null;

export function getUserPatternService(): UserPatternLearningService {
  if (!patternInstance) {
    patternInstance = new UserPatternLearningService();
  }
  return patternInstance;
}