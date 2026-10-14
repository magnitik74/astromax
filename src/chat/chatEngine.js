import { globalMemoryStore } from './memoryStore.js';
import { buildAstrologerSystemPrompt } from './astrologerPersona.js';
import { calculateNatalChart } from '../core/astrology.js';
import { drawTarotSpread } from '../core/tarot.js';
import { GroqAIClient } from '../ai/groqClient.js';

export class ChatEngine {
  constructor(options = {}) {
    this.memory = options.memoryStore || globalMemoryStore;
    this.ai = options.ai || new GroqAIClient();
    this.client = options.botClient;
    this.miniAppUrl = options.miniAppUrl || process.env.MINI_APP_URL || 'https://astromax.app';
  }

  /**
   * Главный процессор входящего текстового сообщения в чате
   */
  async processIncomingMessage(userId, text, options = {}) {
    const user = this.memory.getUser(userId);
    const trimmed = (text || '').trim();

    // 1. Команда перезапуска или начала
    if (trimmed.startsWith('/start') || trimmed.toLowerCase() === 'старт') {
      return this.handleStart(userId, options.userName || '');
    }

    // 2. Быстрый расклад Таро
    if (trimmed.startsWith('/tarot') || trimmed.toLowerCase() === 'таро' || trimmed.toLowerCase() === 'карта дня') {
      return this.handleQuickTarot(userId);
    }

    // 3. Справка
    if (trimmed.startsWith('/help') || trimmed.toLowerCase() === 'помощь') {
      return this.handleHelp(userId);
    }

    // 4. Обработка шагов онбординга (если начат в чате)
    if (user.state === 'WAITING_NAME_DATE') {
      return this.handleOnboardingDate(userId, trimmed);
    } else if (user.state === 'WAITING_TIME') {
      return this.handleOnboardingTime(userId, trimmed);
    } else if (user.state === 'WAITING_CITY') {
      return this.handleOnboardingCity(userId, trimmed);
    }

    // 5. Режим «Личный ИИ-Астролог 24/7» (Прямой диалог)
    return this.handlePersonalChat(userId, trimmed);
  }

  /**
   * Шаг 1: Приветствие в боте с приглашением в Mini App
   */
  async handleStart(userId, userName = '') {
    this.memory.setState(userId, 'IDLE');

    let attachments = null;
    if (this.client?.getBannerAttachment) {
      try {
        attachments = await this.client.getBannerAttachment();
      } catch (err) {
        console.warn('[ChatEngine] Не удалось прикрепить баннер:', err.message);
      }
    }

    const nameGreeting = userName ? `, ${userName}` : '';
    const welcomeText = 
`✨ **Добро пожаловать в АстроМАХ${nameGreeting}!** 🌌

Я — твой персональный ИИ-астролог прямо в переписке.
Помогу раскрыть твой космический код, снять тревогу перед важными решениями и найти ответы в звездах и картах Таро.

🪐 **Твой Космический Паспорт готов:**
Открой приложение, чтобы за 60 секунд узнать свою Большую Тройку (Солнце, Луну, Асцендент) и раскрыть парадокс своей личности.`;

    // Deep link с передачей параметров сессии
    const appUrl = `${this.miniAppUrl}${this.miniAppUrl.includes('?') ? '&' : '?'}user_id=${encodeURIComponent(userId)}${userName ? `&name=${encodeURIComponent(userName)}` : ''}`;

    const buttons = [
      [
        this.client.buildOpenAppButton('🪐 Открыть АстроМАХ', appUrl),
      ],
      [
        this.client.buildCallbackButton('🃏 Карта дня в чате', 'ACTION_TAROT_DAILY'),
      ],
    ];

    return { text: welcomeText, buttons, attachments };
  }

