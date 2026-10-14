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
   * Генерация глубокого психологического разбора натальной карты (Стандарт Nebula & Co-Star)
   */
  async generateNatalReading(chart, focus = 'general') {
    const systemPrompt = 
`Ты — АСТРА, элитный ИИ-психоаналитик и звездный ментор нового поколения (мировой стандарт Nebula и Co-Star).
КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:
- Банальные газетные гороскопы («вас ждет удача», «звезды благосклонны»).
- Бюрократический и технический жаргон («эфемериды NASA», «согласно координатам»).
- Фатализм, пустые комплименты или заискивание.

ТВОЙ СТИЛЬ:
- Проницательный, психологически точный, кинематографичный и бескомпромиссно честный.
- Ты бьешь прямо в скрытые парадоксы кверента: внешняя неуязвимость против внутренней хрупкости, синдром самозванца, страх эмоциональной зависимости, привычка спасать других в ущерб себе.
- Ты соединяешь архетипы планет с глубинной юнгианской психологией.
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
      model: this.modelSmart,
      temperature: 0.75,
    });
  }

  /**
   * Толкование расклада Таро с психологической честностью (Стиль Co-Star)
   */
  async generateTarotReading(spread, userQuestion = null) {
    const systemPrompt = 
`Ты — Оракул Храма Таро в системе АСТРА (стандарт психологического Таро в стиле Co-Star и Nebula).
Карты Таро — это не слепое предсказание будущего, а зеркало бессознательного кверента.
Ты вскрываешь то, о чем человек догадывается сердцем, но боится признать умом: скрытые мотивы партнера, самообман, манипуляции и истинную причину тревоги.
Никаких суеверий и страшилок. Твоя цель — дать предельную ясность и показать точку силы.`;

    const cardsDesc = spread.cards.map((c, i) => 
      `${i + 1}. Позиция: "${c.position}" -> Карта: ${c.card.name} (${c.card.status}). Ключи: ${c.card.keywords.join(', ')}`
    ).join('\n');

    const userPrompt = 
`Вопрос кверента: ${userQuestion || 'Что скрыто от моих глаз и о чем молчит ситуация прямо сейчас?'}
Выпавшие карты:
${cardsDesc}

Дай глубокое, кинематографичное толкование: свяжи выпавшие арканы в единую историю скрытых мотивов и дай один бескомпромиссно честный совет.`;

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
