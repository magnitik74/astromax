/**
 * Empirical Challenger Stress Test Suite for AstroMAX Teasers & Onboarding
 * Adversarial validation of:
 * - Suite 1: Rapid clicking of «Далее →», «← Назад», and «Пропустить»
 * - Suite 2: Boundary swipes & gesture disambiguation
 * - Suite 3: skipToDataEntry() from all 4 screens (1, 2, 3, 4) with 0 remaining active rAF loops
 * - Suite 4: Complete advance to personal data entry and mentor selection
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const publicDir = path.join(__dirname, '..', 'public');
const PORT = 4355;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(publicDir, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  fs.createReadStream(filePath).pipe(res);
});

async function runChallenges() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`[Challenger] Test server listening on http://localhost:${PORT}`);

  let browser;
  let testCount = 0;
  let passCount = 0;
  let failCount = 0;
  const failureLog = [];

  function assertCondition(desc, passed, detail = '') {
    testCount++;
    if (passed) {
      passCount++;
      console.log(`  ✅ [PASS] ${desc} ${detail ? `(${detail})` : ''}`);
    } else {
      failCount++;
      const err = `❌ [FAIL] ${desc} ${detail ? `(${detail})` : ''}`;
      console.error(`  ${err}`);
      failureLog.push(err);
    }
  }

  try {
    browser = await puppeteer.launch({
      executablePath: edgePath,
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--window-size=400,900'
      ]
    });

    const page = await browser.newPage();

    // Hook requestAnimationFrame to track exact active animation loops
    await page.evaluateOnNewDocument(() => {
      window.__activeRafMap = new Map();
      window.__rafCounter = 0;
      const _origRaf = window.requestAnimationFrame;
      const _origCancel = window.cancelAnimationFrame;

      window.requestAnimationFrame = function(cb) {
        const reqId = ++window.__rafCounter;
        const sysId = _origRaf.call(window, (timestamp) => {
          window.__activeRafMap.delete(reqId);
          cb(timestamp);
        });
        window.__activeRafMap.set(reqId, { sysId });
        return sysId;
      };

      window.cancelAnimationFrame = function(sysId) {
        for (const [reqId, data] of window.__activeRafMap.entries()) {
          if (data.sysId === sysId) {
            window.__activeRafMap.delete(reqId);
          }
        }
        return _origCancel.call(window, sysId);
      };

      window.getActiveRafCount = function() {
        return window.__activeRafMap.size;
      };
    });

    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Catch page errors
    const pageErrors = [];
    page.on('pageerror', err => {
      pageErrors.push(err.message);
      console.error('  [PageError Event]:', err.message);
    });

    // Helper to reload clean onboarding state
    async function resetOnboarding() {
      await page.goto(`http://localhost:${PORT}/index.html?reset=1`, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#onboardingModal', { visible: true, timeout: 5000 });
      await new Promise(r => setTimeout(r, 600));
    }

    // Helper to query active DOM state
    async function getOnboardingState() {
      return await page.evaluate(() => {
        const wrap = document.getElementById('obTeasersWrap');
        const skipBtn = document.getElementById('obSkipBtn');
        const indicator = document.getElementById('onboardingStepIndicator');
        const visibleTeasers = [1, 2, 3, 4].filter(i => {
          const el = document.getElementById(`obTeaser${i}`);
          return el && window.getComputedStyle(el).display !== 'none';
        });
        const visibleSteps = ['obStep1', 'obStep2', 'obStep3', 'obStep4', 'obStepLoading'].filter(id => {
          const el = document.getElementById(id);
          return el && window.getComputedStyle(el).display !== 'none';
        });
        const activeRafCount = typeof window.getActiveRafCount === 'function' ? window.getActiveRafCount() : -1;

        return {
          teasersWrapVisible: wrap && window.getComputedStyle(wrap).display !== 'none',
          skipBtnVisible: skipBtn && window.getComputedStyle(skipBtn).display !== 'none',
          indicatorText: indicator ? indicator.textContent.trim() : '',
          visibleTeasers,
          visibleSteps,
          activeRafCount
        };
      });
    }

    // Helper to dispatch swipe touch events
    async function dispatchSwipe(diffX, diffY) {
      return await page.evaluate(({ dx, dy }) => {
        const wrap = document.getElementById('obTeasersWrap');
        if (!wrap) return false;
        const rect = wrap.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        const endX = startX + dx;
        const endY = startY + dy;

        const touchStart = new Touch({
          identifier: Date.now(),
          target: wrap,
          clientX: startX,
          clientY: startY
        });
        const touchEnd = new Touch({
          identifier: Date.now(),
          target: wrap,
          clientX: endX,
          clientY: endY
        });

        const startEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touchStart],
          targetTouches: [touchStart],
          changedTouches: [touchStart]
        });
        const endEvent = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touchEnd]
        });

        wrap.dispatchEvent(startEvent);
        wrap.dispatchEvent(endEvent);
        return true;
      }, { dx: diffX, dy: diffY });
    }

    console.log('\n=============================================================');
    console.log('CHALLENGE SUITE 1: RAPID CLICKING & CONCURRENCY STRESS TESTS');
    console.log('=============================================================');

    // --- Scenario 1.1: Rapid Forward Clicking (1 -> 2 -> 3 -> 4) ---
    console.log('\n[Scenario 1.1] Rapid Forward Clicking 1 -> 2 -> 3 -> 4 (25ms intervals)...');
    await resetOnboarding();
    await page.evaluate(async () => {
      // Rapid sequential clicks
      window.showTeaserStep(2);
      await new Promise(r => setTimeout(r, 25));
      window.showTeaserStep(3);
      await new Promise(r => setTimeout(r, 25));
      window.showTeaserStep(4);
    });
    // Wait for animations to settle
    await new Promise(r => setTimeout(r, 400));
    const s11 = await getOnboardingState();
    assertCondition('Rapid forward clicks land on Screen 4', s11.visibleTeasers.length === 1 && s11.visibleTeasers[0] === 4, `visible: ${s11.visibleTeasers}`);
    assertCondition('Step indicator displays "4/4"', s11.indicatorText === '4/4', `indicator: "${s11.indicatorText}"`);
    assertCondition('Active rAF count after landing on Screen 4 is exactly 1', s11.activeRafCount === 1, `activeRafs: ${s11.activeRafCount}`);

    // --- Scenario 1.2: Rapid Forward-Backward Oscillation ---
    console.log('\n[Scenario 1.2] Rapid Forward-Backward Oscillation (1 -> 2 -> 1 -> 3 -> 2 -> 4 -> 3)...');
    await resetOnboarding();
    await page.evaluate(async () => {
      const sequence = [2, 1, 3, 2, 4, 3];
      for (const step of sequence) {
        window.showTeaserStep(step);
        await new Promise(r => setTimeout(r, 20));
      }
    });
    await new Promise(r => setTimeout(r, 400));
    const s12 = await getOnboardingState();
    assertCondition('Rapid oscillation lands cleanly on Screen 3', s12.visibleTeasers.length === 1 && s12.visibleTeasers[0] === 3, `visible: ${s12.visibleTeasers}`);
    assertCondition('Step indicator displays "3/4"', s12.indicatorText === '3/4', `indicator: "${s12.indicatorText}"`);
    assertCondition('Active rAF count after oscillation settles is exactly 1', s12.activeRafCount === 1, `activeRafs: ${s12.activeRafCount}`);

    // --- Scenario 1.3: Immediate Skip After Next (<15ms) ---
    console.log('\n[Scenario 1.3] Immediate Skip after Next click (<15ms delay)...');
    await resetOnboarding();
    await page.evaluate(async () => {
      window.showTeaserStep(2);
      await new Promise(r => setTimeout(r, 10));
      window.skipToDataEntry();
    });
    await new Promise(r => setTimeout(r, 300));
    const s13 = await getOnboardingState();
    assertCondition('Immediate skip reveals #obStep1', s13.visibleSteps.includes('obStep1'), `visibleSteps: ${s13.visibleSteps}`);
    assertCondition('#obTeasersWrap is hidden', !s13.teasersWrapVisible, `teasersWrapVisible: ${s13.teasersWrapVisible}`);
    assertCondition('#obSkipBtn is hidden', !s13.skipBtnVisible, `skipBtnVisible: ${s13.skipBtnVisible}`);
    assertCondition('Active rAF count is EXACTLY 0 after skip', s13.activeRafCount === 0, `activeRafs: ${s13.activeRafCount}`);

    // --- Scenario 1.4: Skip Button Spam (10 Consecutive Invocations) ---
    console.log('\n[Scenario 1.4] Spam clicking «Пропустить» 10 times consecutively...');
    await resetOnboarding();
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        window.skipToDataEntry();
      }
    });
    await new Promise(r => setTimeout(r, 200));
    const s14 = await getOnboardingState();
    assertCondition('Spam skip keeps #obStep1 cleanly visible', s14.visibleSteps.includes('obStep1') && s14.visibleSteps.length === 1, `visibleSteps: ${s14.visibleSteps}`);
    assertCondition('Spam skip results in EXACTLY 0 active rAF loops', s14.activeRafCount === 0, `activeRafs: ${s14.activeRafCount}`);
    assertCondition('Zero page errors during skip spam', pageErrors.length === 0, `errors: ${pageErrors.length}`);

    console.log('\n=============================================================');
    console.log('CHALLENGE SUITE 2: BOUNDARY SWIPES & TOUCH GESTURES');
    console.log('=============================================================');

    // --- Scenario 2.1: Boundary Swipe on Screen 1: Swiping Right ---
    console.log('\n[Scenario 2.1] Boundary Swipe on Screen 1 (Swiping Right dx = +120)...');
    await resetOnboarding();
    let s21_before = await getOnboardingState();
    assertCondition('Starts on Screen 1', s21_before.visibleTeasers.includes(1), `initial: ${s21_before.visibleTeasers}`);
    await dispatchSwipe(+120, 0);
    await new Promise(r => setTimeout(r, 300));
    let s21_after = await getOnboardingState();
    assertCondition('Screen 1 remains active after boundary swipe right', s21_after.visibleTeasers.includes(1) && s21_after.visibleTeasers.length === 1, `visible: ${s21_after.visibleTeasers}`);
    assertCondition('Indicator remains "1/4"', s21_after.indicatorText === '1/4', `indicator: "${s21_after.indicatorText}"`);

    // --- Scenario 2.2: Sequential Left Swipes (1 -> 2 -> 3 -> 4) ---
    console.log('\n[Scenario 2.2] Sequential Left Swipes: 1 -> 2 -> 3 -> 4 (dx = -100)...');
    await dispatchSwipe(-100, 0);
    await new Promise(r => setTimeout(r, 300));
    let s22_s2 = await getOnboardingState();
    assertCondition('Swipe left on Screen 1 moves to Screen 2', s22_s2.visibleTeasers.includes(2), `step 2 visible: ${s22_s2.visibleTeasers}`);

    await dispatchSwipe(-100, 0);
    await new Promise(r => setTimeout(r, 300));
    let s22_s3 = await getOnboardingState();
    assertCondition('Swipe left on Screen 2 moves to Screen 3', s22_s3.visibleTeasers.includes(3), `step 3 visible: ${s22_s3.visibleTeasers}`);

    await dispatchSwipe(-100, 0);
    await new Promise(r => setTimeout(r, 300));
    let s22_s4 = await getOnboardingState();
    assertCondition('Swipe left on Screen 3 moves to Screen 4', s22_s4.visibleTeasers.includes(4), `step 4 visible: ${s22_s4.visibleTeasers}`);

    // --- Scenario 2.3: Boundary Swipe on Screen 4: Swiping Left ---
    console.log('\n[Scenario 2.3] Boundary Swipe on Screen 4: Swiping Left (dx = -120)...');
    // On Screen 4, swiping left is designed to advance to Step 1
    await dispatchSwipe(-120, 0);
    await new Promise(r => setTimeout(r, 400));
    let s23 = await getOnboardingState();
    assertCondition('Swipe left on Screen 4 advances to Personal Data Entry (#obStep1)', s23.visibleSteps.includes('obStep1'), `visibleSteps: ${s23.visibleSteps}`);
    assertCondition('Teasers wrap is hidden after Screen 4 swipe left', !s23.teasersWrapVisible, `teasersWrapVisible: ${s23.teasersWrapVisible}`);
    assertCondition('All rAF loops stopped (count === 0)', s23.activeRafCount === 0, `activeRafs: ${s23.activeRafCount}`);

    // --- Scenario 2.4: Sequential Right Swipes (4 -> 3 -> 2 -> 1) ---
    console.log('\n[Scenario 2.4] Sequential Right Swipes (4 -> 3 -> 2 -> 1)...');
    await resetOnboarding();
    await page.evaluate(() => window.showTeaserStep(4));
    await new Promise(r => setTimeout(r, 300));

    await dispatchSwipe(+100, 0);
    await new Promise(r => setTimeout(r, 300));
    let s24_s3 = await getOnboardingState();
    assertCondition('Swipe right on Screen 4 returns to Screen 3', s24_s3.visibleTeasers.includes(3), `step: ${s24_s3.visibleTeasers}`);

    await dispatchSwipe(+100, 0);
    await new Promise(r => setTimeout(r, 300));
    let s24_s2 = await getOnboardingState();
    assertCondition('Swipe right on Screen 3 returns to Screen 2', s24_s2.visibleTeasers.includes(2), `step: ${s24_s2.visibleTeasers}`);

    await dispatchSwipe(+100, 0);
    await new Promise(r => setTimeout(r, 300));
    let s24_s1 = await getOnboardingState();
    assertCondition('Swipe right on Screen 2 returns to Screen 1', s24_s1.visibleTeasers.includes(1), `step: ${s24_s1.visibleTeasers}`);

    // --- Scenario 2.5: Sub-threshold & Ambiguous Swipes ---
    console.log('\n[Scenario 2.5] Gesture Disambiguation (micro-swipes and vertical scrolls)...');
    // Micro-swipe dx = -30 (threshold is 45)
    await dispatchSwipe(-30, 0);
    await new Promise(r => setTimeout(r, 200));
    let s25_micro = await getOnboardingState();
    assertCondition('Micro-swipe (dx = -30 < 45) is ignored; stays on Screen 1', s25_micro.visibleTeasers.includes(1), `step: ${s25_micro.visibleTeasers}`);

    // Vertical gesture dx = -60, dy = 100 (vertical movement dominates: |dy|*1.2 = 120 > 60)
    await dispatchSwipe(-60, 100);
    await new Promise(r => setTimeout(r, 200));
    let s25_vert = await getOnboardingState();
    assertCondition('Vertical scroll gesture (dx = -60, dy = 100) is ignored; stays on Screen 1', s25_vert.visibleTeasers.includes(1), `step: ${s25_vert.visibleTeasers}`);

    console.log('\n=============================================================');
    console.log('CHALLENGE SUITE 3: skipToDataEntry() FROM EACH OF THE 4 SCREENS');
    console.log('=============================================================');

    for (let screenNum = 1; screenNum <= 4; screenNum++) {
      console.log(`\n[Scenario 3.${screenNum}] Calling skipToDataEntry() directly from Screen ${screenNum}...`);
      await resetOnboarding();
      if (screenNum > 1) {
        await page.evaluate((n) => window.showTeaserStep(n), screenNum);
        await new Promise(r => setTimeout(r, 300));
      }

      const preState = await getOnboardingState();
      assertCondition(`Confirmed on Screen ${screenNum} before skip`, preState.visibleTeasers.includes(screenNum), `visible: ${preState.visibleTeasers}`);

      // Call skipToDataEntry()
      await page.evaluate(() => window.skipToDataEntry());
      await new Promise(r => setTimeout(r, 300));

      const postState = await getOnboardingState();
      assertCondition(`[Screen ${screenNum} -> Skip] #obStep1 is displayed`, postState.visibleSteps.includes('obStep1'), `visibleSteps: ${postState.visibleSteps}`);
      assertCondition(`[Screen ${screenNum} -> Skip] #obTeasersWrap is hidden`, !postState.teasersWrapVisible, `teasersWrapVisible: ${postState.teasersWrapVisible}`);
      assertCondition(`[Screen ${screenNum} -> Skip] #obSkipBtn is hidden`, !postState.skipBtnVisible, `skipBtnVisible: ${postState.skipBtnVisible}`);
      assertCondition(`[Screen ${screenNum} -> Skip] Indicator updated to "Шаг 1 из 4"`, postState.indicatorText === 'Шаг 1 из 4', `indicator: "${postState.indicatorText}"`);
      assertCondition(`[Screen ${screenNum} -> Skip] Active rAF loop count is EXACTLY 0`, postState.activeRafCount === 0, `activeRafs: ${postState.activeRafCount}`);
    }

    console.log('\n=============================================================');
    console.log('CHALLENGE SUITE 4: ONBOARDING DATA ENTRY & MENTOR SELECTION FLOW');
    console.log('=============================================================');

    console.log('\n[Scenario 4.1] Step 1 -> Step 2 (Name validation & advance)...');
    await resetOnboarding();
    await page.evaluate(() => window.skipToDataEntry());
    await new Promise(r => setTimeout(r, 200));

    // Fill Name
    await page.type('#obInputName', 'Екатерина');
    await page.evaluate(() => {
      // Find button in #obStep1 to advance
      const s1 = document.getElementById('obStep1');
      const btn = s1.querySelector('button.btn-max-primary');
      if (btn) btn.click();
      else window.nextOnboardingStep(2);
    });
    await new Promise(r => setTimeout(r, 300));

    let s41 = await getOnboardingState();
    assertCondition('Step 1 advances cleanly to Step 2', s41.visibleSteps.includes('obStep2'), `visibleSteps: ${s41.visibleSteps}`);
    assertCondition('Indicator shows "Шаг 2 из 4"', s41.indicatorText === 'Шаг 2 из 4', `indicator: "${s41.indicatorText}"`);

    console.log('\n[Scenario 4.2] Step 2 -> Step 3 (Date & Time)...');
    await page.evaluate(() => {
      document.getElementById('obInputDate').value = '1996-03-21';
      document.getElementById('obInputTime').value = '09:15';
      const s2 = document.getElementById('obStep2');
      const btn = s2.querySelector('button.btn-max-primary');
      if (btn) btn.click();
      else window.nextOnboardingStep(3);
    });
    await new Promise(r => setTimeout(r, 300));

    let s42 = await getOnboardingState();
    assertCondition('Step 2 advances cleanly to Step 3', s42.visibleSteps.includes('obStep3'), `visibleSteps: ${s42.visibleSteps}`);
    assertCondition('Indicator shows "Шаг 3 из 4"', s42.indicatorText === 'Шаг 3 из 4', `indicator: "${s42.indicatorText}"`);

    console.log('\n[Scenario 4.3] Step 3 -> Step 4 (City selection & Mentor choice)...');
    await page.evaluate(() => {
      document.getElementById('obInputCity').value = 'Санкт-Петербург';
      const s3 = document.getElementById('obStep3');
      const btn = s3.querySelector('button.btn-max-primary');
      if (btn) btn.click();
      else window.nextOnboardingStep(4);
    });
    await new Promise(r => setTimeout(r, 300));

    let s43 = await getOnboardingState();
    assertCondition('Step 3 advances cleanly to Step 4', s43.visibleSteps.includes('obStep4'), `visibleSteps: ${s43.visibleSteps}`);
    assertCondition('Indicator shows "Шаг 4 из 4"', s43.indicatorText === 'Шаг 4 из 4', `indicator: "${s43.indicatorText}"`);

    // Verify 4 mentor cards exist in Step 4
    const mentorInfo = await page.evaluate(() => {
      const list = document.getElementById('onboardingPersonaList');
      if (!list) return { count: 0, names: [] };
      const cards = Array.from(list.querySelectorAll('.persona-card, .mentor-card, [onclick*="selectPersona"]'));
      return {
        count: cards.length,
        names: cards.map(c => c.innerText.split('\n')[0].trim())
      };
    });
    assertCondition('4 Mentor cards rendered in Step 4', mentorInfo.count === 4, `count: ${mentorInfo.count}`);

    console.log('\n[Scenario 4.4] Select Mentor & Finish Onboarding...');
    await page.evaluate(() => {
      // Select 3rd mentor (Селеста)
      const list = document.getElementById('onboardingPersonaList');
      const cards = list.querySelectorAll('.persona-card, [onclick*="selectPersona"]');
      if (cards[2]) cards[2].click();
      // Click finish button
      const s4 = document.getElementById('obStep4');
      const finishBtn = s4.querySelector('button.btn-max-primary');
      if (finishBtn) finishBtn.click();
      else if (typeof window.finishOnboarding === 'function') window.finishOnboarding();
    });
    await new Promise(r => setTimeout(r, 500));

    let s44 = await getOnboardingState();
    assertCondition('finishOnboarding advances to #obStepLoading', s44.visibleSteps.includes('obStepLoading'), `visibleSteps: ${s44.visibleSteps}`);
    assertCondition('rAF loops remain 0 during calculation', s44.activeRafCount === 0, `activeRafs: ${s44.activeRafCount}`);

    console.log('\n=============================================================');
    console.log('CHALLENGE SUMMARY REPORT');
    console.log('=============================================================');
    console.log(`Total Assertions Run: ${testCount}`);
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);
    console.log(`Uncaught Page Errors: ${pageErrors.length}`);

    await browser.close();
    server.close();

    if (failCount > 0) {
      console.error('\n❌ EMPIRICAL CHALLENGE FAILED! Failures:');
      failureLog.forEach(f => console.error('  ', f));
      process.exit(1);
    } else {
      console.log('\n🏆 ALL ADVERSARIAL STRESS CHALLENGES PASSED EMPIRICALLY WITH 100% SUCCESS!');
      process.exit(0);
    }

  } catch (err) {
    console.error('Fatal challenge execution error:', err);
    if (browser) await browser.close();
    server.close();
    process.exit(1);
  }
}

runChallenges();
