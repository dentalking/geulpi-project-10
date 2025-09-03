'use client';

import React from 'react';
import { CategoryBreakdown } from '@/services/analytics';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CategoryPieChartProps {
  categories: CategoryBreakdown[];
}

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ categories }) => {
  const formatLabel = (entry: CategoryBreakdown) => {
    return `${entry.category} (${entry.percentage.toFixed(1)}%)`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload as CategoryBreakdown;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-sm">{data.category}</p>
          <p className="text-xs text-gray-600">{data.hours.toFixed(1)} 시간</p>
          <p className="text-xs text-gray-600">{data.count}개 일정</p>
          <p className="text-xs text-gray-600">{data.percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">카테고리별 시간 분포</h3>
      
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={categories}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="hours"
            label={(props: any) => {
              const entry = categories.find(c => c.hours === props.value);
              return entry ? formatLabel(entry) : '';
            }}
          >
            {categories.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {categories.map((category) => (
          <div key={category.category} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-sm text-gray-700">
              {category.category}: {category.hours.toFixed(1)}시간
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryPieChart;