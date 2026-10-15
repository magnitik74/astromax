import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    const candidatePaths = [
      path.join(process.cwd(), 'public', 'index.html'),
      path.join(process.cwd(), 'index.html'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, 'utf8');
        res.statusCode = 200;
        return res.end(content);
      }
    }
  } catch (err) {
    console.error('Error reading index.html:', err);
  }

  res.statusCode = 302;
  res.setHeader('Location', '/index.html');
  return res.end();
}
