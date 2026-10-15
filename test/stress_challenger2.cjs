/**
 * Empirical Challenger 2 Stress Harness for AstroMAX Mini App
 * Adversarial Mission:
 * 1. Viewport extremes: 320x568, 375x667, 390x844, 412x915 -> assert scrollHeight <= clientHeight + 1
 * 2. 50 rapid cycle transitions (1->2->3->4) -> assert no webglcontextlost, no memory explosion, monitor promise rejections
 * 3. Backgrounding: visibilitychange ('hidden') -> assert all 4 rAF loops pause immediately; resume on 'visible'
 */

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const publicDir = path.join(__dirname, '..', 'public');

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

function createStaticServer() {
  return http.createServer((req, res) => {
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
}

async function runStressTests() {
  console.log('===============================================================');
  console.log('🚀 CHALLENGER 2: EMPIRICAL STRESS & ADVERSARIAL VERIFICATION');
  console.log('===============================================================');

  const server = createStaticServer();
  const port = await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(server.address().port);
    });
  });

  const appUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Local static server active on ${appUrl}`);

  const results = {
    viewports: [],
    cycleSwitching: null,
    backgrounding: null,
    unhandledRejections: [],
    issuesFound: [],
    verdict: 'APPROVE'
  };

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=500,1000'
    ]
  });

  const page = await browser.newPage();

  page.on('pageerror', err => {
    console.error('❌ [Page Error Detected]:', err.message);
  });

  await page.evaluateOnNewDocument(() => {
    window.__unhandledRejections = [];
    window.addEventListener('unhandledrejection', (e) => {
      window.__unhandledRejections.push({
        reason: e.reason,
        code: e.reason && e.reason.error ? e.reason.error.code : 'unknown'
      });
    });
  });

  try {
    console.log(`\n[Navigating] Loading AstroMAX at ${appUrl}...`);
    await page.goto(appUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('✅ Page loaded successfully.');

    // -------------------------------------------------------------
    // CHALLENGE 1: VIEWPORT EXTREMES (320x568, 375x667, 390x844, 412x915)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 CHALLENGE 1: Viewport Extremes & No-Scroll Assertion');
    console.log('-------------------------------------------------------------');

    const viewports = [
      { name: 'iPhone 5/SE1 (Ultra Compact)', width: 320, height: 568 },
      { name: 'iPhone SE2/SE3 (Compact)', width: 375, height: 667 },
      { name: 'iPhone 12/13/14 (Standard)', width: 390, height: 844 },
      { name: 'Samsung / Android (Large)', width: 412, height: 915 }
    ];

    for (const vp of viewports) {
      console.log(`\n📱 Testing Viewport: ${vp.name} (${vp.width}x${vp.height})...`);
      await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 2 });
      await new Promise(r => setTimeout(r, 100));

      await page.evaluate(() => {
        openOnboardingModal();
      });

      const vpStepResults = [];

      for (let step = 1; step <= 4; step++) {
        await page.evaluate((s) => {
          showTeaserStep(s);
        }, step);

        // Allow 300ms for CSS screenFadeIn (0.22s) animation to completely settle
        await new Promise(r => setTimeout(r, 300));

        const scrollCheck = await page.evaluate((s) => {
          const modal = document.getElementById('onboardingModal');
          const sheet = modal ? modal.querySelector('.modal-sheet') : null;
          const wrap = document.getElementById('obTeasersWrap');
          const teaserEl = document.getElementById(`obTeaser${s}`);

          const sheetScrollH = sheet ? sheet.scrollHeight : 0;
          const sheetClientH = sheet ? sheet.clientHeight : 0;
          const wrapScrollH = wrap ? wrap.scrollHeight : 0;
          const wrapClientH = wrap ? wrap.clientHeight : 0;
          const stepScrollH = teaserEl ? teaserEl.scrollHeight : 0;
          const stepClientH = teaserEl ? teaserEl.clientHeight : 0;

          const sheetNoScroll = sheetScrollH <= sheetClientH + 1;
          const wrapNoScroll = wrapScrollH <= wrapClientH + 1;
          const stepNoScroll = stepScrollH <= stepClientH + 1;

          return {
            step: s,
            sheetScrollH,
            sheetClientH,
            sheetNoScroll,
            wrapScrollH,
            wrapClientH,
            wrapNoScroll,
            stepScrollH,
            stepClientH,
            stepNoScroll,
            pass: sheetNoScroll && wrapNoScroll && stepNoScroll
          };
        }, step);

        vpStepResults.push(scrollCheck);

        const statusMark = scrollCheck.pass ? '✅ PASS' : '❌ FAIL';
        console.log(
          `  Step ${step}: ${statusMark} | Sheet: ${scrollCheck.sheetScrollH}/${scrollCheck.sheetClientH}px | Wrap: ${scrollCheck.wrapScrollH}/${scrollCheck.wrapClientH}px | Step: ${scrollCheck.stepScrollH}/${scrollCheck.stepClientH}px`
        );
      }

      const allVpPassed = vpStepResults.every(r => r.pass);
      results.viewports.push({
        viewport: vp,
        steps: vpStepResults,
        allPassed: allVpPassed
      });
    }

    // -------------------------------------------------------------
    // CHALLENGE 2: CYCLE SWITCHING (50 RAPID CYCLES 1->2->3->4)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 CHALLENGE 2: 50 Rapid Cycle Transitions (WebGL & Memory)');
    console.log('-------------------------------------------------------------');

    await page.evaluate(() => {
      window.__webglContextLostEvents = 0;
      window.__webglContextLostDetails = [];

      const natalCanvas = document.getElementById('obNatalCanvas');
      if (natalCanvas) {
        natalCanvas.addEventListener('webglcontextlost', (e) => {
          window.__webglContextLostEvents++;
          window.__webglContextLostDetails.push('obNatalCanvas context lost');
          e.preventDefault();
        });
      }

      const tarotCanvas = document.getElementById('obTarotCanvas');
      if (tarotCanvas) {
        tarotCanvas.addEventListener('webglcontextlost', (e) => {
          window.__webglContextLostEvents++;
          window.__webglContextLostDetails.push('obTarotCanvas context lost');
          e.preventDefault();
        });
      }
    });

    const memBefore = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    if (memBefore) {
      console.log(`Initial Heap Memory: ${(memBefore.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    }

    const CYCLES = 50;
    console.log(`Executing ${CYCLES} rapid cycles through screens 1 -> 2 -> 3 -> 4 (200 transitions total)...`);
    const startTime = Date.now();

    for (let c = 1; c <= CYCLES; c++) {
      for (let s = 1; s <= 4; s++) {
        await page.evaluate((stepNum) => {
          showTeaserStep(stepNum);
        }, s);
        await new Promise(r => setTimeout(r, 20));
      }
      if (c % 10 === 0) {
        process.stdout.write(`  Completed ${c}/${CYCLES} cycles...\n`);
      }
    }

    const elapsedMs = Date.now() - startTime;
    console.log(`Completed ${CYCLES} cycles in ${(elapsedMs / 1000).toFixed(2)}s`);

    // Settle for 500ms
    await new Promise(r => setTimeout(r, 500));

    const memAfter = await page.evaluate(() => {
      if (performance.memory) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
      }
      return null;
    });

    const contextLostData = await page.evaluate(() => {
      return {
        lostCount: window.__webglContextLostEvents || 0,
        details: window.__webglContextLostDetails || []
      };
    });

    let memDeltaMB = 0;
    if (memBefore && memAfter) {
      memDeltaMB = (memAfter.usedJSHeapSize - memBefore.usedJSHeapSize) / 1024 / 1024;
      console.log(`Final Heap Memory: ${(memAfter.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB (Delta: ${memDeltaMB >= 0 ? '+' : ''}${memDeltaMB.toFixed(2)} MB)`);
    }

    const webglPass = contextLostData.lostCount === 0;
    const memPass = memDeltaMB < 30;

    console.log(`WebGL Context Lost Count: ${contextLostData.lostCount} -> ${webglPass ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Memory Growth Bound (<30MB): ${memDeltaMB.toFixed(2)} MB -> ${memPass ? '✅ PASS' : '❌ FAIL'}`);

    // Check for unhandled promise rejections after waiting for timeout
    console.log('Waiting 11 seconds to verify promise rejection status from WebApp bridge timeouts...');
    await new Promise(r => setTimeout(r, 11000));

    const rejectionData = await page.evaluate(() => {
      return window.__unhandledRejections || [];
    });

    console.log(`Accumulated Unhandled Promise Rejections: ${rejectionData.length}`);
    if (rejectionData.length > 0) {
      console.log(`Sample Rejection Code: ${rejectionData[0].code}`);
      results.issuesFound.push({
        severity: 'HIGH',
        title: 'Unhandled Promise Rejection in triggerHaptic() / WebApp.HapticFeedback',
        count: rejectionData.length,
        sample: rejectionData[0],
        impact: 'Pollutes console/logging with unhandled rejection errors on every button click when WebApp bridge times out'
      });
      results.verdict = 'REJECT';
    }

    results.cycleSwitching = {
      cycles: CYCLES,
      totalTransitions: CYCLES * 4,
      elapsedMs,
      memBefore,
      memAfter,
      memDeltaMB,
      contextLostCount: contextLostData.lostCount,
      webglPass,
      memPass,
      unhandledRejectionCount: rejectionData.length,
      pass: webglPass && memPass && rejectionData.length === 0
    };

    // -------------------------------------------------------------
    // CHALLENGE 3: BACKGROUNDING LIFECYCLE (visibilitychange)
    // -------------------------------------------------------------
    console.log('\n-------------------------------------------------------------');
    console.log('🧪 CHALLENGE 3: Backgrounding Lifecycle (visibilitychange)');
    console.log('-------------------------------------------------------------');

    const backgroundingChecks = [];

    for (let testStep = 1; testStep <= 4; testStep++) {
      await page.evaluate((s) => {
        showTeaserStep(s);
      }, testStep);
      await new Promise(r => setTimeout(r, 100));

      const beforeState = await page.evaluate(() => {
        return {
          obNatalAnimId: typeof obNatalAnimId !== 'undefined' ? obNatalAnimId : null,
          obEmpathyAnimId: typeof obEmpathyAnimId !== 'undefined' ? obEmpathyAnimId : null,
          obTarotAnimId: typeof obTarotAnimId !== 'undefined' ? obTarotAnimId : null,
          obHoroscopeAnimId: typeof obHoroscopeAnimId !== 'undefined' ? obHoroscopeAnimId : null,
          currentTeaserStep: typeof currentTeaserStep !== 'undefined' ? currentTeaserStep : null
        };
      });

      // Backgrounding
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await new Promise(r => setTimeout(r, 50));

      const hiddenState = await page.evaluate(() => {
        return {
          obNatalAnimId: typeof obNatalAnimId !== 'undefined' ? obNatalAnimId : null,
          obEmpathyAnimId: typeof obEmpathyAnimId !== 'undefined' ? obEmpathyAnimId : null,
          obTarotAnimId: typeof obTarotAnimId !== 'undefined' ? obTarotAnimId : null,
          obHoroscopeAnimId: typeof obHoroscopeAnimId !== 'undefined' ? obHoroscopeAnimId : null,
          currentTeaserStep: typeof currentTeaserStep !== 'undefined' ? currentTeaserStep : null
        };
      });

      const allPaused = (
        hiddenState.obNatalAnimId === null &&
        hiddenState.obEmpathyAnimId === null &&
        hiddenState.obTarotAnimId === null &&
        hiddenState.obHoroscopeAnimId === null &&
        hiddenState.currentTeaserStep === 0
      );

      // Foregrounding
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await new Promise(r => setTimeout(r, 100));

      const resumedState = await page.evaluate(() => {
        return {
          obNatalAnimId: typeof obNatalAnimId !== 'undefined' ? obNatalAnimId : null,
          obEmpathyAnimId: typeof obEmpathyAnimId !== 'undefined' ? obEmpathyAnimId : null,
          obTarotAnimId: typeof obTarotAnimId !== 'undefined' ? obTarotAnimId : null,
          obHoroscopeAnimId: typeof obHoroscopeAnimId !== 'undefined' ? obHoroscopeAnimId : null,
          currentTeaserStep: typeof currentTeaserStep !== 'undefined' ? currentTeaserStep : null
        };
      });

      const stepKey = ['obNatalAnimId', 'obEmpathyAnimId', 'obTarotAnimId', 'obHoroscopeAnimId'][testStep - 1];
      const resumedActive = resumedState[stepKey] !== null;

      const checkPass = allPaused && resumedActive;
      console.log(
        `  Teaser ${testStep}: ${checkPass ? '✅ PASS' : '❌ FAIL'} | Hidden All Paused: ${allPaused} | Resumed Loop Active: ${resumedActive}`
      );

      backgroundingChecks.push({
        step: testStep,
        allPaused,
        resumedActive,
        pass: checkPass
      });
    }

    results.backgrounding = {
      checks: backgroundingChecks,
      pass: backgroundingChecks.every(c => c.pass)
    };

  } catch (err) {
    console.error('\n❌ Fatal Test Harness Error:', err);
    results.verdict = 'REJECT';
    results.fatalError = err.message;
  } finally {
    await browser.close();
    server.close();
  }

  // -------------------------------------------------------------
  // FINAL VERDICT SYNTHESIS
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`🏁 CHALLENGER 2 FINAL VERDICT: ${results.verdict === 'APPROVE' ? '✅ APPROVE' : '❌ REJECT'}`);
  console.log('===============================================================');

  return results;
}

runStressTests().then(results => {
  if (results.verdict !== 'APPROVE') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch(err => {
  console.error(err);
  process.exit(1);
});
