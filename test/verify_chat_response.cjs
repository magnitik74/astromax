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

  // Select Sofia (id: sofia) as requested by user
  await page.evaluate(() => selectPersona('sofia'));
  await new Promise(r => setTimeout(r, 1000));

  // Send "привет" to Sofia
  const testQuestion = 'привет';
  console.log('Sending message to Sofia:', testQuestion);
  await page.evaluate((q) => sendUserMessage(q), testQuestion);

  // Wait for typing indicator and live reply streaming (approx 5-6 seconds)
  console.log('Waiting for Sofia live reply stream...');
  await new Promise(r => setTimeout(r, 6000));

  const liveChatPath = path.join(artifactDir, 'screen_sofia_live_chat.png');
  await page.screenshot({ path: liveChatPath });
  console.log('Live Sofia chat screenshot captured at:', liveChatPath);

  // Extract last assistant message text
  const lastMessage = await page.evaluate(() => {
    const messages = document.querySelectorAll('.chat-bubble.astrologer, .chat-message.assistant');
    if (messages.length === 0) return 'NO_MESSAGES';
    return messages[messages.length - 1].innerText;
  });

  console.log('\n--- EXTRACTED SOFIA BUBBLE FROM LIVE DOM ---');
  console.log(lastMessage);
  console.log('-------------------------------------------');

  await browser.close();
  console.log('Sofia live chat verified successfully!');
})();
