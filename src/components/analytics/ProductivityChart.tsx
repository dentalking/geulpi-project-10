'use client';

import React from 'react';
import { ProductivityMetrics } from '@/services/analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProductivityChartProps {
  metrics: ProductivityMetrics;
}

const ProductivityChart: React.FC<ProductivityChartProps> = ({ metrics }) => {
  const scoreData = [
    { name: '생산성 점수', value: metrics.productivityScore, fullMark: 100 },
    { name: '회의 효율성', value: metrics.meetingEfficiency, fullMark: 100 },
    { name: '집중 시간 비율', value: metrics.focusTimeRatio * 100, fullMark: 100 },
    { name: '워라밸', value: metrics.workLifeBalance, fullMark: 100 }
  ];

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">생산성 지표</h3>
      
      {/* 점수 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {scoreData.map((item) => (
          <div key={item.name} className="text-center">
            <div className="text-sm text-gray-600 mb-1">{item.name}</div>
            <div className={`text-3xl font-bold ${getScoreColor(item.value)}`}>
              {Math.round(item.value)}
            </div>
            <div className="text-xs text-gray-500">/ 100</div>
          </div>
        ))}
      </div>

      {/* 트렌드 차트 */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">주간 트렌드</h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={metrics.trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              label={{ value: '시간', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
            />
            <Tooltip 
              formatter={(value: number) => `${value.toFixed(1)}시간`}
              contentStyle={{ 
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="작업 시간"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProductivityChart;