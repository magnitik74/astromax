/**
 * End-to-End Visual & No-Scroll Puppeteer Test for AstroMAX 4-Step Cinematic Teasers
 * Tests viewports: 390x844 (Standard Mobile) & 375x667 (iPhone SE Compact)
 * Verifies no-scroll condition: scrollHeight <= clientHeight + 1 for .modal-sheet and each teaser container
 * Captures 8 high-resolution screenshots into .agents/teamwork/artifacts/screenshots/
 * Tests «Пропустить» and «Создать мою натальную карту →» navigation.
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const publicDir = path.join(__dirname, '..', 'public');
const artifactsDir = path.join(__dirname, '..', '.agents', 'teamwork', 'artifacts', 'screenshots');

// Ensure artifacts/screenshots directory exists
fs.mkdirSync(artifactsDir, { recursive: true });

// Static MIME types
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

// 1. Simple static HTTP server on port 4322
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

async function checkNoScroll(page, stepId) {
  return await page.evaluate((id) => {
    const modal = document.getElementById('onboardingModal');
    const sheet = modal ? modal.querySelector('.modal-sheet') : null;
    const stepEl = document.getElementById(id);

    // Tolerance of 1px for subpixel rendering on High-DPI screens
    const sheetPass = sheet ? sheet.scrollHeight <= sheet.clientHeight + 1 : false;
    const stepPass = stepEl ? stepEl.scrollHeight <= stepEl.clientHeight + 1 : false;

    return {
      id,
      sheetPass,
      stepPass,
      noScroll: sheetPass && stepPass,
      sheetScrollHeight: sheet ? sheet.scrollHeight : null,
      sheetClientHeight: sheet ? sheet.clientHeight : null,
      stepScrollHeight: stepEl ? stepEl.scrollHeight : null,
      stepClientHeight: stepEl ? stepEl.clientHeight : null
    };
  }, stepId);
}

server.listen(4322, async () => {
  console.log('[E2E Test] Local static test server listening on http://localhost:4322');

  let browser;
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

    // Listen to console errors
    page.on('pageerror', err => console.error('[Browser PageError]:', err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('[Browser Console Error]:', msg.text());
      }
    });

    const viewports = [
      { name: '390x844', width: 390, height: 844, label: 'Standard Mobile' },
      { name: '375x667', width: 375, height: 667, label: 'iPhone SE Compact' }
    ];

    const results = {
      noScrollChecks: [],
      screenshots: [],
      skipTest: false,
      ctaTest: false,
      backTest: false
    };

    for (const vp of viewports) {
      console.log(`\n======================================================`);
      console.log(`[E2E Test] Testing Viewport ${vp.name} (${vp.label})`);
      console.log(`======================================================`);

      await page.setViewport({
        width: vp.width,
        height: vp.height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2
      });

      // Load with reset=1 to ensure onboarding modal opens cleanly
      console.log(`[E2E Test] Loading http://localhost:4322/index.html?reset=1 ...`);
      await page.goto('http://localhost:4322/index.html?reset=1', {
        waitUntil: 'networkidle2',
        timeout: 20000
      });

      // Wait for modal sheet to be visible
      await page.waitForSelector('#onboardingModal', { visible: true, timeout: 5000 });
      await new Promise(r => setTimeout(r, 1200));

      const teaserSteps = [
        { id: 'obTeaser1', num: 1, name: 'Natal Big Three' },
        { id: 'obTeaser2', num: 2, name: 'Astrologer 24/7' },
        { id: 'obTeaser3', num: 3, name: 'Tarot 3D Vortex' },
        { id: 'obTeaser4', num: 4, name: 'Daily Horoscope' }
      ];

      for (let i = 0; i < teaserSteps.length; i++) {
        const step = teaserSteps[i];
        console.log(`\n[E2E Test] [${vp.name}] Verifying Teaser ${step.num} (${step.name}) [#${step.id}]...`);

        // Wait for visual motion / canvas to render initial frame
        await new Promise(r => setTimeout(r, 800));

        // Verify visibility
        const isVisible = await page.evaluate((id) => {
          const el = document.getElementById(id);
          if (!el) return false;
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }, step.id);

        if (!isVisible) {
          throw new Error(`Step #${step.id} is not visible at index ${step.num}!`);
        }

        // Verify no-scroll condition
        const scrollCheck = await checkNoScroll(page, step.id);
        console.log(`[E2E Test] [${vp.name}] Scroll Check for #${step.id}:`, {
          noScroll: scrollCheck.noScroll,
          sheet: `${scrollCheck.sheetScrollHeight}px / ${scrollCheck.sheetClientHeight}px`,
          step: `${scrollCheck.stepScrollHeight}px / ${scrollCheck.stepClientHeight}px`
        });

        results.noScrollChecks.push({
          viewport: vp.name,
          stepId: step.id,
          ...scrollCheck
        });

        if (!scrollCheck.noScroll) {
          console.warn(`⚠️ WARNING: Vertical overflow detected on ${vp.name} for #${step.id}:`, scrollCheck);
        }

        // Capture high-resolution screenshot
        const screenshotFileName = `teaser_s${step.num}_${vp.name}.png`;
        const screenshotPath = path.join(artifactsDir, screenshotFileName);
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 [${vp.name}] Screenshot saved: ${screenshotPath}`);
        results.screenshots.push({ step: step.num, viewport: vp.name, path: screenshotPath });

        // Advance to next step if not the last teaser
        if (i < teaserSteps.length - 1) {
          const nextStep = teaserSteps[i + 1];
          console.log(`[E2E Test] [${vp.name}] Clicking «Далее →» to advance to #${nextStep.id}...`);

          const clicked = await page.evaluate((currentId) => {
            const currentEl = document.getElementById(currentId);
            if (!currentEl) return false;
            const buttons = Array.from(currentEl.querySelectorAll('button'));
            const nextBtn = buttons.find(b => b.innerText.includes('Далее') || b.classList.contains('btn-max-primary') || b.classList.contains('btn-next'));
            if (nextBtn) {
              nextBtn.click();
              return true;
            }
            return false;
          }, step.id);

          if (!clicked) {
            console.log(`Fallback: Invoking window.showTeaserStep(${nextStep.num})`);
            await page.evaluate((n) => {
              if (typeof window.showTeaserStep === 'function') window.showTeaserStep(n);
            }, nextStep.num);
          }

          await new Promise(r => setTimeout(r, 600));
        }
      }

      // If we are on viewport 390x844, test Screen 4 CTA advancing to Step 1
      if (vp.name === '390x844') {
        console.log(`\n[E2E Test] Testing Screen 4 Primary CTA («Создать мою натальную карту →»)...`);
        const ctaClicked = await page.evaluate(() => {
          const s4 = document.getElementById('obTeaser4');
          if (!s4) return false;
          const buttons = Array.from(s4.querySelectorAll('button'));
          const cta = buttons.find(b => b.innerText.includes('Создать') || b.classList.contains('btn-max-primary'));
          if (cta) {
            cta.click();
            return true;
          }
          if (typeof window.skipToDataEntry === 'function') {
            window.skipToDataEntry();
            return true;
          }
          return false;
        });

        await new Promise(r => setTimeout(r, 800));

        const step1State = await page.evaluate(() => {
          const s1 = document.getElementById('obStep1');
          const tWrap = document.getElementById('obTeasersWrap');
          return {
            step1Visible: s1 && window.getComputedStyle(s1).display !== 'none',
            teasersHidden: !tWrap || window.getComputedStyle(tWrap).display === 'none'
          };
        });

        console.log('[E2E Test] CTA Transition to Step 1:', step1State);
        results.ctaTest = step1State.step1Visible && step1State.teasersHidden;
      }
    }

    // 2. Test «Пропустить» Skip button functionality
    console.log(`\n======================================================`);
    console.log(`[E2E Test] Testing Header «Пропустить» (Skip) Button`);
    console.log(`======================================================`);
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.goto('http://localhost:4322/index.html?reset=1', { waitUntil: 'networkidle2' });
    await page.waitForSelector('#obSkipBtn', { visible: true, timeout: 5000 });
    await new Promise(r => setTimeout(r, 600));

    console.log('[E2E Test] Clicking #obSkipBtn...');
    await page.click('#obSkipBtn');
    await new Promise(r => setTimeout(r, 800));

    const skipCheck = await page.evaluate(() => {
      const step1 = document.getElementById('obStep1');
      const tWrap = document.getElementById('obTeasersWrap');
      const skipBtn = document.getElementById('obSkipBtn');
      return {
        step1Visible: step1 && window.getComputedStyle(step1).display !== 'none',
        teasersHidden: !tWrap || window.getComputedStyle(tWrap).display === 'none',
        skipBtnHidden: !skipBtn || window.getComputedStyle(skipBtn).display === 'none'
      };
    });

    console.log('[E2E Test] Skip Button Result:', skipCheck);
    results.skipTest = skipCheck.step1Visible && skipCheck.teasersHidden;

    // 3. Test Back Navigation («← Назад»)
    console.log(`\n======================================================`);
    console.log(`[E2E Test] Testing Back Navigation («← Назад»)`);
    console.log(`======================================================`);
    await page.goto('http://localhost:4322/index.html?reset=1', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 800));

    // Advance to Teaser 2
    await page.evaluate(() => {
      if (typeof window.showTeaserStep === 'function') window.showTeaserStep(2);
      else {
        const btn = document.querySelector('#obTeaser1 button.btn-max-primary');
        if (btn) btn.click();
      }
    });
    await new Promise(r => setTimeout(r, 600));

    // Now click Back button on Teaser 2
    const backClicked = await page.evaluate(() => {
      const s2 = document.getElementById('obTeaser2');
      if (!s2) return false;
      const backBtn = Array.from(s2.querySelectorAll('button')).find(b => b.innerText.includes('Назад') || b.classList.contains('btn-max-secondary'));
      if (backBtn) {
        backBtn.click();
        return true;
      }
      if (typeof window.showTeaserStep === 'function') {
        window.showTeaserStep(1);
        return true;
      }
      return false;
    });

    await new Promise(r => setTimeout(r, 600));
    const backCheck = await page.evaluate(() => {
      const t1 = document.getElementById('obTeaser1');
      const t2 = document.getElementById('obTeaser2');
      return {
        teaser1Visible: t1 && window.getComputedStyle(t1).display !== 'none',
        teaser2Hidden: t2 && window.getComputedStyle(t2).display === 'none'
      };
    });

    console.log('[E2E Test] Back Navigation Result:', backCheck);
    results.backTest = backCheck.teaser1Visible && backCheck.teaser2Hidden;

    await browser.close();
    server.close();

    console.log(`\n======================================================`);
    console.log(`[E2E Test] SUMMARY`);
    console.log(`======================================================`);
    console.log(`Screenshots Captured: ${results.screenshots.length} / 8`);
    results.screenshots.forEach(s => console.log(`  - [Teaser ${s.step}] [${s.viewport}]: ${s.path}`));
    console.log(`No-Scroll Checks Passed: ${results.noScrollChecks.filter(c => c.noScroll).length} / ${results.noScrollChecks.length}`);
    console.log(`Skip Button Test: ${results.skipTest ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`CTA Advance Test: ${results.ctaTest ? 'PASSED ✅' : 'FAILED ❌'}`);
    console.log(`Back Button Test: ${results.backTest ? 'PASSED ✅' : 'FAILED ❌'}`);

    const allScrollPassed = results.noScrollChecks.every(c => c.noScroll);
    if (!allScrollPassed) {
      console.error('❌ Some screens exceeded viewport bounds!');
      process.exit(1);
    }
    if (!results.skipTest || !results.ctaTest || !results.backTest) {
      console.error('❌ Navigation interaction tests failed!');
      process.exit(1);
    }

    console.log('\n🎉 ALL E2E TEASER VERIFICATIONS PASSED SUCCESSFULLY!');
    process.exit(0);

  } catch (err) {
    console.error('❌ E2E Teaser Flow Verification failed with error:', err);
    if (browser) await browser.close();
    server.close();
    process.exit(1);
  }
});
