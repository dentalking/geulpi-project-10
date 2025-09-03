'use client';

import React from 'react';
import { HeatmapData } from '@/services/analytics';

interface HeatmapCalendarProps {
  data: HeatmapData[];
}

const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({ data }) => {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getIntensityColor = (value: number): string => {
    if (value === 0) return 'bg-gray-100';
    if (value < 30) return 'bg-blue-200';
    if (value < 60) return 'bg-blue-400';
    if (value < 120) return 'bg-blue-600';
    return 'bg-blue-800';
  };

  const getValue = (day: number, hour: number): number => {
    const item = data.find(d => d.day === day && d.hour === hour);
    return item?.value || 0;
  };

  const formatHour = (hour: number): string => {
    return hour.toString().padStart(2, '0');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">주간 활동 히트맵</h3>
      
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* 시간 헤더 */}
          <div className="flex mb-2">
            <div className="w-12"></div>
            {hours.map(hour => (
              <div 
                key={hour} 
                className="flex-1 text-xs text-center text-gray-600"
              >
                {hour % 3 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* 히트맵 그리드 */}
          {days.map((day, dayIndex) => (
            <div key={day} className="flex mb-1">
              <div className="w-12 text-sm text-gray-700 flex items-center">
                {day}
              </div>
              {hours.map(hour => {
                const value = getValue(dayIndex, hour);
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={`flex-1 h-6 mx-px rounded ${getIntensityColor(value)} hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer group relative`}
                    title={`${day} ${formatHour(hour)}:00 - ${value}분`}
                  >
                    {/* 툴팁 */}
                    <div className="hidden group-hover:block absolute z-10 -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {value > 0 ? `${value}분` : '비어있음'}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-xs text-gray-600">적음</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <div className="w-4 h-4 bg-blue-200 rounded"></div>
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <div className="w-4 h-4 bg-blue-800 rounded"></div>
        </div>
        <span className="text-xs text-gray-600">많음</span>
      </div>
    </div>
  );
};

export default HeatmapCalendar;