  /**
   * Быстрый расклад Таро (Карта Дня)
   */
  handleQuickTarot(userId) {
    const spread = drawTarotSpread({ type: 'daily' });
    const card = spread.cards[0].card;
    const text = 
`🃏 **Твоя Карта Дня: ${card.name}** (${card.status})
*Стихия: ${card.element} | Ключи: ${card.keywords.join(', ')}*

🔮 **Послание Вселенной на сегодня:**
${card.interpretation}

⚡ *Совет:* Прислушайся к своей внутренней мудрости прямо сейчас.`;

    const buttons = [
      [
        this.client.buildOpenAppButton('🔮 Открыть Храм Таро на 3 карты', `${this.miniAppUrl}/tarot`),
      ],
      [
        this.client.buildCallbackButton('🔄 Другой вопрос', 'ACTION_TAROT_DAILY'),
      ],
    ];

    return { text, buttons };
  }

  /**
   * Справка по возможностям бота
   */
  handleHelp(userId) {
    const text = 
`✨ **Возможности АстроМАХ:** 🌌

1. 🪐 **Личный ИИ-Астролог 24/7:** Задавай любые вопросы прямо в чат — про отношения, карьеру, страхи, финансы.
2. 📅 **Расчет натальной карты:** Введи дату, время и город рождения для построения Большой Тройки (Солнце, Луна, Асцендент).
3. 🃏 **Храм Таро:** Отправь команду /tarot или открой интерактивный Mini App.
4. 📱 **Mini App:** Визуальное колесо зодиака, 3D анимации и глубокие астро-разборы.

Команды:
• /start — Перезапустить онбординг
• /tarot — Вытянуть Карту Дня
• /help — Это справочное меню`;

    const buttons = [
      [
        this.client.buildOpenAppButton('🪐 Открыть Mini App', this.miniAppUrl),
      ],
    ];
    return { text, buttons };
  }

  /**
   * Шаг 2: Обработка даты рождения
   */
  async handleOnboardingDate(userId, text) {
    // Извлечение даты ДД.ММ.ГГГГ или ГГГГ-ММ-ДД
    const dateMatch = text.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/) || text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);

    let birthDate = '1995-10-25';
    let name = '';

    if (dateMatch) {
      if (dateMatch[1].length === 4) {
        birthDate = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
      } else {
        birthDate = `${dateMatch[3]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[1]).padStart(2, '0')}`;
      }
      name = text.replace(dateMatch[0], '').replace(/[,.-]/g, '').trim();
    } else {
      name = text.trim();
    }

    this.memory.updateProfile(userId, { name: name || 'Путник', birthDate });
    this.memory.setState(userId, 'WAITING_TIME');

    const replyText = 
