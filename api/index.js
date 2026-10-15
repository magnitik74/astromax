import fs from 'node:fs';
import path from 'node:path';

let cachedHtml = null;

export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!cachedHtml) {
      const candidates = [
        path.join(process.cwd(), 'public', 'index.html'),
        path.join(process.cwd(), 'index.html'),
        new URL('../public/index.html', import.meta.url),
        new URL('../index.html', import.meta.url)
      ];
      for (const p of candidates) {
        try {
          cachedHtml = fs.readFileSync(p, 'utf8');
          if (cachedHtml) break;
        } catch (_) {}
      }
    }

    if (cachedHtml) {
      return res.status(200).send(cachedHtml);
    }
    return res.status(200).send('<!DOCTYPE html><html><body><h1>AstroMAX</h1></body></html>');
  } catch (err) {
    return res.status(500).send(`Server error: ${err.message}`);
  }
}
