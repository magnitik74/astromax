import { drawTarotSpread } from '../core/tarot.js';
import { GroqAIClient } from '../ai/groqClient.js';
import { ChatEngine } from '../chat/chatEngine.js';

export class BotDispatcher {
  constructor(client, options = {}) {
    this.client = client;
    this.miniAppUrl = (options.miniAppUrl || process.env.MINI_APP_URL || 'https://astromax-nu.vercel.app').replace(/\/+$/, '');
    this.ai = options.ai || new GroqAIClient();
    this.chatEngine = new ChatEngine({
      botClient: this.client,
      ai: this.ai,
      miniAppUrl: this.miniAppUrl,
    });
  }

  /**
   * Главный роутер событий Max Messenger
   * Поддерживает:
   * 1. update_type: 'bot_started'
   * 2. update_type: 'message_created'
   * 3. update_type: 'message_callback'
   * 4. Синтетические/тестовые payload вида { message: { chat_id, text } }
   */
  async handleUpdate(update) {
    if (!update) return null;

    // Игнорируем события остановки бота или удаления диалога
    if (update.update_type === 'bot_stopped' || update.update_type === 'dialog_removed') {
      console.log(`[BotDispatcher] Диалог завершен пользователем (${update.update_type})`);
      return null;
    }

    // Защита от бесконечного цикла: игнорируем сообщения от самого бота
    if (update.message?.sender?.is_bot) {
      return null;
    }

    let userId = null;
    let chatId = null;
    let text = '';
    let callbackPayload = null;
    let callbackId = null;
    let userName = '';

    // 1. Событие старта бота в Max Messenger
    if (update.update_type === 'bot_started') {
      userId = update.user?.user_id || update.user_id || null;
      chatId = update.chat_id || null;
      userName = update.user?.first_name || '';
      text = '/start';
    } 
    // 2. Новое входящее сообщение
    else if (update.update_type === 'message_created') {
      userId = update.message?.sender?.user_id || null;
      chatId = update.message?.recipient?.chat_id || update.chat_id || null;
      userName = update.message?.sender?.first_name || '';
      text = update.message?.body?.text || update.message?.text || '';
    } 
    // 3. Нажатие интерактивной кнопки
    else if (update.update_type === 'message_callback') {
      userId = update.callback?.user?.user_id || update.message?.sender?.user_id || null;
      chatId = update.message?.recipient?.chat_id || update.chat_id || null;
      userName = update.callback?.user?.first_name || '';
      callbackPayload = update.callback?.payload;
      callbackId = update.callback?.callback_id;
    } 
    // 4. Универсальный формат / тестовые вебхуки
    else {
      const message = update.message || update;
      userId = message.from?.id || message.sender?.user_id || message.user_id || update.user_id || null;
      chatId = message.chat_id || message.recipient?.chat_id || update.chat_id || null;
      userName = message.from?.first_name || message.sender?.first_name || '';
      text = (message.text || message.body?.text || '').trim();
      callbackPayload = update.callback?.payload;
      callbackId = update.callback?.callback_id;
    }

    if (!userId && !chatId) return null;

    // Определяем правильного адресата (передаем оба идентификатора для отказоустойчивой отправки)
    const recipientTarget = {
      chat_id: chatId || null,
      user_id: userId || null,
    };

    console.log(`[BotDispatcher] Входящее событие [${update.update_type || 'msg'}] от ${userName || userId} (chatId: ${chatId}): "${text}"`);

    // Обработка callback-кнопки
    if (callbackPayload) {
      if (callbackId && typeof this.client?.answerCallback === 'function') {
        try {
          await this.client.answerCallback(callbackId);
        } catch (e) {
          // Игнорируем ошибку ответа на callback если истек таймаут
        }
      }
      return this.handleCallback(recipientTarget, callbackPayload, userName, userId);
    }

    // Делегирование ChatEngine (Строгая воронка в Mini App)
    const result = await this.chatEngine.processIncomingMessage(userId, text, { userName });
    if (result) {
      const sendRes = await this.client.sendMessage(recipientTarget, result.text, { 
        buttons: result.buttons,
        attachments: result.attachments,
      });
      console.log(`[BotDispatcher] Ответ успешно отправлен адресату:`, recipientTarget);
      return sendRes;
    }

    return null;
  }

  async handleCallback(target, payload, userName = '', rawUserId = null) {
    if (payload === 'TOPIC_RELATIONSHIPS') {
      const text = 
`💔 **Отношения & Любовь**

Астропсихолог **Алёна Смирнова** подготовила синастрию и разбор динамики чувств внутри приложения.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы войти в диалог с Алёной.`;
      return this.client.sendMessage(target, text, { buttons: [] });
    }

    if (payload === 'TOPIC_MONEY') {
      const text = 
`💰 **Деньги & Карьера**

Бизнес-стратег **Артём Соколов** подготовил финансовую матрицу и разбор точек роста внутри приложения.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы открыть разбор с Артёмом.`;
      return this.client.sendMessage(target, text, { buttons: [] });
    }

    if (payload === 'TOPIC_BIG_THREE') {
      const text = 
`🪐 **Моя Большая Тройка • Архитектура твоей личности**

Твой Космический Паспорт (Солнце, Луна, Асцендент) рассчитан и готов к изучению.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы открыть свой паспорт.`;
      return this.client.sendMessage(target, text, { buttons: [] });
    }

    if (payload === 'ACTION_TAROT_DAILY' || payload === 'TOPIC_TAROT') {
      const text = 
`🔮 **Храм Таро АСТРА • Карта Дня**

Здесь нет банальных прогнозов. Карты Таро вытаскивают наружу то, что ты уже знаешь сердцем, но пока боишься признать умом.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы войти в Храм Таро и вытянуть свой аркан.`;
      return this.client.sendMessage(target, text, { buttons: [] });
    }

    if (payload === 'ACTION_PREMIUM_INFO') {
      const text = 
`💎 **Премиум Клуб АСТРА**

Личный наставник 24/7, глубокий синастрия-анализ отношений и персональный разбор каждого дня без ограничений.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы запустить приложение.`;
      return this.client.sendMessage(target, text, { buttons: [] });
    }

    const text = 
`✨ **Твой персональный расчет ждет в АСТРА**

Вскроем то, о чем ты молчишь: отношения, скрытые мотивы партнера и ключевые точки роста.

👇 **Нажми кнопку «✦ Открыть» внизу слева экрана**, чтобы войти в приложение.`;

    return this.client.sendMessage(target, text, { buttons: [] });
  }
}

