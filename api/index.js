export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Healthcheck fallback
  if (req.url === '/health' || req.url === '/api/health') {
    return res.status(200).json({ status: 'ok', service: 'AstroMAX API', timestamp: new Date().toISOString() });
  }

  try {
    const { createServer } = await import('../src/server.js');
    const app = createServer();
    return app(req, res);
  } catch (err) {
    console.error('Serverless index error:', err);
    return res.status(500).json({ error: 'Serverless invocation error', message: err.message });
  }
}
