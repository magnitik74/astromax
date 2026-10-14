import { globalMemoryStore } from './memoryStore.js';
import { buildAstrologerSystemPrompt } from './astrologerPersona.js';
import { calculateNatalChart } from '../core/astrology.js';
import { drawTarotSpread } from '../core/tarot.js';
import { GroqAIClient } from '../ai/groqClient.js';
import { checkSafetyGuardrails } from '../safety/guardrails.js';

export class ChatEngine {
  constructor(options = {}) {
    this.memory = options.memoryStore || globalMemoryStore;
    this.ai = options.ai || new GroqAIClient();
    this.client = options.botClient;
    this.miniAppUrl = (options.miniAppUrl || process.env.MINI_APP_URL || 'https://astromax-nu.vercel.app').replace(/\/+$/, '');
  }

  /**
   * Построение deep-link URL в Mini App с передачей user_id и name
   */
  getAppUrl(userId, userName = '', extra = {}) {
    const base = this.miniAppUrl.replace(/\/+$/, '');
    const params = new URLSearchParams();
    if (userId) params.set('user_id', String(userId));
    if (userName) params.set('name', userName);
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
    const qs = params.toString();
    return qs ? `${base}/?${qs}` : `${base}/`;
  }

  /**
   * Главный процессор входящего текстового сообщения в чате
   */
  async processIncomingMessage(userId, text, options = {}) {
    const user = this.memory.getUser(userId);
    const trimmed = (text || '').trim();
    const userName = options.userName || '';

    // 1. Команда перезапуска или начала
    if (trimmed.startsWith('/start') || trimmed.toLowerCase() === 'старт') {
      return this.handleStart(userId, userName);
    }

    // 2. Расклад Таро -> Воронка в Mini App
    if (trimmed.startsWith('/tarot') || trimmed.toLowerCase() === 'таро' || trimmed.toLowerCase() === 'карта дня') {
      return this.handleQuickTarot(userId, userName);
    }

    // 3. Проверка на Красные линии (Safety Guardrails: здоровье, диагнозы, экстремизм, суицид)
    const safety = checkSafetyGuardrails(trimmed);
    if (!safety.safe) {
      return { text: safety.response, buttons: [] };
    }

    // 4. Справка -> Воронка в Mini App
    if (trimmed.startsWith('/help') || trimmed.toLowerCase() === 'помощь') {
      return this.handleHelp(userId, userName);
    }

    // 5. Обработка шагов онбординга (если начат в чате)
    if (user.state === 'WAITING_NAME_DATE') {
      return this.handleOnboardingDate(userId, trimmed);
    } else if (user.state === 'WAITING_TIME') {
      return this.handleOnboardingTime(userId, trimmed);
    } else if (user.state === 'WAITING_CITY') {
      return this.handleOnboardingCity(userId, trimmed);
    }

    // 6. Любое сообщение в чате строго перенаправляется в Mini App
    return this.handlePersonalChat(userId, trimmed, { userName });
  }

  /**
   * Шаг 1: Приветствие в боте с единственным действием — открыть Mini App
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

    const namePrefix = userName ? `**${userName}**, привет.` : `**Привет.**`;
    const welcomeText = 
`${namePrefix}

Чувствуешь, что сейчас время важных решений?
Твой космический код готов — загляни, там ответы про отношения, деньги и то, что ждет тебя дальше.`;

    // Строго один конверсионный CTA-переход в Mini App
    const appUrl = this.getAppUrl(userId, userName);

    const buttons = [
      [
        this.client.buildOpenAppButton('✦ Открыть АстроМАХ', appUrl),
      ],
    ];

    return { text: welcomeText, buttons, attachments };
  }

  /**
   * Расклад Таро — направление в интерактивный 3D-расклад в Mini App
   */
  handleQuickTarot(userId, userName = '') {
    const text = 
`🔮 **Храм Таро АстроМАХ**

Интерактивный расклад дня и ответы на волнующие вопросы уже ждут тебя в приложении.

Нажми кнопку ниже, чтобы вытянуть карту:`;

    const buttons = [
      [
        this.client.buildOpenAppButton('✦ Вытянуть карту в приложении', this.getAppUrl(userId, userName)),
      ],
    ];

    return { text, buttons };
  }

  /**
   * Справка по возможностям сервиса
   */
  handleHelp(userId, userName = '') {
    const text = 
`🌌 **АстроМАХ — твой персональный астролог**

Все сервисы работают внутри интерактивного мини-приложения:
• Точный расчет Большой Тройки и натальной карты (эфемериды NASA)
• 3D-расклады карт Таро на день и отношения
• Личные консультации с экспертами (Алёна, Артём, Елена, София)

Нажми кнопку ниже, чтобы открыть АстроМАХ:`;

    const buttons = [
      [
        this.client.buildOpenAppButton('✦ Открыть АстроМАХ', this.getAppUrl(userId, userName)),
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
   * Любой диалог в чате — мягкий, конверсионный мостик в Mini App
   */
  async handlePersonalChat(userId, text, options = {}) {
    const userName = options.userName || '';
    const namePrefix = userName ? `**${userName}**, твой` : `**Твой**`;

    const replyText = 
`✨ ${namePrefix} персональный разбор готов в АстроМАХ.

Планеты и эфемериды NASA уже рассчитали твою матрицу. Загляни в приложение — там подробный анализ ситуации, расчет Большой Тройки и живой диалог с наставником:`;

    const buttons = [
      [
        this.client.buildOpenAppButton('✦ Открыть АстроМАХ', this.getAppUrl(userId, userName)),
      ],
    ];

    return { text: replyText, buttons };
  }
}
