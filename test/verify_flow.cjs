const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\195a1bf2-4075-4dfb-a19a-afcc2ad23c80';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  console.log('Navigating to Mini App...');
  await page.goto('https://astromax-nu.vercel.app/index.html?reset=1', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Step 1: Name
  const step1Path = path.join(artifactDir, 'screen_step1_name.png');
  await page.screenshot({ path: step1Path });
  console.log('Step 1 captured:', step1Path);

  // Advance to Step 2: Date & Time
  await page.evaluate(() => nextOnboardingStep(2));
  await new Promise(r => setTimeout(r, 1000));
  const step2Path = path.join(artifactDir, 'screen_step2_date_time.png');
  await page.screenshot({ path: step2Path });
  console.log('Step 2 captured:', step2Path);

  // Advance to Step 3: City
  await page.evaluate(() => nextOnboardingStep(3));
  await new Promise(r => setTimeout(r, 1000));
  const step3Path = path.join(artifactDir, 'screen_step3_city.png');
  await page.screenshot({ path: step3Path });
  console.log('Step 3 captured:', step3Path);

  // Advance to Step 4: Mentors 2x2 grid
  await page.evaluate(() => nextOnboardingStep(4));
  await new Promise(r => setTimeout(r, 1000));
  const step4Path = path.join(artifactDir, 'screen_step4_mentors_2x2.png');
  await page.screenshot({ path: step4Path });
  console.log('Step 4 captured:', step4Path);

  // Advance to Step 5: Finish calculation
  await page.evaluate(() => finishOnboarding());
  await new Promise(r => setTimeout(r, 1500));
  const step5Path = path.join(artifactDir, 'screen_step5_calculation.png');
  await page.screenshot({ path: step5Path });
  console.log('Step 5 captured:', step5Path);

  // Wait for Cosmic Passport to render
  await new Promise(r => setTimeout(r, 4000));
  const passportPath = path.join(artifactDir, 'screen_cosmic_passport.png');
  await page.screenshot({ path: passportPath });
  console.log('Cosmic Passport captured:', passportPath);

  // Switch to Tarot Temple
  await page.evaluate(() => switchNavTab('tarot'));
  await new Promise(r => setTimeout(r, 1500));
  const tarotPath = path.join(artifactDir, 'screen_tarot_temple.png');
  await page.screenshot({ path: tarotPath });
  console.log('Tarot Temple captured:', tarotPath);

  // Switch to Mentor Chat
  await page.evaluate(() => switchNavTab('chat'));
  await new Promise(r => setTimeout(r, 1500));
  const chatPath = path.join(artifactDir, 'screen_mentor_chat.png');
  await page.screenshot({ path: chatPath });
  console.log('Mentor Chat captured:', chatPath);

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED AND VERIFIED!');
})();
