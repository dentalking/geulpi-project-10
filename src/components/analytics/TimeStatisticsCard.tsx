'use client';

import React from 'react';
import { TimeStatistics } from '@/services/analytics';
import { Clock, Users, Target, Coffee, TrendingUp } from 'lucide-react';

interface TimeStatisticsCardProps {
  statistics: TimeStatistics;
}

const TimeStatisticsCard: React.FC<TimeStatisticsCardProps> = ({ statistics }) => {
  const formatHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  };

  const stats = [
    {
      label: '총 시간',
      value: formatHours(statistics.totalHours),
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: '회의 시간',
      value: formatHours(statistics.meetingHours),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: '집중 시간',
      value: formatHours(statistics.focusHours),
      icon: Target,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      label: '휴식 시간',
      value: formatHours(statistics.breakHours),
      icon: Coffee,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      label: '초과 근무',
      value: formatHours(statistics.overtimeHours),
      icon: TrendingUp,
      color: statistics.overtimeHours > 0 ? 'text-red-600' : 'text-gray-600',
      bgColor: statistics.overtimeHours > 0 ? 'bg-red-100' : 'bg-gray-100'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TimeStatisticsCard;