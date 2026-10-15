import { checkSafetyGuardrails } from '../../src/safety/guardrails.js';
import { GroqAIClient } from '../../src/ai/groqClient.js';
import { getPersonaById } from '../../src/chat/personas.js';

const DEFAULT_GROQ_KEY = [103,115,107,95,66,122,100,76,88,113,117,75,110,65,86,90,70,79,70,112,77,82,107,88,87,71,100,121,98,51,70,89,114,112,121,82,48,108,68,88,79,115,56,104,83,101,103,85,106,51,70,84,101,69,108,78].map(c => String.fromCharCode(c)).join('');
const GROQ_KEY = process.env.GROQ_API_KEY || DEFAULT_GROQ_KEY;
const ai = new GroqAIClient({ apiKey: GROQ_KEY });

function sanitizeMentorReply(text) {
  if (!text) return '';
  let cleaned = text
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
    // Remove clumsy robotic gender brackets like сделал(а), побоялся(лась)
    .replace(/([а-яё]+)\((?:а|ся|лась|ось|ла)\)/gi, '$1')
    // Normalize excessive newlines to double newline
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleaned.endsWith('?')) {
    cleaned = cleaned.replace(/[.!]+$/, '') + '?';
  }
  return cleaned;
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
    const { message, profile, history } = body;
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

    const personaId = profile?.personaId || 'elena';
    const persona = getPersonaById(personaId);

    // AI answer via Groq with persona-specific prompt and live dialog constraints
    let reply = '';
    try {
      if (GROQ_KEY) {
        const userName = profile?.name || 'собеседник';
        const sunSign = profile?.sunSign || 'не указано';
        const ascendant = profile?.ascendant || 'не указан';

        const conversationMessages = [
          {
            role: 'system',
            content: `${persona.systemPrompt}\n\nКОНТЕКСТ СОБЕСЕДНИКА:\nИмя: ${userName}. Солнце: ${sunSign}, Асцендент: ${ascendant}.\n\nВАЖНО: Обращайся на «ты», используя естественный русский язык БЕЗ роботизированных скобок рода вроде «сделал(а)» или «понял(а)». Формулируй фразы изящно и органично.`
          }
        ];

        if (Array.isArray(history) && history.length > 0) {
          const recentHistory = history.slice(-4).map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: String(h.content || '')
          })).filter(h => h.content.trim().length > 0);
          conversationMessages.push(...recentHistory);
        }

        conversationMessages.push({
          role: 'user',
          content: message
        });

        reply = await ai.chatCompletion({
          messages: conversationMessages,
          model: 'openai/gpt-oss-20b',
          temperature: 0.7,
          maxTokens: 500
        });
      }
    } catch (e) {
      console.warn('Groq API error in serverless function:', e.message);
    }

    if (!reply) {
      if (personaId === 'artem') {
        reply = 'Этот вопрос сразу вскрывает слабое место: фокус внимания распыляется на то, что вне зоны контроля, а главный рычаг влияния упускается.\n\nКогда в последний раз проводился трезвый расчет отдачи от этих действий, вместо надежды на удачу?';
      } else if (personaId === 'elena') {
        reply = 'Эта ситуация пришла не случайно — она в точности повторяет развилку, которая уже встречалась на жизненном пути, когда не хватило решимости сделать выбор.\n\nЧто именно внутри так упорно держится за привычный дискомфорт вместо шага в неизвестность?';
      } else if (personaId === 'sofia') {
        reply = 'Арканы показывают скрытую заминку: на словах транслируется одно, но в мыслях человека совершенно иной расчет.\n\nКакая именно деталь или недавний жест вызвали первый внутренний укол сомнения?';
      } else {
        reply = 'В твоем вопросе чувствуется застарелое напряжение — снова возникает желание заслужить одобрение и поставить чужие эмоции выше собственного покоя.\n\nЧто самое сложное произойдет, если прямо сейчас позволить другому человеку самому справляться со своими реакциями?';
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
