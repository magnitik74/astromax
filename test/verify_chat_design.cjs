const puppeteer = require('puppeteer-core');
const path = require('path');

const artifactDir = 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\195a1bf2-4075-4dfb-a19a-afcc2ad23c80';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Launching browser to verify luxury chat design...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  // Standard iPhone 14/15 Pro viewport (393 x 852)
  await page.setViewport({ width: 393, height: 852, isMobile: true, hasTouch: true });

  console.log('Navigating to local Mini App on port 3000...');
  await page.goto('http://localhost:3000/index.html?reset=1', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  // Finish onboarding quickly
  console.log('Completing onboarding...');
  await page.evaluate(() => finishOnboarding());
  await new Promise(r => setTimeout(r, 3500));

  // Switch to Chat tab
  console.log('Switching to Chat tab...');
  await page.evaluate(() => switchNavTab('chat'));
  await new Promise(r => setTimeout(r, 600));

  // Select Sofia
  await page.evaluate(() => selectPersona('sofia'));
  await new Promise(r => setTimeout(r, 600));

  // Capture Screenshot 1: Clean Chat TopBar & Starter Question
  const cleanChatPath = path.join(artifactDir, 'screen_chat_clean_topbar.png');
  await page.screenshot({ path: cleanChatPath });
  console.log('Screenshot 1 (Clean Chat TopBar) captured:', cleanChatPath);

  // Focus input to trigger keyboard-active state
  console.log('Focusing input to test keyboard-active state...');
  await page.focus('#chatMessageInput');
  await new Promise(r => setTimeout(r, 400));

  // Capture Screenshot 2: Keyboard Active State (Bottom bar hidden, input docked)
  const keyboardActivePath = path.join(artifactDir, 'screen_chat_keyboard_active.png');
  await page.screenshot({ path: keyboardActivePath });
  console.log('Screenshot 2 (Keyboard Active) captured:', keyboardActivePath);

  // Unfocus input
  await page.evaluate(() => document.getElementById('chatMessageInput').blur());
  await new Promise(r => setTimeout(r, 400));

  // Send starter question or test question
  const question = 'Привет! На что мне обратить внимание прямо сейчас?';
  console.log('Sending message to Sofia:', question);
  await page.evaluate((q) => sendUserMessage(q), question);

  // Wait for typing and response
  console.log('Waiting for live reply stream...');
  await new Promise(r => setTimeout(r, 6000));

  // Capture Screenshot 3: Live Exchange
  const liveExchangePath = path.join(artifactDir, 'screen_chat_live_exchange.png');
  await page.screenshot({ path: liveExchangePath });
  console.log('Screenshot 3 (Live Exchange) captured:', liveExchangePath);

  await browser.close();
  console.log('All chat design verification screenshots captured successfully!');
})();
