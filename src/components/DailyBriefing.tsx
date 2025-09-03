'use client';

import { useState, useEffect } from 'react';

interface BriefingData {
  type: string;
  date: string;
  events: any[];
  briefing: string;
  suggestions: Array<{
    type: 'warning' | 'tip' | 'info';
    message: string;
  }>;
  stats: {
    totalEvents: number;
    totalHours: number;
    hasConflicts: boolean;
  };
}

export default function DailyBriefing() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [briefingType, setBriefingType] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [expanded, setExpanded] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadBriefing(briefingType);
    
    // 자동 새로고침 (30분마다)
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadBriefing(briefingType);
      }, 30 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [briefingType, autoRefresh]);

  useEffect(() => {
    // 아침 8시에 자동으로 오늘 브리핑 표시
    const now = new Date();
    const morning = new Date();
    morning.setHours(8, 0, 0, 0);
    
    if (now.getHours() >= 8 && now.getHours() < 9) {
      setExpanded(true);
      setBriefingType('today');
    }
  }, []);

  const loadBriefing = async (type: 'today' | 'tomorrow' | 'week') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/briefing/daily?type=${type}`);
      const data = await response.json();
      setBriefing(data);
    } catch (error) {
      console.error('Failed to load briefing:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '🌙 새벽입니다';
    if (hour < 12) return '☀️ 좋은 아침입니다';
    if (hour < 18) return '🌤️ 좋은 오후입니다';
    if (hour < 22) return '🌆 좋은 저녁입니다';
    return '🌙 늦은 밤입니다';
  };

  const getMotivationalQuote = () => {
    const quotes = [
      "오늘도 멋진 하루 되세요!",
      "한 걸음씩 나아가는 당신을 응원합니다.",
      "오늘의 작은 노력이 내일의 큰 성과가 됩니다.",
      "당신의 하루가 특별하기를 바랍니다.",
      "잘 정리된 일정이 성공적인 하루를 만듭니다."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  if (!expanded) {
    return (
      <div className="card" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        cursor: 'pointer',
        marginBottom: '20px'
      }} onClick={() => setExpanded(true)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🤖</span>
            <span style={{ fontWeight: 'bold' }}>AI 브리핑</span>
            {briefing && (
              <span style={{ fontSize: '14px', opacity: 0.9 }}>
                {briefingType === 'today' ? '오늘' : briefingType === 'tomorrow' ? '내일' : '이번 주'} 
                {' '}일정 {briefing.stats.totalEvents}개
              </span>
            )}
          </div>
          <span>▼</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      marginBottom: '20px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 5px 0', color: 'white' }}>
            {getGreeting()} 🤖
          </h2>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            {getMotivationalQuote()}
          </p>
        </div>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            padding: '5px 10px',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          최소화
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setBriefingType('today')}
          style={{
            padding: '8px 16px',
            background: briefingType === 'today' ? 'white' : 'rgba(255, 255, 255, 0.2)',
            color: briefingType === 'today' ? '#764ba2' : 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: briefingType === 'today' ? 'bold' : 'normal'
          }}
        >
          오늘
        </button>
        <button
          onClick={() => setBriefingType('tomorrow')}
          style={{
            padding: '8px 16px',
            background: briefingType === 'tomorrow' ? 'white' : 'rgba(255, 255, 255, 0.2)',
            color: briefingType === 'tomorrow' ? '#764ba2' : 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: briefingType === 'tomorrow' ? 'bold' : 'normal'
          }}
        >
          내일
        </button>
        <button
          onClick={() => setBriefingType('week')}
          style={{
            padding: '8px 16px',
            background: briefingType === 'week' ? 'white' : 'rgba(255, 255, 255, 0.2)',
            color: briefingType === 'week' ? '#764ba2' : 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: briefingType === 'week' ? 'bold' : 'normal'
          }}
        >
          이번 주
        </button>
        <div style={{ marginLeft: 'auto' }}>
          <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            자동 새로고침
          </label>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="loading" style={{ borderColor: 'rgba(255, 255, 255, 0.3)', borderTopColor: 'white' }}></div>
        </div>
      ) : briefing ? (
        <div>
          {briefing.stats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {briefing.stats.totalEvents}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>일정</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                  {Math.round(briefing.stats.totalHours)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>시간</div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '10px',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px' }}>
                  {briefing.stats.hasConflicts ? '⚠️' : '✅'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {briefing.stats.hasConflicts ? '주의 필요' : '문제 없음'}
                </div>
              </div>
            </div>
          )}

          {briefing.suggestions && briefing.suggestions.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: 'white', fontSize: '16px' }}>
                💡 스마트 제안
              </h4>
              {briefing.suggestions.map((suggestion, index) => (
                <div key={index} style={{
                  padding: '8px',
                  marginBottom: '5px',
                  background: suggestion.type === 'warning' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '5px',
                  fontSize: '14px'
                }}>
                  {suggestion.message}
                </div>
              ))}
            </div>
          )}

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            color: '#1e293b',
            padding: '20px',
            borderRadius: '8px',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
            fontSize: '14px'
          }}>
            {briefing.briefing}
          </div>

          <div style={{
            marginTop: '15px',
            paddingTop: '15px',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            fontSize: '12px',
            opacity: 0.8,
            textAlign: 'center'
          }}>
            마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          브리핑을 불러오는 중 오류가 발생했습니다.
        </div>
      )}
    </div>
  );
}
