import { MaxBotClient } from '../src/bot/maxClient.js';
import { BotDispatcher } from '../src/bot/dispatcher.js';
import { GroqAIClient } from '../src/ai/groqClient.js';

const botClient = new MaxBotClient();
const ai = new GroqAIClient();
const dispatcher = new BotDispatcher(botClient, { ai });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check / probe for Max Messenger subscriptions verification
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      service: 'AstroMAX Messenger Cloud Webhook',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    await dispatcher.handleUpdate(update);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.warn('[Max Cloud Webhook Handler Warning]:', err.message);
    // Return HTTP 200 so Max Messenger webhook doesn't spam retry loops on deleted/unknown chats
    return res.status(200).json({ ok: true, handledWithWarning: err.message });
  }
}
