import { checkSafetyGuardrails } from '../../src/safety/guardrails.js';
import { GroqAIClient } from '../../src/ai/groqClient.js';
import { getPersonaById } from '../../src/chat/personas.js';

const ai = new GroqAIClient();

function sanitizeMentorReply(text) {
  if (!text) return '';
  return text
    // Remove markdown headers
    .replace(/^#+\s+/gm, '')
    // Remove bold/italic markdown
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove list dashes, bullets, numbered lists
    .replace(/^[\s-•*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    // Normalize excessive newlines to double newline
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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

    // AI answer via Groq with persona-specific prompt and live dialog constraints
    let reply = '';
    try {
      if (process.env.GROQ_API_KEY) {
        const userName = profile?.name || 'собеседник';
        const sunSign = profile?.sunSign || 'не указано';
        const ascendant = profile?.ascendant || 'не указан';

        reply = await ai.chatCompletion({
          messages: [
            {
              role: 'system',
              content: `${persona.systemPrompt}\n\nКОНТЕКСТ СОБЕСЕДНИКА:\nИмя: ${userName}. Солнце: ${sunSign}, Асцендент: ${ascendant}.`
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.7,
          maxTokens: 280
        });
      }
    } catch (e) {
      console.warn('Groq API error in serverless function:', e.message);
    }

    if (!reply) {
      if (personaId === 'artem') {
        reply = 'Твой вопрос сразу вскрывает слабое место: ты распыляешь фокус на то, чем не управляешь, и упускаешь главный рычаг влияния.\n\nКогда ты в последний раз трезво считал(а) отдачу от этих действий, вместо того чтобы надеяться на удачу?';
      } else if (personaId === 'elena') {
        reply = 'Эта ситуация пришла не случайно — она в точности повторяет развилку, которую ты уже проходил(а) раньше, но побоялся(лась) сделать выбор.\n\nЧто именно внутри тебя так упорно держится за привычный дискомфорт вместо шага вперед?';
      } else if (personaId === 'sofia') {
        reply = 'Арканы показывают скрытую заминку: человек на той стороне говорит одно, но в мыслях у него совершенно иной расчет.\n\nКакой именно его жест или поступок вызвал у тебя первый внутренний укол сомнения?';
      } else {
        reply = 'В твоем вопросе чувствуется застарелое напряжение — ты снова пытаешься заслужить одобрение и ставишь чужие эмоции выше своего покоя.\n\nЧто самого страшного случится, если ты прямо сейчас позволишь другому человеку самому справляться со своими реакциями?';
      }
    }

    reply = sanitizeMentorReply(reply);

    return res.status(200).json({
      reply,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
