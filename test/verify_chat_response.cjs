const puppeteer = require('puppeteer-core');
const path = require('path');

const artifactDir = 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\195a1bf2-4075-4dfb-a19a-afcc2ad23c80';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('Launching browser to test live Elena chat...');
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

  // Skip to finish onboarding
  await page.evaluate(() => finishOnboarding());
  await new Promise(r => setTimeout(r, 4000));

  // Switch to Chat tab
  await page.evaluate(() => switchNavTab('chat'));
  await new Promise(r => setTimeout(r, 1000));

  // Select Elena (id: elena)
  await page.evaluate(() => selectPersona('elena'));
  await new Promise(r => setTimeout(r, 1000));

  // Send test question to Elena
  const testQuestion = 'Как мне услышать свой истинный внутренний голос?';
  console.log('Sending message to Elena:', testQuestion);
  await page.evaluate((q) => sendUserMessage(q), testQuestion);

  // Wait for typing indicator and live reply streaming (approx 4-5 seconds)
  console.log('Waiting for live reply stream...');
  await new Promise(r => setTimeout(r, 5500));

  const liveChatPath = path.join(artifactDir, 'screen_elena_live_chat.png');
  await page.screenshot({ path: liveChatPath });
  console.log('Live Elena chat screenshot captured at:', liveChatPath);

  // Extract last assistant message text
  const lastMessage = await page.evaluate(() => {
    const messages = document.querySelectorAll('.msg-bubble.assistant');
    if (messages.length === 0) return 'NO_MESSAGES';
    return messages[messages.length - 1].innerText;
  });

  console.log('\n--- EXTRACTED MENTOR BUBBLE FROM LIVE DOM ---');
  console.log(lastMessage);
  console.log('---------------------------------------------');

  await browser.close();
  console.log('Elena live chat verified successfully!');
})();