`Принято, ${name || 'друг'}! Твоя дата рождения: **${birthDate}**. 📅

⏰ **Шаг 2 из 3: Время рождения**
Если знаешь точное время (по бирке) — напиши его (например, *14:30*).
Если не помнишь — нажми кнопку ниже:`;

    const buttons = [
      [
        this.client.buildCallbackButton('☀️ 12:00 (Не знаю точное время)', 'SET_TIME_1200'),
      ],
    ];

    return { text: replyText, buttons };
  }

  /**
   * Шаг 3: Обработка времени рождения
   */
  async handleOnboardingTime(userId, text) {
    let birthTime = '12:00';
    const timeMatch = text.match(/(\d{1,2})[:.-](\d{2})/);
    if (timeMatch) {
      birthTime = `${String(timeMatch[1]).padStart(2, '0')}:${timeMatch[2]}`;
    }

    this.memory.updateProfile(userId, { birthTime });
    this.memory.setState(userId, 'WAITING_CITY');

    const replyText = 
`Время зафиксировано: **${birthTime}**. ⏱️

📍 **Шаг 3 из 3: Город рождения**
Напиши город твоего рождения (нужен для точных астрономических координат и сетки домов):`;

    const buttons = [
      [
        this.client.buildCallbackButton('🏛️ Москва', 'SET_CITY_MOSCOW'),
        this.client.buildCallbackButton('🏛️ Санкт-Петербург', 'SET_CITY_SPB'),
      ],
    ];

    return { text: replyText, buttons };
  }

  /**
   * Шаг 4: Город -> Финальный расчет и Активация 24/7
   */
  async handleOnboardingCity(userId, text) {
    const city = text.trim() || 'Москва';
    this.memory.updateProfile(userId, { city });
    const user = this.memory.getUser(userId);

    // Расчет натальной карты по точным эфемеридам
    const chart = calculateNatalChart({
      birthDate: user.profile.birthDate || '1995-10-25',
      birthTime: user.profile.birthTime || '12:00',
      lat: user.profile.lat,
      lon: user.profile.lon,
      timezoneOffset: user.profile.timezoneOffset,
    });
    this.memory.setNatalChart(userId, chart);
    this.memory.setState(userId, 'READY');

    // Генерация первого глубокого инсайта через Groq 120B
    let aiInsight = '';
    try {
      aiInsight = await this.ai.generateNatalReading(chart, 'general');
    } catch (e) {
      aiInsight = `Ты рожден(а) под мощным созвездием ${chart.bigThree.sun.sign}. Твоя глубинная сила — в мудрости, интуиции и умении преодолевать любые штормы.`;
    }

    const replyText = 
`🌌 **Твой Космический Паспорт готов!** 🪐

✨ **Твоя Большая Тройка:**
• **Солнце:** ${chart.bigThree.sun.formatted} (Ядро личности, сознание)
• **Луна:** ${chart.bigThree.moon.formatted} (Подсознание, эмоции и покой)
• **Асцендент:** ${chart.bigThree.ascendant.formatted} (Маска личности, социальный код)

🔮 **Персональный анализ от АстроМАХ:**
${aiInsight}

---
💬 **Личный ИИ-Астролог активирован 24/7!**
Ты можешь написать мне в любой момент любой вопрос: про отношения, карьеру, тревогу или попросить расклад Таро. Что тебя волнует прямо сейчас?`;

    const buttons = [
      [
        this.client.buildOpenAppButton('🪐 Открыть 3D Колесо Натал в Mini App', this.miniAppUrl),
      ],
      [
        this.client.buildCallbackButton('💔 Что в отношениях?', 'PROMPT_RELATIONSHIPS'),
        this.client.buildCallbackButton('💰 Где мои деньги?', 'PROMPT_MONEY'),
      ],
      [
        this.client.buildCallbackButton('🃏 Карта Таро дня', 'ACTION_TAROT_DAILY'),
      ],
    ];

    return { text: replyText, buttons };
  }

  /**
   * Диалог 24/7: Персональный контекстный астролог
   */
  async handlePersonalChat(userId, text) {
    const user = this.memory.getUser(userId);
    this.memory.addMessage(userId, 'user', text);

    const systemPrompt = buildAstrologerSystemPrompt(user);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...user.history.map(h => ({ role: h.role, content: h.content })),
    ];

    let aiReply = '';
    try {
      aiReply = await this.ai.chatCompletion({
        messages,
        model: this.ai.modelSmart, // Флагманская модель 120B
        temperature: 0.72,
        maxTokens: 600,
      });
    } catch (err) {
      aiReply = `Я рядом, ${user.profile.name || 'друг'}. Твоя натальная карта показывает временное напряжение аспектов планет. Позволь себе глубокий вдох. Что именно сейчас тебя беспокоит?`;
    }

    this.memory.addMessage(userId, 'assistant', aiReply);

    const buttons = [
      [
        this.client.buildOpenAppButton('🪐 Открыть АстроМАХ Mini App', this.miniAppUrl),
      ],
      [
        this.client.buildCallbackButton('🃏 Вытянуть карту на ситуацию', 'ACTION_TAROT_DAILY'),
      ],
    ];

    return { text: aiReply, buttons };
  }
}
