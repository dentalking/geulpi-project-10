import { SimpleSuggestionService, SimpleSuggestionContext, SimpleSuggestion } from './SimpleSuggestionService';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface UserPreferences {
  preferredCategory?: string;
  preferredTimeOfDay?: string;
  mostClickedSuggestions?: string[];
  avgResponseTimeMs?: number;
  clickPatterns?: {
    [key: string]: number; // suggestion text -> click count
  };
}

interface PersonalizationScore {
  baseScore: number;
  personalScore: number;
  contextScore: number;
  noveltyScore: number;
  totalScore: number;
}

export class PersonalizedSuggestionService extends SimpleSuggestionService {
  private userId?: string;
  private userPreferences?: UserPreferences;
  private recentSuggestions: Set<string> = new Set();

  constructor(locale: 'ko' | 'en', userId?: string) {
    super(locale);
    this.userId = userId;
  }

  /**
   * 개인화된 제안 생성
   */
  async generatePersonalizedSuggestions(context: SimpleSuggestionContext): Promise<SimpleSuggestion[]> {
    // 1. 사용자 선호도 로드
    if (this.userId) {
      await this.loadUserPreferences();
    }

    // 2. 기본 제안 생성
    const baseSuggestions = this.generateSuggestions(context);

    // 3. 개인화 점수 계산 및 정렬
    const scoredSuggestions = baseSuggestions.map(suggestion => ({
      ...suggestion,
      score: this.calculatePersonalizationScore(suggestion, context)
    }));

    // 4. 점수 기준 정렬
    scoredSuggestions.sort((a, b) => b.score.totalScore - a.score.totalScore);

    // 5. 다양성 확보를 위한 조정
    const finalSuggestions = this.ensureDiversity(scoredSuggestions);

    // 6. 최근 제안 기록 업데이트
    finalSuggestions.forEach(s => this.recentSuggestions.add(s.text));

    // 오래된 제안 제거 (최대 20개 유지)
    if (this.recentSuggestions.size > 20) {
      const entries = Array.from(this.recentSuggestions);
      entries.slice(0, entries.length - 20).forEach(s => this.recentSuggestions.delete(s));
    }

    logger.info('[Personalized Suggestions] Generated', {
      userId: this.userId,
      count: finalSuggestions.length,
      hasPreferences: !!this.userPreferences
    });

    return finalSuggestions;
  }

