const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\195a1bf2-4075-4dfb-a19a-afcc2ad23c80';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Launching browser with Edge...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  console.log('Navigating to live app on Vercel...');
  await page.goto('https://astromax-nu.vercel.app/index.html?reset=1', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2000));

  // Advance through onboarding quickly
  console.log('Advancing onboarding steps...');
  await page.evaluate(() => nextOnboardingStep(2));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => nextOnboardingStep(3));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => nextOnboardingStep(4));
  await new Promise(r => setTimeout(r, 500));
  await page.evaluate(() => finishOnboarding());
  await new Promise(r => setTimeout(r, 3500));

  // 1. Capture Cosmic Passport
  const passportPath = path.join(artifactDir, 'screen_cosmic_passport.png');
  await page.screenshot({ path: passportPath });
  console.log('Captured Cosmic Passport:', passportPath);

  // 2. Switch to Daily Horoscope Tab (TAB 0)
  console.log('Switching to Daily Horoscope Tab...');
  await page.evaluate(() => switchNavTab('daily'));
  await new Promise(r => setTimeout(r, 1500));
  const dailyPath = path.join(artifactDir, 'screen_daily_horoscope.png');
  await page.screenshot({ path: dailyPath });
  console.log('Captured Daily Horoscope:', dailyPath);

  // 3. Switch to Chat with Mentor and select Sofia Romanova
  console.log('Switching to Mentor Chat...');
  await page.evaluate(() => switchNavTab('chat'));
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => selectPersona('sofia'));
  await new Promise(r => setTimeout(r, 1500));

  // Verify toast is NOT overlapping the message
  const chatNoToastPath = path.join(artifactDir, 'screen_chat_clean_no_toast.png');
  await page.screenshot({ path: chatNoToastPath });
  console.log('Captured Chat without toast overlap:', chatNoToastPath);

  // 4. Test clicking "Обсудить день с наставником" from Daily Horoscope
  await page.evaluate(() => switchNavTab('daily'));
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => openChatFromDaily());
  await new Promise(r => setTimeout(r, 1500));

  const chatFromDailyPath = path.join(artifactDir, 'screen_chat_from_daily.png');
  await page.screenshot({ path: chatFromDailyPath });
  console.log('Captured Chat opened from Daily Horoscope:', chatFromDailyPath);

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
})();
