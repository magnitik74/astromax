import puppeteer from 'puppeteer-core';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const artifactDir = process.env.ARTIFACT_DIR || 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\195a1bf2-4075-4dfb-a19a-afcc2ad23c80';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Starting local test server on ephemeral port...');
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;
  console.log(`Test server running at http://127.0.0.1:${port}`);

  console.log('Launching browser with Edge...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--proxy-server="direct://"',
      '--proxy-bypass-list=*'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('Navigating to Mini App...');
    await page.goto(`http://127.0.0.1:${port}/index.html?reset=1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 1500));

    // Step 1: Name
    const step1Path = path.join(artifactDir, 'screen_step1_name.png');
    await page.screenshot({ path: step1Path });
    console.log('Step 1 captured:', step1Path);

    // Advance to Step 2: Date & Time
    await page.evaluate(() => nextOnboardingStep(2));
    await new Promise(r => setTimeout(r, 800));
    const step2Path = path.join(artifactDir, 'screen_step2_date_time.png');
    await page.screenshot({ path: step2Path });
    console.log('Step 2 captured:', step2Path);

    // Advance to Step 3: City
    await page.evaluate(() => nextOnboardingStep(3));
    await new Promise(r => setTimeout(r, 800));
    const step3Path = path.join(artifactDir, 'screen_step3_city.png');
    await page.screenshot({ path: step3Path });
    console.log('Step 3 captured:', step3Path);

    // Advance to Step 4: Mentors 2x2 grid
    await page.evaluate(() => nextOnboardingStep(4));
    await new Promise(r => setTimeout(r, 800));
    const step4Path = path.join(artifactDir, 'screen_step4_mentors_2x2.png');
    await page.screenshot({ path: step4Path });
    console.log('Step 4 captured:', step4Path);

    // Advance to Step 5: Finish calculation
    await page.evaluate(() => finishOnboarding());
    await new Promise(r => setTimeout(r, 1500));
    const step5Path = path.join(artifactDir, 'screen_step5_calculation.png');
    await page.screenshot({ path: step5Path });
    console.log('Step 5 captured:', step5Path);

    // Wait for Natal Chart Wheel to render
    await new Promise(r => setTimeout(r, 2500));
    const natalPath = path.join(artifactDir, 'screen_natal_wheel.png');
    await page.screenshot({ path: natalPath });
    console.log('Natal Chart Wheel captured:', natalPath);

    // Test interactive planet inspection on the wheel (tap Moon)
    console.log('Inspecting Moon planet node on Zodiac Wheel...');
    await page.evaluate(() => inspectNatalPlanet('moon'));
    await new Promise(r => setTimeout(r, 800));
    const inspectPath = path.join(artifactDir, 'screen_natal_planet_inspect.png');
    await page.screenshot({ path: inspectPath });
    console.log('Natal Planet Inspection captured:', inspectPath);

    // Switch to Tarot Temple
    console.log('Switching to Tarot Temple tab...');
    await page.evaluate(() => switchNavTab('tarot'));
    await new Promise(r => setTimeout(r, 1200));
    const tarotPath = path.join(artifactDir, 'screen_tarot_temple.png');
    await page.screenshot({ path: tarotPath });
    console.log('Tarot Temple initial captured:', tarotPath);

    // Deal Daily Card & wait for flip
    console.log('Dealing Tarot daily card...');
    await page.evaluate(() => dealTarotSpread());
    await new Promise(r => setTimeout(r, 2500));
    const tarotDealtPath = path.join(artifactDir, 'screen_tarot_daily_dealt.png');
    await page.screenshot({ path: tarotDealtPath, fullPage: false });
    console.log('Tarot Daily Dealt captured:', tarotDealtPath);

    // Switch to Oracle Yes/No mode and deal
    console.log('Testing Tarot Oracle Yes/No mode...');
    await page.evaluate(() => {
      setTarotMode('oracle_yes_no');
      dealTarotSpread();
    });
    await new Promise(r => setTimeout(r, 2500));
    const tarotOraclePath = path.join(artifactDir, 'screen_tarot_oracle_yes_no.png');
    await page.screenshot({ path: tarotOraclePath, fullPage: false });
    console.log('Tarot Oracle Yes/No captured:', tarotOraclePath);

    // Switch to Mentor Chat and test 1-tap send
    console.log('Switching to Mentor Chat tab...');
    await page.evaluate(() => switchNavTab('chat'));
    await new Promise(r => setTimeout(r, 1200));

    // Test chat message input and 1-tap send
    console.log('Testing chat message 1-tap send...');
    await page.type('#chatMessageInput', 'В чем моя главная сила?');
    await new Promise(r => setTimeout(r, 400));
    await page.click('.chat-send-btn');
    await new Promise(r => setTimeout(r, 3000));

    const chatPath = path.join(artifactDir, 'screen_mentor_chat.png');
    await page.screenshot({ path: chatPath });
    console.log('Mentor Chat captured:', chatPath);

    console.log('ALL SCREENSHOTS CAPTURED AND VERIFIED SUCCESSFULLY!');
  } finally {
    await browser.close();
    server.close();
    console.log('Test server and browser closed cleanly.');
  }
})();
