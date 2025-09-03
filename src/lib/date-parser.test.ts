import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseKoreanDateTime, parseTimeKeywords } from './date-parser';

describe('parseKoreanDateTime', () => {
  let mockDate: Date;

  beforeEach(() => {
    // 테스트용 고정 날짜 설정 (2025년 1월 1일 10시)
    mockDate = new Date('2025-01-01T10:00:00');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('시간 키워드 파싱', () => {
    it('저녁 7시를 19시로 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('저녁 7시');
      expect(result.time).toBe('19:00');
    });

    it('저녁 8시를 20시로 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('저녁 8시');
      expect(result.time).toBe('20:00');
    });

    it('아침 7시를 07시로 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('아침 7시');
      expect(result.time).toBe('07:00');
    });

    it('아침 8시를 08시로 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('아침 8시');
      expect(result.time).toBe('08:00');
    });

    it('점심만 있으면 12시로 파싱해야 함', () => {
      const result = parseKoreanDateTime('점심');
      expect(result.time).toBe('12:00');
    });

    it('오후 2시를 14시로 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('오후 2시');
      expect(result.time).toBe('14:00');
    });

    it('오전 10시를 10시로 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('오전 10시');
      expect(result.time).toBe('10:00');
    });

    it('새벽 3시를 03시로 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('새벽 3시');
      expect(result.time).toBe('03:00');
    });
  });

  describe('날짜 파싱', () => {
    it('오늘 날짜를 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('오늘 3시');
      expect(result.date).toBe('2025-01-01');
    });

    it('내일 날짜를 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('내일 3시');
      expect(result.date).toBe('2025-01-02');
    });

    it('모레 날짜를 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('모레 3시');
      expect(result.date).toBe('2025-01-03');
    });

    it('다음주 날짜를 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('다음주 3시');
      expect(result.date).toBe('2025-01-08');
    });
  });

  describe('복합 표현 파싱', () => {
    it('내일 저녁 7시를 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('내일 저녁 7시');
      expect(result.date).toBe('2025-01-02');
      expect(result.time).toBe('19:00');
    });

    it('오늘 저녁 7시 미팅을 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('오늘 저녁 7시 미팅');
      expect(result.date).toBe('2025-01-01');
      expect(result.time).toBe('19:00');
    });

    it('내일 아침 8시 30분을 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('내일 아침 8시 30분');
      expect(result.date).toBe('2025-01-02');
      expect(result.time).toBe('08:30');
    });

    it('모레 오후 3시반을 올바르게 파싱해야 함', () => {
      const result = parseKoreanDateTime('모레 오후 3시반');
      expect(result.date).toBe('2025-01-03');
      expect(result.time).toBe('15:30');
    });
  });

  describe('모호한 시간 처리', () => {
    it('단독 2시는 오후 2시(14시)로 파싱해야 함', () => {
      const result = parseKoreanDateTime('2시');
      expect(result.time).toBe('14:00');
    });

    it('단독 7시는 오후 7시(19시)로 파싱해야 함', () => {
      const result = parseKoreanDateTime('7시');
      expect(result.time).toBe('19:00');
    });

    it('단독 9시는 오전 9시로 파싱해야 함', () => {
      const result = parseKoreanDateTime('9시');
      expect(result.time).toBe('09:00');
    });
  });
});

describe('parseTimeKeywords', () => {
  it('저녁 7시를 19로 변환해야 함', () => {
    expect(parseTimeKeywords('저녁 7시')).toBe(19);
  });

  it('아침 8시를 8로 변환해야 함', () => {
    expect(parseTimeKeywords('아침 8시')).toBe(8);
  });

  it('오후 3시를 15로 변환해야 함', () => {
    expect(parseTimeKeywords('오후 3시')).toBe(15);
  });

  it('오전 11시를 11로 변환해야 함', () => {
    expect(parseTimeKeywords('오전 11시')).toBe(11);
  });
});