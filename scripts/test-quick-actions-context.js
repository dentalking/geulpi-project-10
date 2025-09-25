const puppeteer = require('puppeteer');

async function testQuickActionsContext() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
  });
  const page = await browser.newPage();

  try {
    console.log('🚀 Starting Quick Actions context test...');

    // Navigate to dashboard
    await page.goto('http://localhost:3000/ko/dashboard', { waitUntil: 'networkidle0' });
    await page.waitForTimeout(3000);

    console.log('📝 Testing conversation context suggestions...');

    // Open chat interface
    const chatButton = await page.$('button[aria-label*="AI"]');
    if (chatButton) {
      await chatButton.click();
      await page.waitForTimeout(2000);
    }

    // Test 1: Initial suggestions
    console.log('1️⃣ Checking initial Quick Actions...');
    const initialSuggestions = await page.$$eval('.quick-action-button', buttons =>
      buttons.map(btn => btn.textContent)
    );
    console.log('Initial suggestions:', initialSuggestions);

    // Test 2: Send a message about exercise
    console.log('2️⃣ Sending exercise-related message...');
    await page.type('textarea', '오늘 운동 스케줄 어떻게 짜면 좋을까?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000); // Wait for AI response

    // Check if Quick Actions updated
    const exerciseSuggestions = await page.$$eval('.quick-action-button', buttons =>
      buttons.map(btn => btn.textContent)
    );
    console.log('After exercise query:', exerciseSuggestions);

    // Test 3: Send a message about meetings
    console.log('3️⃣ Sending meeting-related message...');
    await page.type('textarea', '내일 회의 준비를 위해 뭘 해야 할까?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    const meetingSuggestions = await page.$$eval('.quick-action-button', buttons =>
      buttons.map(btn => btn.textContent)
    );
    console.log('After meeting query:', meetingSuggestions);

    // Test 4: Click a Quick Action
    console.log('4️⃣ Testing Quick Action click...');
    const quickActionButtons = await page.$$('.quick-action-button');
    if (quickActionButtons.length > 0) {
      await quickActionButtons[0].click();
      await page.waitForTimeout(1000);

      // Check if input field was populated
      const inputValue = await page.$eval('textarea', el => el.value);
      console.log('Input populated with:', inputValue);

      // Check for highlight effect
      const inputBg = await page.$eval('textarea', el =>
        window.getComputedStyle(el).backgroundColor
      );
      console.log('Input highlight:', inputBg);
    }

    // Test 5: Verify suggestions persist after sending
    console.log('5️⃣ Testing persistence after message...');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    const persistedSuggestions = await page.$$eval('.quick-action-button', buttons =>
      buttons.map(btn => btn.textContent)
    );
    console.log('Suggestions after send:', persistedSuggestions);

    console.log('✅ Quick Actions context test completed!');

    // Summary
    console.log('\n📊 Test Summary:');
    console.log('- Initial suggestions count:', initialSuggestions.length);
    console.log('- Exercise context suggestions:', exerciseSuggestions.length);
    console.log('- Meeting context suggestions:', meetingSuggestions.length);
    console.log('- Persisted suggestions:', persistedSuggestions.length);

    // Check for errors in console
    const errors = await page.evaluate(() => {
      const logs = [];
      const originalError = console.error;
      console.error = (...args) => {
        logs.push(args.join(' '));
        originalError.apply(console, args);
      };
      return logs;
    });

    if (errors.length > 0) {
      console.log('⚠️ Console errors detected:', errors);
    } else {
      console.log('✅ No console errors!');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await page.waitForTimeout(5000); // Keep open for manual verification
    await browser.close();
  }
}

testQuickActionsContext().catch(console.error);