  /**
   * 사용자 선호도 로드
   */
  private async loadUserPreferences(): Promise<void> {
    if (!this.userId) return;

    try {
      // 메모리 캐시 확인
      if (global.personalizedSuggestionUserPrefs?.[this.userId]) {
        const cached = global.personalizedSuggestionUserPrefs[this.userId];
        const cacheAge = Date.now() - cached.lastUpdated.getTime();

        // 5분 이내 캐시는 재사용
        if (cacheAge < 5 * 60 * 1000) {
          this.userPreferences = cached;
          return;
        }
      }

      // DB에서 선호도 조회
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: preferences } = await supabase
        .rpc('get_user_preferences', { p_user_id: this.userId });

      if (preferences && preferences.length > 0) {
        const pref = preferences[0];

        // 최근 30일 클릭 패턴 분석
        const { data: clickData } = await supabase
          .from('user_action_logs')
          .select('suggestion_text, action_type')
          .eq('user_id', this.userId)
          .eq('action_type', 'clicked')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100);

        const clickPatterns: { [key: string]: number } = {};
        clickData?.forEach(log => {
          clickPatterns[log.suggestion_text] = (clickPatterns[log.suggestion_text] || 0) + 1;
        });

        this.userPreferences = {
          preferredCategory: pref.preferred_category,
          preferredTimeOfDay: pref.preferred_time_of_day,
          mostClickedSuggestions: pref.most_clicked_suggestions,
          avgResponseTimeMs: pref.avg_response_time_ms,
          clickPatterns
        };

        // 캐시 업데이트
        global.personalizedSuggestionUserPrefs = global.personalizedSuggestionUserPrefs || {};
        global.personalizedSuggestionUserPrefs[this.userId] = {
          ...this.userPreferences,
          lastUpdated: new Date()
        };
      }
    } catch (error) {
      logger.error('Failed to load user preferences', { error, userId: this.userId });
      // 에러 시에도 기본 제안은 제공
    }
  }

  /**
   * 개인화 점수 계산
   */
  private calculatePersonalizationScore(
    suggestion: SimpleSuggestion,
    context: SimpleSuggestionContext
  ): PersonalizationScore {
    const scores: PersonalizationScore = {
      baseScore: suggestion.priority,
      personalScore: 0,
      contextScore: 0,
      noveltyScore: 0,
      totalScore: 0
    };

    if (!this.userPreferences) {
      scores.totalScore = scores.baseScore;
      return scores;
    }

    // 1. 개인화 점수 (0-10)
    // 선호 카테고리 매칭
    if (suggestion.category === this.userPreferences.preferredCategory) {
      scores.personalScore += 3;
    }

    // 자주 클릭한 제안과 유사성
    const clickedCount = this.userPreferences.clickPatterns?.[suggestion.text] || 0;
    scores.personalScore += Math.min(clickedCount * 0.5, 4); // 최대 4점

    // 선호 시간대 매칭
    if (context.timeOfDay === this.userPreferences.preferredTimeOfDay) {
      scores.personalScore += 1;
    }

    // 과거 클릭한 제안과의 유사도
    const similarityScore = this.calculateSimilarityScore(
      suggestion.text,
      this.userPreferences.mostClickedSuggestions || []
    );
    scores.personalScore += Math.min(similarityScore * 2, 2); // 최대 2점

    // 2. 컨텍스트 점수 (0-10)
    // 현재 이벤트 수에 따른 적절성
    const eventCount = context.currentEvents?.length || 0;
    if (eventCount === 0 && suggestion.category === 'create') {
      scores.contextScore += 5;
    } else if (eventCount > 5 && suggestion.category === 'action') {
      scores.contextScore += 5;
    } else if (eventCount > 0 && eventCount <= 5) {
      scores.contextScore += 3;
    }

    // Follow-up 상황에서의 적절성
    if (context.isFollowUp && suggestion.category === 'action') {
      scores.contextScore += 3;
    }

    // 3. 새로움 점수 (0-10)
    // 최근에 보지 않은 제안일수록 높은 점수
    if (!this.recentSuggestions.has(suggestion.text)) {
      scores.noveltyScore = 10;
    } else {
      scores.noveltyScore = 5; // 반복 제안은 낮은 점수
    }

    // 총 점수 계산 (가중치 적용)
    scores.totalScore =
      scores.baseScore * 0.25 +
      scores.personalScore * 0.35 +
      scores.contextScore * 0.25 +
      scores.noveltyScore * 0.15;

    return scores;
  }

  /**
   * 텍스트 유사도 계산 (간단한 버전)
   */
  private calculateSimilarityScore(text: string, compareTexts: string[]): number {
    if (compareTexts.length === 0) return 0;

    const words = text.toLowerCase().split(/\s+/);
    let maxSimilarity = 0;

    for (const compareText of compareTexts) {
      const compareWords = compareText.toLowerCase().split(/\s+/);
      const commonWords = words.filter(w => compareWords.includes(w));
      const similarity = commonWords.length / Math.max(words.length, compareWords.length);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * 다양성 확보
   */
  private ensureDiversity(suggestions: Array<SimpleSuggestion & { score: PersonalizationScore }>): SimpleSuggestion[] {
    const result: SimpleSuggestion[] = [];
    const usedCategories = new Set<string>();
    const categoryLimits: { [key: string]: number } = {
      'create': 2,
      'view': 1,
      'action': 2,
      'organize': 1
    };
    const categoryCounts: { [key: string]: number } = {};

    for (const suggestion of suggestions) {
      const category = suggestion.category || 'other';
      const currentCount = categoryCounts[category] || 0;
      const limit = categoryLimits[category] || 1;

      // 카테고리 제한 확인
      if (currentCount >= limit) continue;

      result.push({
        text: suggestion.text,
        priority: Math.round(suggestion.score.totalScore),
        category: suggestion.category
      });

      categoryCounts[category] = currentCount + 1;
      usedCategories.add(category);

      // 최대 5개 제안
      if (result.length >= 5) break;
    }

    // 5개 미만인 경우 추가 제안
    if (result.length < 5) {
      for (const suggestion of suggestions) {
        if (result.findIndex(r => r.text === suggestion.text) === -1) {
          result.push({
            text: suggestion.text,
            priority: Math.round(suggestion.score.totalScore),
            category: suggestion.category
          });
          if (result.length >= 5) break;
        }
      }
    }

    return result;
  }
}

// 전역 타입 선언 확장
declare global {
  var personalizedSuggestionUserPrefs: Record<string, UserPreferences & { lastUpdated: Date }>;
}