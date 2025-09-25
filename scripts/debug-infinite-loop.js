#!/usr/bin/env node

/**
 * React 무한 루프 디버깅 스크립트
 * 이 스크립트는 클라이언트 측에서 실행되어 React 컴포넌트의 무한 루프를 감지합니다.
 */

console.log(`
🔍 React 무한 루프 디버깅 스크립트

브라우저 콘솔에서 다음 코드를 실행하세요:

//==== React Hook 무한 루프 감지기 ====//

(function() {
  let renderCount = {};
  let maxRenderThreshold = 50;
  let componentStack = new Map();

  // React DevTools가 있는지 확인
  if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined') {
    console.log('✅ React DevTools 감지됨');

    const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;

    // 기존 onCommitFiberRoot 저장
    const originalOnCommitFiberRoot = hook.onCommitFiberRoot;

    hook.onCommitFiberRoot = function(id, root, priorityLevel) {
      try {
        // Fiber 트리 순회하여 과도한 렌더링 감지
        function traverseFiber(fiber, depth = 0) {
          if (!fiber) return;

          const componentName = fiber.type?.name || fiber.type?.displayName || 'Unknown';
          const key = \`\${componentName}_\${fiber.key || ''}\`;

          // 렌더링 횟수 추적
          renderCount[key] = (renderCount[key] || 0) + 1;

          // 임계값 초과 시 경고
          if (renderCount[key] > maxRenderThreshold) {
            console.error(\`🚨 무한 루프 감지: \${componentName}\`, {
              renders: renderCount[key],
              fiber: fiber,
              props: fiber.memoizedProps,
              state: fiber.memoizedState,
              hooks: fiber.hooks
            });

            // 스택 트레이스 출력
            console.trace('Component render stack');
          }

          // 자식 Fiber 순회
          traverseFiber(fiber.child, depth + 1);
          traverseFiber(fiber.sibling, depth);
        }

        traverseFiber(root.current);

        // 원래 함수 호출
        if (originalOnCommitFiberRoot) {
          originalOnCommitFiberRoot.apply(this, arguments);
        }
      } catch (error) {
        console.error('디버깅 중 오류:', error);
      }
    };

    console.log('✅ React 무한 루프 감지기 설치 완료');
  } else {
    console.warn('⚠️ React DevTools를 먼저 설치해주세요');
  }

  // useState/useEffect Hook 무한 루프 감지
  const originalUseState = React.useState;
  const originalUseEffect = React.useEffect;

  let stateUpdateCount = {};
  let effectCallCount = {};

  // useState 오버라이드
  React.useState = function(initialState) {
    const result = originalUseState.call(this, initialState);
    const [state, setState] = result;

    const wrappedSetState = function(...args) {
      const stackTrace = new Error().stack;
      const caller = stackTrace.split('\\n')[2];

      stateUpdateCount[caller] = (stateUpdateCount[caller] || 0) + 1;

      if (stateUpdateCount[caller] > 100) {
        console.error('🚨 useState 무한 업데이트 감지:', {
          caller,
          count: stateUpdateCount[caller],
          args,
          stack: stackTrace
        });
      }

      return setState.apply(this, args);
    };

    return [state, wrappedSetState];
  };

  // useEffect 오버라이드
  React.useEffect = function(effect, deps) {
    const stackTrace = new Error().stack;
    const caller = stackTrace.split('\\n')[2];

    effectCallCount[caller] = (effectCallCount[caller] || 0) + 1;

    if (effectCallCount[caller] > 50) {
      console.error('🚨 useEffect 무한 호출 감지:', {
        caller,
        count: effectCallCount[caller],
        deps,
        stack: stackTrace
      });
    }

    return originalUseEffect.call(this, effect, deps);
  };

  // 네트워크 요청 무한 루프 감지
  const originalFetch = window.fetch;
  let fetchCount = {};

  window.fetch = function(url, options) {
    fetchCount[url] = (fetchCount[url] || 0) + 1;

    if (fetchCount[url] > 20) {
      console.error('🚨 무한 네트워크 요청 감지:', {
        url,
        count: fetchCount[url],
        stack: new Error().stack
      });
    }

    return originalFetch.apply(this, arguments);
  };

  // 주기적으로 통계 출력
  setInterval(() => {
    console.group('📊 렌더링 통계');

    const topRenders = Object.entries(renderCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (topRenders.length > 0) {
      console.table(topRenders.reduce((acc, [component, count]) => {
        acc[component] = { renders: count };
        return acc;
      }, {}));
    }

    const topFetches = Object.entries(fetchCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    if (topFetches.length > 0) {
      console.log('🌐 상위 네트워크 요청:');
      console.table(topFetches.reduce((acc, [url, count]) => {
        acc[url] = { count };
        return acc;
      }, {}));
    }

    console.groupEnd();
  }, 5000);

  console.log('✅ React Hook 무한 루프 감지기 설치 완료');

  // 렌더링 카운트 초기화 함수
  window.clearRenderCount = function() {
    renderCount = {};
    stateUpdateCount = {};
    effectCallCount = {};
    fetchCount = {};
    console.log('✅ 렌더링 카운트 초기화됨');
  };

})();

//==== 사용 방법 ====//
// 1. 위 코드를 브라우저 콘솔에 복사-붙여넣기
// 2. 페이지에서 무한 루프가 발생하는 동작 수행
// 3. 콘솔에서 경고 메시지 확인
// 4. window.clearRenderCount()로 카운트 초기화 가능

`);