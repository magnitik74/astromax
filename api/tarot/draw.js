import { drawTarotSpread } from '../../src/core/tarot.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { type = 'daily', allowReversed = true } = body;
    const spread = drawTarotSpread({ type, allowReversed });
    return res.status(200).json(spread);
  } catch (err) {
    console.error('[API /api/tarot/draw] Error:', err);
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
