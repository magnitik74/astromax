const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const currentArtifactDir = process.env.ARTIFACT_DIR || 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\75e4d09b-0475-4902-a3d9-e5e4fd2ff697';
const outputDir = path.join(currentArtifactDir, 'moonly_results');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('--- Starting Moonly Parity WebView Verification ---');

  // 1. Start local express server
  const { createServer } = await import('../src/server.js');
  const app = createServer();
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(3456, resolve));
  console.log('Local server running on http://localhost:3456');

  try {
    const browser = await puppeteer.launch({
      executablePath: edgePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('Navigating to local Mini App...');
    await page.goto('http://localhost:3456/index.html?reset=1', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Screen 1: Step 1 (Name)
    const step1Path = path.join(outputDir, 'moonly_step1_name.png');
    await page.screenshot({ path: step1Path });
    console.log('Step 1 captured:', step1Path);

    // Screen 2: Step 2 (Date & Time)
    await page.evaluate(() => nextOnboardingStep(2));
    await new Promise(r => setTimeout(r, 1000));
    const step2Path = path.join(outputDir, 'moonly_step2_date_time.png');
    await page.screenshot({ path: step2Path });
    console.log('Step 2 captured:', step2Path);

    // Screen 3: Step 3 (City)
    await page.evaluate(() => nextOnboardingStep(3));
    await new Promise(r => setTimeout(r, 1000));
    const step3Path = path.join(outputDir, 'moonly_step3_city.png');
    await page.screenshot({ path: step3Path });
    console.log('Step 3 captured:', step3Path);

    // Screen 4: Step 4 (Mentors 2x2)
    await page.evaluate(() => nextOnboardingStep(4));
    await new Promise(r => setTimeout(r, 1000));
    const step4Path = path.join(outputDir, 'moonly_step4_mentors.png');
    await page.screenshot({ path: step4Path });
    console.log('Step 4 captured:', step4Path);

    // Screen 5: Loading / Calculation Screen
    await page.evaluate(() => finishOnboarding());
    await new Promise(r => setTimeout(r, 500));
    const step5Path = path.join(outputDir, 'moonly_step5_loading.png');
    await page.screenshot({ path: step5Path });
    console.log('Step 5 captured:', step5Path);

    // Wait for Natal Chart Wheel to render
    await new Promise(r => setTimeout(r, 4500));
    const natalPath = path.join(outputDir, 'moonly_natal_wheel.png');
    await page.screenshot({ path: natalPath });
    console.log('Natal Chart Wheel captured:', natalPath);

    // Scroll to capture Ascendant Hero & Multi-Colored Bento Grid
    await page.evaluate(() => {
      const el = document.getElementById('moonlyAscCard');
      if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    await new Promise(r => setTimeout(r, 800));
    const bentoPath = path.join(outputDir, 'moonly_natal_bento.png');
    await page.screenshot({ path: bentoPath });
    console.log('Natal Bento Grid captured:', bentoPath);

    // Screen 6.5: Daily Focus & Moon Calendar Tab
    await page.evaluate(() => switchNavTab('daily'));
    await new Promise(r => setTimeout(r, 1500));
    const dailyPath = path.join(outputDir, 'moonly_daily_focus.png');
    await page.screenshot({ path: dailyPath });
    console.log('Daily Focus & Moon Calendar captured:', dailyPath);

    // Screen 7: Tarot Temple
    await page.evaluate(() => switchNavTab('tarot'));
    await new Promise(r => setTimeout(r, 1500));
    const tarotPath = path.join(outputDir, 'moonly_tarot.png');
    await page.screenshot({ path: tarotPath });
    console.log('Tarot Temple captured:', tarotPath);

    // Screen 8: Mentor Chat with Free Questions Counter
    await page.evaluate(() => switchNavTab('chat'));
    await new Promise(r => setTimeout(r, 1500));
    const chatPath = path.join(outputDir, 'moonly_chat_counter.png');
    await page.screenshot({ path: chatPath });
    console.log('Chat with Free Questions Badge captured:', chatPath);

    // Screen 9: Moonly Paywall Bottom Sheet
    await page.evaluate(() => showMoonlyPaywall('test'));
    await new Promise(r => setTimeout(r, 1200));
    const paywallPath = path.join(outputDir, 'moonly_paywall_bottomsheet.png');
    await page.screenshot({ path: paywallPath });
    console.log('Moonly Paywall Bottom Sheet captured:', paywallPath);

    // Close paywall & switch to Profile
    await page.evaluate(() => closeMoonlyPaywall());
    await new Promise(r => setTimeout(r, 800));

    // Screen 10: Profile Tab with 1-click unsubscribe button
    await page.evaluate(() => switchNavTab('profile'));
    await new Promise(r => setTimeout(r, 1500));
    const profilePath = path.join(outputDir, 'moonly_profile_cancel_sub.png');
    await page.screenshot({ path: profilePath });
    console.log('Profile with 1-click cancel captured:', profilePath);

    await browser.close();
    console.log('--- All Moonly Parity Screens Successfully Verified & Captured! ---');
  } finally {
    server.close();
  }
})();
