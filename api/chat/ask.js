import { checkSafetyGuardrails } from '../../src/safety/guardrails.js';
import { GroqAIClient } from '../../src/ai/groqClient.js';
import { getPersonaById } from '../../src/chat/personas.js';

const ai = new GroqAIClient();

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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { message, profile } = body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Поле message обязательно' });
    }

    const safety = checkSafetyGuardrails(message.trim());
    if (!safety.safe) {
      return res.status(200).json({
        reply: safety.response,
        timestamp: new Date().toISOString()
      });
    }

    const personaId = profile?.personaId || 'alena';
    const persona = getPersonaById(personaId);

    // AI answer via Groq
    let reply = '';
    try {
      if (process.env.GROQ_API_KEY) {
        reply = await ai.chatCompletion({
          messages: [
            {
              role: 'system',
              content: `Ты — ${persona.name}, ${persona.title}. Твое кредо: ${persona.credo}. Отвечай тепло, точно, психологично и глубоко по стандартам Nebula и Co-Star.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          maxTokens: 800
        });
      }
    } catch (e) {
      console.warn('Groq API error in serverless function:', e.message);
    }

    if (!reply) {
      reply = `${persona.greeting}\n\nЯ внимательно вгляделась в твою натальную конфигурацию. Твой вопрос «${message}» высвечивает важную трансформационную точку. Сейчас главное — отпустить контроль и довериться внутреннему компасу.`;
    }

    return res.status(200).json({
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
