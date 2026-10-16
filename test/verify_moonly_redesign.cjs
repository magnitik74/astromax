const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const artifactDir = process.env.ARTIFACT_DIR || 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\75e4d09b-0475-4902-a3d9-e5e4fd2ff697';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const publicDir = path.join(__dirname, '..', 'public');

// Simple static server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

(async () => {
  await new Promise((resolve) => server.listen(8089, resolve));
  console.log('Static server listening on http://localhost:8089');

  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  console.log('Setting localStorage before loading...');
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('astromax_onboarded', 'true');
    localStorage.setItem('astromax_user_profile', JSON.stringify({
      name: 'Александр',
      birthDate: '1990-05-15',
      birthTime: '12:00',
      birthPlace: 'Москва',
      personaId: 'alena'
    }));
  });

  console.log('Loading page...');
  await page.goto('http://localhost:8089/index.html', { waitUntil: 'networkidle0', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1000));

  await page.evaluate(() => {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
    }
  });

  // 1. Capture Tarot tab (3D curved cards + purple fanned deck)
  console.log('Switching to Tarot tab...');
  await page.evaluate(() => {
    if (typeof switchNavTab === 'function') switchNavTab('tarot');
  });
  await new Promise(r => setTimeout(r, 1200));
  const tarotPath = path.join(artifactDir, 'moonly_redesign_tarot_3d.png');
  await page.screenshot({ path: tarotPath });
  console.log('Tarot tab captured:', tarotPath);

  // 2. Capture Chat tab (White luxury theme)
  console.log('Switching to Chat tab...');
  await page.evaluate(() => {
    if (typeof switchNavTab === 'function') switchNavTab('chat');
  });
  await new Promise(r => setTimeout(r, 1200));
  const chatPath = path.join(artifactDir, 'moonly_redesign_chat_white.png');
  await page.screenshot({ path: chatPath });
  console.log('Chat tab captured:', chatPath);

  // 3. Capture Daily Horoscope tab (3D sphere moons + focus card + 3D compatibility)
  console.log('Switching to Daily tab...');
  await page.evaluate(() => {
    if (typeof switchNavTab === 'function') switchNavTab('daily');
  });
  await new Promise(r => setTimeout(r, 1200));
  const dailyPath = path.join(artifactDir, 'moonly_redesign_daily_3d.png');
  await page.screenshot({ path: dailyPath });
  console.log('Daily tab captured:', dailyPath);

  // 4. Capture Natal tab (Zodiac Wheel & 3D Transit Sphere)
  console.log('Switching to Natal tab...');
  await page.evaluate(() => {
    if (typeof switchNavTab === 'function') switchNavTab('horoscope');
  });
  await new Promise(r => setTimeout(r, 1200));
  const natalPath = path.join(artifactDir, 'moonly_redesign_natal.png');
  await page.screenshot({ path: natalPath });
  console.log('Natal tab captured:', natalPath);

  await browser.close();
  server.close();
  console.log('Done!');
  process.exit(0);
})();
