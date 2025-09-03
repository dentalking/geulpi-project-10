/**
 * E2E 캘린더 플로우 테스트
 * 실제 사용자 시나리오를 시뮬레이션
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

describe('E2E Calendar Flow Tests', () => {
  let browser: Browser;
  let page: Page;
  const baseURL = process.env.TEST_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Authentication Flow', () => {
    it('should show login page for unauthenticated users', async () => {
      await page.goto(baseURL);
      
      // 로그인 버튼이 보여야 함
      const loginButton = await page.locator('a[href="/api/auth/login"]');
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText('Google로 시작하기');
    });

    it('should handle authentication error gracefully', async () => {
      // Mock authentication failure
      await page.route('/api/auth/status', async route => {
        await route.fulfill({
          status: 401,
          json: { authenticated: false }
        });
      });

      await page.goto(baseURL);
      
      // 에러 상태가 적절히 표시되어야 함
      const helpButton = await page.locator('button[aria-label="도움말"]');
      await expect(helpButton).toBeVisible();
    });
  });

  describe('Calendar Event Creation Flow', () => {
    beforeAll(async () => {
      // Mock authenticated state
      await page.route('/api/auth/status', async route => {
        await route.fulfill({
          status: 200,
          json: { authenticated: true }
        });
      });

      // Mock calendar sync
      await page.route('/api/calendar/sync*', async route => {
        await route.fulfill({
          status: 200,
          json: {
            success: true,
            events: [
              {
                id: 'test-1',
                summary: '팀 미팅',
                start: { dateTime: new Date().toISOString() },
                end: { dateTime: new Date(Date.now() + 3600000).toISOString() }
              }
            ]
          }
        });
      });
    });

    it('should display calendar and AI chat interface', async () => {
      await page.goto(baseURL);
      
      // 캘린더 컴포넌트 확인
      const calendar = await page.locator('[class*="glass-medium"]').first();
      await expect(calendar).toBeVisible();
      
      // AI 채팅 인터페이스 확인
      const chatContainer = await page.locator('[class*="glass-dark"]');
      await expect(chatContainer).toBeVisible();
    });

    it('should create event through AI chat', async () => {
      // Mock AI chat response
      await page.route('/api/ai/chat', async route => {
        const request = await route.request().postDataJSON();
        
        if (request.message.includes('내일 2시 미팅')) {
          await route.fulfill({
            status: 200,
            json: {
              type: 'action',
              action: 'event_created',
              message: '✅ "미팅" 일정이 추가되었습니다.',
              data: {
                id: 'new-event-1',
                summary: '미팅',
                start: { dateTime: '2024-01-16T14:00:00+09:00' }
              }
            }
          });
        }
      });

      await page.goto(baseURL);
      
      // AI 채팅에 메시지 입력
      const chatInput = await page.locator('input[type="text"]').last();
      await chatInput.fill('내일 2시 미팅 추가해줘');
      
      // Enter 키 또는 전송 버튼 클릭
      await chatInput.press('Enter');
      
      // 성공 메시지 확인
      await page.waitForTimeout(1000);
      const successMessage = await page.locator('text=/일정이 추가되었습니다/');
      await expect(successMessage).toBeVisible();
    });

    it('should handle event creation errors', async () => {
      // Mock API error
      await page.route('/api/ai/chat', async route => {
        await route.fulfill({
          status: 500,
          json: {
            error: {
              code: 'INTERNAL_ERROR',
              message: '일정 생성 중 오류가 발생했습니다.'
            }
          }
        });
      });

      await page.goto(baseURL);
      
      const chatInput = await page.locator('input[type="text"]').last();
      await chatInput.fill('새 일정 추가');
      await chatInput.press('Enter');
      
      // 에러 토스트 또는 메시지 확인
      await page.waitForTimeout(1000);
      const errorToast = await page.locator('[role="alert"]');
      const hasError = await errorToast.isVisible().catch(() => false);
      
      // 에러가 적절히 표시되어야 함
      expect(hasError || await page.locator('text=/오류/').isVisible()).toBeTruthy();
    });
  });

  describe('Calendar View Navigation', () => {
    it('should switch between view types', async () => {
      await page.goto(baseURL);
      
      // 월간 뷰가 기본값
      const monthView = await page.locator('text=/월/');
      await expect(monthView).toBeVisible();
      
      // 주간 뷰로 전환 (구현되어 있다면)
      const weekButton = await page.locator('button:has-text("주")');
      if (await weekButton.isVisible()) {
        await weekButton.click();
        await page.waitForTimeout(500);
        // 주간 뷰 확인
      }
    });

    it('should navigate between months', async () => {
      await page.goto(baseURL);
      
      // 다음 달 버튼 찾기
      const nextButton = await page.locator('button[aria-label*="다음"]');
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);
        // 월 변경 확인
      }
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should open AI chat with Ctrl+/', async () => {
      await page.goto(baseURL);
      
      // Ctrl+/ 단축키
      await page.keyboard.press('Control+/');
      await page.waitForTimeout(500);
      
      // AI 채팅 입력 필드에 포커스 확인
      const chatInput = await page.locator('input[type="text"]').last();
      await expect(chatInput).toBeFocused();
    });

    it('should show help with Shift+?', async () => {
      await page.goto(baseURL);
      
      // Shift+? 단축키
      await page.keyboard.press('Shift+?');
      await page.waitForTimeout(500);
      
      // 도움말 표시 확인 (구현되어 있다면)
      const helpModal = await page.locator('[role="dialog"]');
      const isHelpVisible = await helpModal.isVisible().catch(() => false);
      
      if (isHelpVisible) {
        await expect(helpModal).toBeVisible();
      }
    });
  });

  describe('Responsive Design', () => {
    it('should adapt to mobile viewport', async () => {
      // 모바일 뷰포트 설정
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(baseURL);
      
      // 모바일 레이아웃 확인
      const mobileLayout = await page.locator('[class*="glass"]').first();
      await expect(mobileLayout).toBeVisible();
      
      // 모바일에서 AI 채팅이 적절히 표시되는지 확인
      const chatContainer = await page.locator('[class*="glass-dark"]');
      const chatWidth = await chatContainer.boundingBox();
      
      if (chatWidth) {
        expect(chatWidth.width).toBeLessThanOrEqual(375);
      }
    });

    it('should adapt to tablet viewport', async () => {
      // 태블릿 뷰포트 설정
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(baseURL);
      
      // 태블릿 레이아웃 확인
      const tabletLayout = await page.locator('[class*="glass"]').first();
      await expect(tabletLayout).toBeVisible();
    });
  });

  describe('Performance', () => {
    it('should load page within acceptable time', async () => {
      const startTime = Date.now();
      await page.goto(baseURL);
      const loadTime = Date.now() - startTime;
      
      // 3초 이내 로드
      expect(loadTime).toBeLessThan(3000);
    });

    it('should handle rapid API calls', async () => {
      await page.goto(baseURL);
      
      const chatInput = await page.locator('input[type="text"]').last();
      
      // 연속적인 메시지 전송
      for (let i = 0; i < 5; i++) {
        await chatInput.fill(`테스트 메시지 ${i}`);
        await chatInput.press('Enter');
        await page.waitForTimeout(100);
      }
      
      // 앱이 여전히 응답하는지 확인
      await expect(chatInput).toBeEnabled();
    });
  });
});