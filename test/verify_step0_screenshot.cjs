const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const http = require('http');

const artifactDir = 'C:\\Users\\Александр\\.gemini\\antigravity\\brain\\6128637c-569a-46b9-a878-ddbc409b6e58';
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const publicDir = path.join(__dirname, '..', 'public');

// 1. Simple static HTTP server for public/
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(publicDir, reqPath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(4321, async () => {
  console.log('Static test server listening on http://localhost:4321');
  try {
    const browser = await puppeteer.launch({
      executablePath: edgePath,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    // Test on iPhone standard 390x844
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    console.log('Opening Step 0 on test server...');
    await page.goto('http://localhost:4321/index.html?reset=1', { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Allow 3D Three.js animation loop to start and render cards
    await new Promise(r => setTimeout(r, 2500));

    // Check visibility and scroll
    const checkResult = await page.evaluate(() => {
      const step0 = document.getElementById('obStep0');
      const canvas = document.getElementById('obTarotCanvas');
      const title = step0 ? step0.querySelector('h2')?.innerText : '';
      const bodyScroll = document.documentElement.scrollHeight <= window.innerHeight + 2;
      return {
        step0Visible: step0 && window.getComputedStyle(step0).display !== 'none',
        canvasExists: !!canvas,
        canvasWidth: canvas ? canvas.clientWidth : 0,
        canvasHeight: canvas ? canvas.clientHeight : 0,
        title: title,
        fitsScreenWithoutScroll: bodyScroll,
        windowHeight: window.innerHeight,
        docHeight: document.documentElement.scrollHeight
      };
    });

    console.log('Step 0 Check Result:', JSON.stringify(checkResult, null, 2));

    const outPicPath = path.join(artifactDir, 'step0_3d_tarot_teaser.png');
    await page.screenshot({ path: outPicPath });
    console.log('Saved screenshot to:', outPicPath);

    // Also test iPhone SE compact 375x667
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await new Promise(r => setTimeout(r, 500));
    const seCheck = await page.evaluate(() => {
      const ob = document.getElementById('onboardingScreen');
      const step0 = document.getElementById('obStep0');
      return {
        windowHeight: window.innerHeight,
        obClientHeight: ob ? ob.clientHeight : 0,
        obScrollHeight: ob ? ob.scrollHeight : 0,
        step0ClientHeight: step0 ? step0.clientHeight : 0,
        step0ScrollHeight: step0 ? step0.scrollHeight : 0,
        noScroll: ob ? ob.scrollHeight <= ob.clientHeight + 2 : false
      };
    });
    console.log('iPhone SE (667px) Check:', JSON.stringify(seCheck, null, 2));
    const sePicPath = path.join(artifactDir, 'step0_3d_tarot_teaser_iphone_se.png');
    await page.screenshot({ path: sePicPath });
    console.log('Saved iPhone SE screenshot to:', sePicPath);

    // Test transition to Step 1
    console.log('Testing button click transition to Step 1...');
    await page.click('#obStep0 button');
    await new Promise(r => setTimeout(r, 600));

    const step1Check = await page.evaluate(() => {
      const step0 = document.getElementById('obStep0');
      const step1 = document.getElementById('obStep1');
      return {
        step0Hidden: step0 && window.getComputedStyle(step0).display === 'none',
        step1Visible: step1 && window.getComputedStyle(step1).display !== 'none'
      };
    });
    console.log('Transition to Step 1 Check:', JSON.stringify(step1Check, null, 2));

    await browser.close();
    server.close();
    console.log('VERIFICATION FINISHED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    server.close();
    process.exit(1);
  }
});
