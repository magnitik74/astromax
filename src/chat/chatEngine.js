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
    return qs ? `${base}/index.html?${qs}` : `${base}/index.html`;
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

    // 2. Команда полного сброса сессии и запуска с чистого листа
    if (
      trimmed.startsWith('/reset') || 
      trimmed.startsWith('/restart') || 
      trimmed.toLowerCase() === 'сброс' || 
      trimmed.toLowerCase() === 'рестарт' || 
      trimmed.toLowerCase() === 'restart' || 
      trimmed.toLowerCase() === 'заново' || 
      trimmed.toLowerCase() === 'перезапуск'
    ) {
      return this.handleReset(userId, userName);
    }

    // 3. Расклад Таро -> Воронка в Mini App
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
   * Шаг 1: Приветствие в боте с единственным действием — открыть Mini App (Стиль Co-Star / Nebula)
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

    const cleanName = (userName || '').trim();
    const greeting = cleanName ? `Привет, **${cleanName}**!` : `Привет! Рады тебе.`;

    const welcomeText = 
`✨ ${greeting} Я **АСТРА** — твой личный помощник 24/7.

Твоя натальная карта и личные помощники ждут тебя внутри.

👇 **Нажми синюю кнопку «✦ Открыть» внизу слева** (рядом со строкой ввода), чтобы запустить приложение.`;

    return { text: welcomeText, buttons: [], attachments };
  }

  /**
   * Сброс сессии пользователя и выдача ссылки на перезапуск онбординга
   */
  async handleReset(userId, userName = '') {
    if (this.memory?.users?.has(String(userId))) {
      this.memory.users.delete(String(userId));
    }

    const text = 
`🔄 **Сессия сброшена**

Все предыдущие расчеты очищены. Чтобы пройти опрос заново:

1. Нажми кнопку «✦ Открыть» внизу слева экрана.
2. Во вкладке «Карта» нажми кнопку «↺ Начать заново», чтобы запустить опрос с чистого листа.`;

    return { text, buttons: [] };
  }

  /**
   * Расклад Таро — направление в интерактивный 3D-расклад в Mini App
   */
  handleQuickTarot(userId, userName = '') {
    const text = 
`🔮 **Храм Таро АСТРА**

Здесь нет банальных прогнозов. Карты Таро помогают бережно взглянуть на то, что ты уже чувствуешь сердцем, но пока не можешь сформулировать.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы войти в Храм Таро и вытянуть свою карту.`;

    return { text, buttons: [] };
  }

  /**
   * Справка по возможностям сервиса
   */
  handleHelp(userId, userName = '') {
    const text = 
`🌌 **АСТРА — твой личный помощник 24/7**

Все расчеты и заботливые подсказки ждут тебя внутри удобного приложения:
• Твоя натальная карта и сильные стороны личности (Солнце, Луна, Асцендент)
• Наглядные расклады Таро на волнующие вопросы
• Тёплый диалог с личными помощниками (Алёна, Артём, Елена, София)

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы запустить приложение.`;

    return { text, buttons: [] };
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

📍 **Шаг 3 из 3: Место рождения**
Напиши город, посёлок или село твоего рождения (это раскроет твою истинную карту домов и сферу денег):`;

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

    // Глубокий расчет натальной карты
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
      aiInsight = `Твой знак рождения — мощное созвездие ${chart.bigThree.sun.sign}. Твой скрытый парадокс — в сочетании внешней неуязвимости и предельной душевной чуткости.`;
    }

    const replyText = 
`🌌 **Твоя натальная карта готова!** 🪐

✨ **Твоя Большая Тройка:**
• **Солнце:** ${chart.bigThree.sun.formatted} (Ядро личности, воля и характер)
• **Луна:** ${chart.bigThree.moon.formatted} (Подсознание, эмоции и душевный покой)
• **Асцендент:** ${chart.bigThree.ascendant.formatted} (Внешний образ, первое впечатление)

🔮 **Персональный анализ от АСТРА:**
${aiInsight}

---
💬 **Личный помощник на связи 24/7!**
Ты можешь задать мне любой вопрос: про отношения, работу, душевное спокойствие или вытянуть карту Таро. Что тебя сейчас волнует?`;

    const buttons = [
      [
        this.client.buildOpenAppButton('✦ Открыть АСТРА', this.getAppUrl(userId, user.profile?.name)),
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
   * Любой диалог в чате — глубокий психологический мостик в Mini App (Стиль Nebula / Co-Star)
   */
  async handlePersonalChat(userId, text, options = {}) {
    const rawName = (options.userName || '').trim();
    const greeting = rawName ? `Привет, **${rawName}**! ` : `Привет! `;

    const replyText = 
`🔮 ${greeting}Твой расчет и личный помощник ждут тебя внутри АСТРА.

В чате мессенджера диалог не ведется — все персональные консультации, натальная карта и расклады Таро проходят в защищенном приложении.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы войти и разобрать свой вопрос.`;

    return { text: replyText, buttons: [] };
  }
}
