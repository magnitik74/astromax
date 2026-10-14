/**
 * Groq AI Client for AstroMAX
 * Endpoint: https://api.groq.com/openai/v1/chat/completions
 */

export class GroqAIClient {
  constructor(options = {}) {
    this.apiKey = options.apiKey || process.env.GROQ_API_KEY;
    this.modelFast = options.modelFast || process.env.GROQ_MODEL_FAST || 'openai/gpt-oss-20b';
    this.modelSmart = options.modelSmart || process.env.GROQ_MODEL_SMART || 'openai/gpt-oss-120b';
    this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  async chatCompletion({ messages, model = null, temperature = 0.7, maxTokens = 1000 }) {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not defined');
    }

    const targetModel = model || this.modelSmart;

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
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
      throw new Error(`Groq API Error [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Генерация глубокого психологического разбора натальной карты
   */
  async generateNatalReading(chart, focus = 'general') {
    const systemPrompt = 
`Ты — АстроМАХ, элитный ИИ-астролог и юнгианский психоаналитик нового поколения.
Твой стиль: глубокий, проникновенный, благородный, поддерживающий и точный.
Ты НЕ сыплешь банальными газетными гороскопами. Ты говоришь на языке зрелой психологии, архетипов и энергии планет.
Ты снимаешь тревогу, возвращаешь человеку веру в себя и даешь четкие жизненные ориентиры.
Пиши на прекрасном русском языке, структурируй текст с красивыми эмодзи.`;

    const userPrompt = 
`Построй психологический разбор натальной карты:
• Солнце: ${chart.bigThree.sun.formatted} (Стихия: ${chart.bigThree.sun.element})
• Луна: ${chart.bigThree.moon.formatted} (Стихия: ${chart.bigThree.moon.element})
• Асцендент: ${chart.bigThree.ascendant.formatted} (Стихия: ${chart.bigThree.ascendant.element})
• Баланс стихий: Огонь (${chart.balance.elements.fire}), Земля (${chart.balance.elements.earth}), Воздух (${chart.balance.elements.air}), Вода (${chart.balance.elements.water})

Фокус разбора: ${focus === 'money' ? 'Где заблокированы деньги и масштабирование' : 'Ядро личности, предназначение и теневая сторона'}.
Сделай разбор живым, глубоким и пробирающим до мурашек, на 3-4 абзаца.`;

    return this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: this.modelSmart,
      temperature: 0.75,
    });
  }

  /**
   * Толкование расклада Таро с живым эмоциональным попаданием
   */
  async generateTarotReading(spread, userQuestion = null) {
    const systemPrompt = 
`Ты — Оракул Храма Таро в системе АстроМАХ.
Ты расшифровываешь символизм карт Таро через призму глубинной интуиции, кармических уроков и практического совета.
Никакого фатализма и страха. Твоя задача — подсветить слепые зоны и показать точку силы.`;

    const cardsDesc = spread.cards.map((c, i) => 
      `${i + 1}. Позиция: "${c.position}" -> Карта: ${c.card.name} (${c.card.status}). Ключи: ${c.card.keywords.join(', ')}`
    ).join('\n');

    const userPrompt = 
`Вопрос кверента: ${userQuestion || 'Общий совет Вселенной на текущий жизненный этап'}
Выпавшие карты:
${cardsDesc}

Дай цельное толкование расклада: свяжи карты в единую историю Прошлого, Настоящего и Будущего. Дай четкий совет дня.`;

    return this.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: this.modelSmart,
      temperature: 0.7,
    });
  }
}
