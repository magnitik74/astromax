import { checkSafetyGuardrails } from '../../src/safety/guardrails.js';
import { GigaChatClient } from '../../src/ai/gigaChatClient.js';
import { GroqAIClient } from '../../src/ai/groqClient.js';
import { getPersonaById } from '../../src/chat/personas.js';

const giga = new GigaChatClient();
const groq = new GroqAIClient();

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

    // AI answer via GigaChat (primary junior model) with Groq failover
    let reply = '';
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

    // 1. Попытка через GigaChat (младшая модель GigaChat от Сбера)
    try {
      reply = await giga.chatCompletion({
        messages: conversationMessages,
        model: 'GigaChat',
        temperature: 0.7,
        maxTokens: 500
      });
    } catch (gigaErr) {
      console.warn('[API /api/chat/ask] GigaChat error, trying Groq fallback:', gigaErr.message);
      // 2. Резервный шлюз Groq
      try {
        reply = await groq.chatCompletion({
          messages: conversationMessages,
          model: 'openai/gpt-oss-20b',
          temperature: 0.7,
          maxTokens: 500
        });
      } catch (groqErr) {
        console.warn('[API /api/chat/ask] Groq fallback error:', groqErr.message);
      }
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
