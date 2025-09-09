'use client';

import React from 'react';
import { PatternInsight } from '@/types';
import { Lightbulb, TrendingUp, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface InsightsListProps {
  insights: PatternInsight[];
}

const InsightsList: React.FC<InsightsListProps> = ({ insights }) => {
  const getInsightIcon = (type: PatternInsight['type']) => {
    switch (type) {
      case 'meeting_pattern':
        return Users;
      case 'scheduling_preference':
        return Clock;
      case 'collaboration_pattern':
        return TrendingUp;
      case 'duration_pattern':
        return Clock;
      case 'location_preference':
        return AlertCircle;
      case 'attendance_pattern':
        return Users;
      default:
        return Lightbulb;
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">AI 인사이트</h3>
        <div className="text-center py-8 text-gray-500">
          <Lightbulb className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>아직 분석할 충분한 데이터가 없습니다.</p>
          <p className="text-sm mt-1">더 많은 일정이 쌓이면 패턴을 분석해드릴게요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        AI 인사이트
      </h3>
      
      <div className="space-y-4">
        {(insights || []).map((insight, index) => {
          const Icon = getInsightIcon(insight.type);
          return (
            <div
              key={index}
              className="border-l-4 border-blue-500 pl-4 py-3 hover:bg-gray-50 rounded-r-lg transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{insight.pattern}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(insight.confidence)}`}>
                      {Math.round(insight.confidence * 100)}% 확신
                    </span>
                  </div>
                  
                  {insight.suggestion && (
                    <div className="flex items-start gap-2 mt-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                      <p className="text-sm text-gray-600">{insight.suggestion}</p>
                    </div>
                  )}
                  
                  {insight.frequency > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      빈도: {insight.frequency}회
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          더 많은 인사이트 보기 →
        </button>
      </div>
    </div>
  );
};

export default InsightsList;