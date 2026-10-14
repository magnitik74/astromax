import 'dotenv/config';
import fs from 'node:fs';
import { MaxBotClient } from '../src/bot/maxClient.js';

async function testUpload() {
  const client = new MaxBotClient();
  console.log('1. Initializing upload slot...');
  const init = await client.request('/uploads?type=image', 'POST');
  console.log('Init result:', init);

  if (init && init.url) {
    console.log('2. Uploading file via FormData...');
    const fileBytes = fs.readFileSync('astromax_banner.jpg');
    const blob = new Blob([fileBytes], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('data', blob, 'astromax_banner.jpg');

    const res = await fetch(init.url, {
      method: 'POST',
      body: formData,
    });
    console.log('Upload status:', res.status);
    const json = await res.json();
    console.log('Uploaded JSON:', json);
    return json;
  }
}

testUpload().catch(console.error);
