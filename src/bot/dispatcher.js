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

    let userId = null;
    let text = '';
    let callbackPayload = null;
    let callbackId = null;

    let userName = '';

    // 1. Событие старта бота в Max Messenger
    if (update.update_type === 'bot_started') {
      userId = update.user?.user_id || update.chat_id;
      userName = update.user?.first_name || '';
      text = '/start';
    } 
    // 2. Новое входящее сообщение
    else if (update.update_type === 'message_created') {
      userId = update.message?.sender?.user_id || update.message?.recipient?.chat_id;
      userName = update.message?.sender?.first_name || '';
      text = update.message?.body?.text || update.message?.text || '';
    } 
    // 3. Нажатие интерактивной кнопки
    else if (update.update_type === 'message_callback') {
      userId = update.callback?.user?.user_id || update.message?.sender?.user_id || update.message?.recipient?.chat_id;
      userName = update.callback?.user?.first_name || '';
      callbackPayload = update.callback?.payload;
      callbackId = update.callback?.callback_id;
    } 
    // 4. Универсальный формат / тестовые вебхуки
    else {
      const message = update.message || update;
      userId = message.chat_id || message.from?.id || message.sender?.user_id || update.chat_id || update.user_id;
      userName = message.from?.first_name || message.sender?.first_name || '';
      text = (message.text || message.body?.text || '').trim();
      callbackPayload = update.callback?.payload;
      callbackId = update.callback?.callback_id;
    }

    if (!userId) return null;

    // Обработка callback-кнопки
    if (callbackPayload) {
      if (callbackId && typeof this.client?.answerCallback === 'function') {
        try {
          await this.client.answerCallback(callbackId);
        } catch (e) {
          // Игнорируем ошибку ответа на callback если истек таймаут
        }
      }
      return this.handleCallback(userId, callbackPayload, userName);
    }

    // Делегирование ChatEngine (Строгая воронка в Mini App)
    const result = await this.chatEngine.processIncomingMessage(userId, text, { userName });
    if (result) {
      return this.client.sendMessage(userId, result.text, { 
        buttons: result.buttons,
        attachments: result.attachments,
      });
    }

    return null;
  }

  async handleCallback(userId, payload, userName = '') {
    const appUrl = `${this.miniAppUrl}/?user_id=${encodeURIComponent(userId)}${userName ? `&name=${encodeURIComponent(userName)}` : ''}`;

    if (payload === 'ACTION_TAROT_DAILY') {
      const text = 
`🔮 **Храм Таро АстроМАХ**

Здесь нет банальных прогнозов. Карты Таро вытаскивают наружу то, что ты уже знаешь сердцем, но пока боишься признать умом.

Нажми кнопку ниже, чтобы вытянуть карту:`;

      const buttons = [
        [
          this.client.buildOpenAppButton('✦ Вытянуть карту в приложении', appUrl),
        ],
      ];
      return this.client.sendMessage(userId, text, { buttons });
    }

    if (payload === 'ACTION_PREMIUM_INFO') {
      const text = 
`💎 **Премиум Клуб АстроМАХ**

Личный наставник 24/7, глубокий синастрия-анализ отношений и персональный разбор каждого дня без ограничений:`;

      const buttons = [
        [
          this.client.buildOpenAppButton('✦ Открыть АстроМАХ', appUrl),
        ],
      ];
      return this.client.sendMessage(userId, text, { buttons });
    }

    const text = 
`✨ **Твой персональный разбор ждет в АстроМАХ**

Вскроем то, о чем ты молчишь: отношения, скрытые мотивы партнера и ключевые точки роста. Переходи в приложение:`;

    const buttons = [
      [
        this.client.buildOpenAppButton('✦ Открыть АстроМАХ', appUrl),
      ],
    ];
    return this.client.sendMessage(userId, text, { buttons });
  }
}
