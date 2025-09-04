import React from 'react';

interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 32, 
  color = '#000',
  className = '' 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 메인 사각형 (캘린더 추상화) */}
      <rect x="50" y="50" width="100" height="100" fill="none" stroke={color} strokeWidth="3" rx="8"/>
      
      {/* 상단 바 */}
      <rect x="50" y="50" width="100" height="25" fill={color} rx="8"/>
      
      {/* AI 방사형 라인 */}
      <g stroke={color} strokeLinecap="round">
        <line x1="100" y1="112" x2="100" y2="85" strokeWidth="4" opacity="0.85"/>
        <line x1="100" y1="112" x2="100" y2="139" strokeWidth="4" opacity="0.85"/>
        <line x1="100" y1="112" x2="73" y2="112" strokeWidth="4" opacity="0.85"/>
        <line x1="100" y1="112" x2="127" y2="112" strokeWidth="4" opacity="0.85"/>
        <line x1="100" y1="112" x2="80" y2="92" strokeWidth="4" opacity="0.85"/>
        <line x1="100" y1="112" x2="120" y2="92" strokeWidth="4" opacity="0.85"/>
        <line x1="100" y1="112" x2="80" y2="132" strokeWidth="4" opacity="0.85"/>
        <line x1="100" y1="112" x2="120" y2="132" strokeWidth="4" opacity="0.85"/>
      </g>
      
      {/* AI 인디케이터 (중앙 점) */}
      <circle cx="100" cy="112" r="8" fill={color}/>
      
      {/* 선택적 그리드 */}
      <g opacity="0.3">
        <line x1="50" y1="112" x2="150" y2="112" stroke={color} strokeWidth="2"/>
        <line x1="100" y1="75" x2="100" y2="150" stroke={color} strokeWidth="2"/>
      </g>
    </svg>
  );
};

export default Logo;