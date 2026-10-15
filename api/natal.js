export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { calculateNatalChart } = await import('../src/core/astrology.js');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { birthDate, birthTime, lat, lon, timezoneOffset } = body;

    if (!birthDate) {
      return res.status(400).json({ error: 'birthDate is required (YYYY-MM-DD)' });
    }

    const chart = calculateNatalChart({
      birthDate,
      birthTime: birthTime || '12:00',
      lat: lat ? Number(lat) : 55.7558,
      lon: lon ? Number(lon) : 37.6173,
      timezoneOffset: timezoneOffset ? Number(timezoneOffset) : 3,
    });

    return res.status(200).json(chart);
  } catch (err) {
    console.error('[API /api/natal] Error:', err);
    return res.status(500).json({
      error: 'NATAL_EXECUTION_ERROR',
      message: err.message,
      stack: err.stack
    });
  }
}
