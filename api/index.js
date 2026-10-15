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
        return res.status(200).send(fs.readFileSync(p, 'utf8'));
      }
    }
  } catch (err) {
    console.error('Error reading index.html:', err);
  }

  return res.redirect(302, '/index.html');
}
