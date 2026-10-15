import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function main() {
  const port = 9340;
  const chromeProcess = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--disable-gpu',
    '--no-sandbox',
    '--window-size=390,844',
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/json`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });

  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  await new Promise(r => ws.addEventListener('open', r));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Console.enable');

  ws.addEventListener('message', evt => {
    const msg = JSON.parse(evt.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('LIVE CONSOLE:', msg.params.type, msg.params.args.map(a => a.value || a.description));
    }
  });

  console.log('Navigating to LIVE Vercel URL...');
  await send('Page.navigate', { url: 'https://astromax-nu.vercel.app/?user_id=438093259' });
  await new Promise(r => setTimeout(r, 4000));

  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('test/live_prod_verified.png', Buffer.from(screenshot.data, 'base64'));
  console.log('Saved test/live_prod_verified.png');

  const diag = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const modal = document.getElementById('onboardingModal');
        const sheet = modal?.querySelector('.modal-sheet');
        const sRect = sheet?.getBoundingClientRect();
        const center = document.elementFromPoint(195, 422);
        return {
          modalActive: modal?.classList.contains('active'),
          sheetTop: sRect?.top,
          sheetHeight: sRect?.height,
          viewportH: window.innerHeight,
          centerClass: center?.className,
          centerTag: center?.tagName
        };
      })()
    `,
    returnByValue: true
  });
  console.log('LIVE PROD DIAGNOSTICS:', diag.result?.value);

  ws.close();
  chromeProcess.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
