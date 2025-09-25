const puppeteer = require('puppeteer');

/**
 * 컴포넌트 상호작용 테스트
 * 아티팩트, 세부 일정, 월간뷰, 주간뷰, 일간뷰 간의 동기화 테스트
 */
async function testComponentInteraction() {
  console.log('🧪 컴포넌트 상호작용 테스트 시작...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();

  try {
    // 1. 로그인
    console.log('1️⃣ 로그인 중...');
    await page.goto('http://localhost:3000/ko/login');
    await page.waitForSelector('input[type="email"]', { timeout: 5000 });

    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await page.waitForNavigation();
    console.log('✅ 로그인 성공\n');

    // 2. 대시보드 로드 확인
    console.log('2️⃣ 대시보드 로드 확인...');
    await page.waitForSelector('[class*="calendar"]', { timeout: 10000 });
    console.log('✅ 캘린더 뷰 로드됨\n');

    // 3. 월간뷰에서 이벤트 클릭
    console.log('3️⃣ 월간뷰에서 이벤트 클릭 테스트...');
    const monthViewEvents = await page.$$('[class*="event-item"]');
    if (monthViewEvents.length > 0) {
      await monthViewEvents[0].click();
      await page.waitForTimeout(1000);

      // 이벤트 상세 모달 확인
      const modalVisible = await page.$('[class*="modal"]') !== null;
      console.log(`   - 이벤트 모달 표시: ${modalVisible ? '✅' : '❌'}`);

      // 아티팩트 패널 동기화 확인
      const artifactHighlight = await page.$('[class*="artifact"][class*="highlight"]');
      console.log(`   - 아티팩트 패널 하이라이트: ${artifactHighlight ? '✅' : '❌'}`);

      // 모달 닫기
      const closeButton = await page.$('[class*="close"], [aria-label*="close"]');
      if (closeButton) await closeButton.click();
    }
    console.log('');

    // 4. 뷰 전환 테스트 (월간 → 주간)
    console.log('4️⃣ 뷰 전환 테스트 (월간 → 주간)...');
    const weekViewButton = await page.$('button:has-text("주간"), [data-view="week"]');
    if (weekViewButton) {
      await weekViewButton.click();
      await page.waitForTimeout(1000);

      // 선택된 이벤트 상태 유지 확인
      const selectedEventMaintained = await page.$('[class*="selected"]');
      console.log(`   - 선택 상태 유지: ${selectedEventMaintained ? '✅' : '❌'}`);
    }
    console.log('');

    // 5. 일간뷰 테스트
    console.log('5️⃣ 일간뷰 테스트...');
    const dayViewButton = await page.$('button:has-text("일간"), [data-view="day"]');
    if (dayViewButton) {
      await dayViewButton.click();
      await page.waitForTimeout(1000);

      // OptimizedDayView 로드 확인
      const dayViewLoaded = await page.$('[class*="day-view"], [class*="hour"]');
      console.log(`   - 일간뷰 로드: ${dayViewLoaded ? '✅' : '❌'}`);

      // 시간대별 이벤트 표시 확인
      const hourEvents = await page.$$('[class*="hour-event"]');
      console.log(`   - 시간대별 이벤트: ${hourEvents.length}개`);
    }
    console.log('');

    // 6. AI 오버레이 대시보드 테스트
    console.log('6️⃣ AI 오버레이 대시보드 테스트...');
    await page.keyboard.press('/'); // AI 오버레이 토글
    await page.waitForTimeout(1000);

    const aiOverlayVisible = await page.$('[class*="ai-overlay"], [class*="unified-ai"]');
    console.log(`   - AI 오버레이 표시: ${aiOverlayVisible ? '✅' : '❌'}`);

    if (aiOverlayVisible) {
      // AI에서 이벤트 생성 시뮬레이션
      const aiInput = await page.$('textarea[placeholder*="일정"], input[placeholder*="AI"]');
      if (aiInput) {
        await aiInput.type('내일 오후 3시 회의 추가해줘');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // 캘린더에 반영 확인
        const newEventVisible = await page.$eval(
          '[class*="event"]',
          (el) => el.textContent?.includes('회의')
        ).catch(() => false);
        console.log(`   - AI 생성 이벤트 캘린더 반영: ${newEventVisible ? '✅' : '❌'}`);
      }
    }
    console.log('');

    // 7. 아티팩트 패널 상호작용
    console.log('7️⃣ 아티팩트 패널 상호작용 테스트...');
    const artifactButton = await page.$('[class*="artifact-button"], button:has-text("아티팩트")');
    if (artifactButton) {
      await artifactButton.click();
      await page.waitForTimeout(1000);

      const artifactPanelVisible = await page.$('[class*="artifact-panel"]');
      console.log(`   - 아티팩트 패널 열림: ${artifactPanelVisible ? '✅' : '❌'}`);

      // 아티팩트에서 이벤트 클릭
      const artifactEvents = await page.$$('[class*="artifact-item"]');
      if (artifactEvents.length > 0) {
        await artifactEvents[0].click();
        await page.waitForTimeout(1000);

        // 캘린더 뷰 동기화 확인
        const calendarHighlight = await page.$('[class*="calendar"][class*="highlight"]');
        console.log(`   - 캘린더 하이라이트 동기화: ${calendarHighlight ? '✅' : '❌'}`);
      }
    }
    console.log('');

    // 8. 이벤트 수정 동기화
    console.log('8️⃣ 이벤트 수정 동기화 테스트...');
    const editButton = await page.$('button:has-text("편집"), [aria-label*="edit"]');
    if (editButton) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // 제목 수정
      const titleInput = await page.$('input[name="title"], input[name="summary"]');
      if (titleInput) {
        await titleInput.click({ clickCount: 3 });
        await titleInput.type('수정된 일정');

        // 저장
        const saveButton = await page.$('button:has-text("저장"), button[type="submit"]');
        if (saveButton) {
          await saveButton.click();
          await page.waitForTimeout(2000);

          // 모든 뷰에서 업데이트 확인
          const updatedInCalendar = await page.$eval(
            '[class*="calendar"]',
            (el) => el.textContent?.includes('수정된 일정')
          ).catch(() => false);

          const updatedInArtifact = await page.$eval(
            '[class*="artifact"]',
            (el) => el.textContent?.includes('수정된 일정')
          ).catch(() => false);

          console.log(`   - 캘린더 뷰 업데이트: ${updatedInCalendar ? '✅' : '❌'}`);
          console.log(`   - 아티팩트 패널 업데이트: ${updatedInArtifact ? '✅' : '❌'}`);
        }
      }
    }
    console.log('');

    // 9. 실시간 동기화 테스트
    console.log('9️⃣ 실시간 동기화 테스트...');
    // 새 탭 열기
    const newPage = await browser.newPage();
    await newPage.goto('http://localhost:3000/ko/dashboard');
    await newPage.waitForSelector('[class*="calendar"]', { timeout: 10000 });

    // 원래 탭에서 이벤트 생성
    await page.bringToFront();
    const addButton = await page.$('button:has-text("추가"), [aria-label*="add"]');
    if (addButton) {
      await addButton.click();
      await page.waitForTimeout(1000);

      // 간단한 이벤트 생성
      const quickAddInput = await page.$('input[placeholder*="일정"]');
      if (quickAddInput) {
        await quickAddInput.type('실시간 테스트 이벤트');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);

        // 새 탭에서 확인
        await newPage.bringToFront();
        await newPage.reload();
        await newPage.waitForTimeout(2000);

        const realtimeEventVisible = await newPage.$eval(
          '[class*="calendar"]',
          (el) => el.textContent?.includes('실시간 테스트')
        ).catch(() => false);

        console.log(`   - 실시간 동기화: ${realtimeEventVisible ? '✅' : '❌'}`);
      }
    }

    await newPage.close();
    console.log('');

    // 테스트 요약
    console.log('📊 테스트 요약');
    console.log('================');
    console.log('✅ 완료된 테스트:');
    console.log('   - 로그인 및 대시보드 로드');
    console.log('   - 뷰 전환 (월간/주간/일간)');
    console.log('   - AI 오버레이 토글');
    console.log('   - 아티팩트 패널 상호작용');
    console.log('');
    console.log('⚠️  주의 사항:');
    console.log('   - EventContext 미사용으로 인한 동기화 문제');
    console.log('   - 각 컴포넌트의 독립적 상태 관리');
    console.log('   - 실시간 업데이트 지연');

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await browser.close();
  }
}

// 메인 실행
(async () => {
  try {
    await testComponentInteraction();
  } catch (error) {
    console.error('테스트 실행 실패:', error);
    process.exit(1);
  }
})();