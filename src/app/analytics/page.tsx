'use client';

import React, { useEffect, useState } from 'react';
import { useCalendarStore } from '@/store/calendarStore';
import { useAuthStore } from '@/store/authStore';
import { AnalyticsService } from '@/services/analytics';
import TimeStatisticsCard from '@/components/analytics/TimeStatisticsCard';
import ProductivityChart from '@/components/analytics/ProductivityChart';
import CategoryPieChart from '@/components/analytics/CategoryPieChart';
import HeatmapCalendar from '@/components/analytics/HeatmapCalendar';
import InsightsList from '@/components/analytics/InsightsList';
import { CalendarDays, Download, RefreshCw } from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';

export default function AnalyticsPage() {
  const { events } = useCalendarStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter'>('week');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [events, period]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const service = new AnalyticsService();
      const now = new Date();
      
      let startDate, endDate;
      switch (period) {
        case 'week':
          startDate = startOfWeek(now, { weekStartsOn: 1 });
          endDate = endOfWeek(now, { weekStartsOn: 1 });
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'quarter':
          startDate = subDays(now, 90);
          endDate = now;
          break;
      }

      const context = {
        userId: user?.id || 'default',
        currentTime: now,
        timeZone: 'Asia/Seoul',
        preferences: {
          workingHours: { start: 9, end: 18 },
          briefingTime: '08:30',
          language: 'ko' as const,
          defaultDuration: 60,
          reminderMinutes: 15
        },
        recentEvents: events.slice(0, 10),
        patterns: {
          frequentLocations: [],
          commonMeetingTimes: [],
          regularAttendees: [],
          preferredDurations: new Map(),
          eventTypePatterns: new Map()
        }
      };

      const [statistics, metrics, categories, heatmap, insights] = await Promise.all([
        service.getTimeStatistics(events, startDate, endDate, context),
        service.getProductivityMetrics(events, context),
        service.getCategoryBreakdown(events, startDate, endDate),
        service.getHeatmapData(events, 4),
        service.generateInsights(events, context)
      ]);

      setAnalytics({
        statistics,
        metrics,
        categories,
        heatmap,
        insights
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // CSV 또는 PDF로 리포트 내보내기
    console.log('Exporting analytics report...');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CalendarDays className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">분석할 데이터가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">분석 대시보드</h1>
          <p className="text-gray-600">일정 데이터를 기반으로 한 생산성 분석</p>
        </div>

        {/* 컨트롤 바 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setPeriod('week')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === 'week'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                주간
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                월간
              </button>
              <button
                onClick={() => setPeriod('quarter')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === 'quarter'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                분기
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={loadAnalytics}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                새로고침
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                내보내기
              </button>
            </div>
          </div>
        </div>

        {/* 시간 통계 */}
        <div className="mb-6">
          <TimeStatisticsCard statistics={analytics.statistics} />
        </div>

        {/* 차트 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ProductivityChart metrics={analytics.metrics} />
          <CategoryPieChart categories={analytics.categories} />
        </div>

        {/* 히트맵과 인사이트 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <HeatmapCalendar data={analytics.heatmap} />
          <InsightsList insights={analytics.insights} />
        </div>
      </div>
    </div>
  );
}