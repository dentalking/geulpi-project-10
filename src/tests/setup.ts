import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// jest-dom matchers 확장
expect.extend(matchers);

// 각 테스트 후 정리
afterEach(() => {
  cleanup();
});

// 환경 변수 모킹
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

// Next.js 라우터 모킹
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// fetch 모킹
global.fetch = vi.fn();

// console 메서드 모킹 (테스트 출력 정리)
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = vi.fn();
  console.warn = vi.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});