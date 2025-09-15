'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * 개발 환경에서 Error Boundary 테스트를 위한 컴포넌트
 * 프로덕션에서는 렌더링되지 않음
 */
export function ErrorTestButton() {
  const [shouldThrow, setShouldThrow] = useState(false);

  // 프로덕션에서는 렌더링하지 않음
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  // 에러 발생
  if (shouldThrow) {
    throw new Error('Test Error: Error Boundary가 정상적으로 작동합니다!');
  }

  const triggerError = () => {
    setShouldThrow(true);
  };

  const triggerAsyncError = () => {
    setTimeout(() => {
      throw new Error('Async Error: 비동기 에러 테스트');
    }, 1000);
  };

  const triggerPromiseRejection = () => {
    Promise.reject(new Error('Promise Rejection: 처리되지 않은 Promise 거부'));
  };

  return (
    <div 
      className="fixed bottom-4 right-4 z-50"
      style={{ display: process.env.NODE_ENV === 'development' ? 'block' : 'none' }}
    >
      <details className="bg-red-500/10 backdrop-blur-xl border border-red-500/30 rounded-lg p-4 max-w-xs">
        <summary className="cursor-pointer text-red-400 font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Error Boundary 테스트 (개발용)
        </summary>
        
        <div className="mt-4 space-y-2">
          <button
            onClick={triggerError}
            className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm rounded border border-red-500/30 transition-colors"
          >
            동기 에러 발생
          </button>
          
          <button
            onClick={triggerAsyncError}
            className="w-full px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-sm rounded border border-orange-500/30 transition-colors"
          >
            비동기 에러 발생 (1초 후)
          </button>
          
          <button
            onClick={triggerPromiseRejection}
            className="w-full px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm rounded border border-yellow-500/30 transition-colors"
          >
            Promise Rejection 발생
          </button>
          
          <p className="text-xs text-gray-400 mt-2">
            Error Boundary 작동을 테스트합니다.
            에러 발생 시 fallback UI가 표시됩니다.
          </p>
        </div>
      </details>
    </div>
  );
}