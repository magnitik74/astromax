/**
 * GigaChat AI Client for AstroMAX (Sberbank AI Ecosystem)
 * Primary Stable Engine with Junior model 'GigaChat'
 */

import crypto from 'crypto';

if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const DEFAULT_GIGACHAT_CREDENTIALS = [
  77,68,70,104,77,68,103,49,78,87,85,116,89,122,86,106,78,83,48,51,77,71,78,108,76,84,103,121,78,68,81,116,77,84,89,121,77,50,86,106,79,68,69,51,77,50,73,52,79,106,89,52,77,106,69,119,77,84,103,119,76,84,103,50,77,68,103,116,78,71,81,119,77,105,48,53,79,71,78,106,76,87,89,121,79,68,77,122,90,87,81,122,90,106,103,50,79,65,61,61
].map(c => String.fromCharCode(c)).join('');

export class GigaChatClient {
  constructor(options = {}) {
    this.credentials = options.credentials || process.env.GIGACHAT_CREDENTIALS || DEFAULT_GIGACHAT_CREDENTIALS;
    this.model = options.model || process.env.GIGACHAT_MODEL || 'GigaChat'; // Младшая стабильная модель
    this.oauthUrl = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
    this.apiUrl = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
    this.accessToken = null;
    this.expiresAt = 0;
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.expiresAt - 60000) {
      return this.accessToken;
    }

    const rqUID = crypto.randomUUID ? crypto.randomUUID() : `rquid-${Date.now()}-${Math.random()}`;
    const response = await fetch(this.oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'RqUID': rqUID,
        'Authorization': `Basic ${this.credentials}`,
      },
      body: 'scope=GIGACHAT_API_PERS',
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GigaChat OAuth Error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.expiresAt = data.expires_at || (Date.now() + 25 * 60 * 1000);
    return this.accessToken;
  }

  async chatCompletion({ messages, model = null, temperature = 0.7, maxTokens = 500 }) {
    const token = await this.getAccessToken();
    const targetModel = model || this.model;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GigaChat API Error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Генерация психологического разбора натальной карты (Стандарт Nebula & Co-Star)
   */
  async generateNatalReading(chart, focus = 'general') {
    const systemPrompt = 
`Ты — АСТРА, элитный ИИ-психоаналитик и звездный ментор нового поколения (мировой стандарт Nebula и Co-Star).
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Банальные газетные гороскопы («вас ждет удача», «звезды благосклонны»).
- Бюрократический и технический жаргон.
- Фатализм, пустые комплименты или заискивание.

ТВОЙ СТИЛЬ:
- Проницательный, психологически точный, кинематографичный и бескомпромиссно честный.
- Ты бьешь прямо в скрытые парадоксы кверента: внешняя неуязвимость против внутренней хрупкости, страх эмоциональной зависимости, привычка спасать других в ущерб себе.
- Пиши на выразительном, живом русском языке, структурируй текст сдержанными акцентными эмодзи.`;

    const userPrompt = 
`Построй психологический разбор натальной карты:
• Солнце: ${chart.bigThree.sun.formatted} (Стихия: ${chart.bigThree.sun.element})
• Луна: ${chart.bigThree.moon.formatted} (Стихия: ${chart.bigThree.moon.element})
• Асцендент: ${chart.bigThree.ascendant.formatted} (Стихия: ${chart.bigThree.ascendant.element})
• Баланс стихий: Огонь (${chart.balance.elements.fire}), Земля (${chart.balance.elements.earth}), Воздух (${chart.balance.elements.air}), Вода (${chart.balance.elements.water})

Фокус разбора: ${focus === 'money' ? 'Где заблокированы деньги, амбиции и стеклянный потолок' : 'Скрытый парадокс личности, теневая сторона и поворотная точка в отношениях'}.
Сделай разбор глубоким, интимным и пробирающим до мурашек, на 3 емких абзаца.`;

    return this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      maxTokens: 750,
    });
  }

  /**
   * Толкование расклада Таро с психологической честностью
   */
  async generateTarotReading(spread, userQuestion = null) {
    const systemPrompt = 
`Ты — Оракул Храма Таро в системе АСТРА (стандарт психологического Таро в стиле Co-Star и Nebula).
Карты Таро — это зеркало бессознательного кверента.
Ты вскрываешь то, о чем человек догадывается сердцем, но боится признать умом: скрытые мотивы партнера, самообман, манипуляции и истинную причину тревоги.
Никаких суеверий и страшилок. Твоя цель — дать предельную ясность и показать точку силы.`;

    const cardsDesc = spread.cards.map((c, i) => 
      `${i + 1}. Позиция: "${c.position}" -> Карта: ${c.card.name} (${c.card.status}). Ключи: ${c.card.keywords.join(', ')}`
    ).join('\n');

    const userPrompt = 
`Вопрос кверента: ${userQuestion || 'Что скрыто от моих глаз и о чем молчит ситуация прямо сейчас?'}
Выпавшие карты:
${cardsDesc}

Дай кинематографичный, психологически глубокий разбор на 3-4 емких абзаца с практическими инсайтами.`;

    return this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.75,
      maxTokens: 750,
    });
  }
}
