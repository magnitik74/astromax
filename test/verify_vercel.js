import https from 'node:https';

function check(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        console.log(url, '-> Status:', res.statusCode, 'Location:', res.headers.location || 'NONE', 'Bytes:', body.length);
        resolve({ url, status: res.statusCode, location: res.headers.location, length: body.length });
      });
    }).on('error', (err) => {
      console.error(url, '-> Error:', err.message);
      resolve({ url, error: err.message });
    });
  });
}

async function run() {
  await check('https://astromax-nu.vercel.app/');
  await check('https://astromax-nu.vercel.app/index.html');
  await check('https://astromax-nu.vercel.app/max-web-app.js');
  await check('https://astromax-nu.vercel.app/version.json');
  await check('https://astromax-nu.vercel.app/health');
}

run();
