import { drawTarotSpread } from '../core/tarot.js';
import { GroqAIClient } from '../ai/groqClient.js';
import { ChatEngine } from '../chat/chatEngine.js';

export class BotDispatcher {
  constructor(client, options = {}) {
    this.client = client;
    this.miniAppUrl = options.miniAppUrl || process.env.MINI_APP_URL || 'https://astromax.app';
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
      return this.handleCallback(userId, callbackPayload);
    }

    // Делегирование ChatEngine (Онбординг + Личный астролог 24/7)
    const result = await this.chatEngine.processIncomingMessage(userId, text, { userName });
    if (result) {
      return this.client.sendMessage(userId, result.text, { 
        buttons: result.buttons,
        attachments: result.attachments,
      });
    }

    return null;
  }

  async handleCallback(userId, payload) {
    if (payload === 'ACTION_TAROT_DAILY') {
      const spread = drawTarotSpread({ type: 'daily' });
      const card = spread.cards[0].card;
      const text = 
`🃏 **Твоя Карта Дня: ${card.name}** (${card.status})
*Стихия: ${card.element} | Ключи: ${card.keywords.join(', ')}*

🔮 **Послание Вселенной на сегодня:**
${card.interpretation}

⚡ *Совет дня:* Прислушайся к своей интуиции сегодня.`;

      const buttons = [
        [
          this.client.buildOpenAppButton('🔮 Открыть Храм Таро на 3 карты', `${this.miniAppUrl}/tarot`),
        ],
        [
          this.client.buildCallbackButton('🔄 Другой вопрос', 'ACTION_TAROT_DAILY'),
        ],
      ];
      return this.client.sendMessage(userId, text, { buttons });
    }

    if (payload === 'SET_TIME_1200') {
      const res = await this.chatEngine.handleOnboardingTime(userId, '12:00');
      return this.client.sendMessage(userId, res.text, { buttons: res.buttons, attachments: res.attachments });
    }

    if (payload === 'SET_CITY_MOSCOW') {
      const res = await this.chatEngine.handleOnboardingCity(userId, 'Москва');
      return this.client.sendMessage(userId, res.text, { buttons: res.buttons, attachments: res.attachments });
    }

    if (payload === 'SET_CITY_SPB') {
      const res = await this.chatEngine.handleOnboardingCity(userId, 'Санкт-Петербург');
      return this.client.sendMessage(userId, res.text, { buttons: res.buttons, attachments: res.attachments });
    }

    if (payload === 'PROMPT_RELATIONSHIPS') {
      const res = await this.chatEngine.handlePersonalChat(userId, 'Что происходит в моих отношениях и как мне действовать?');
      return this.client.sendMessage(userId, res.text, { buttons: res.buttons, attachments: res.attachments });
    }

    if (payload === 'PROMPT_MONEY') {
      const res = await this.chatEngine.handlePersonalChat(userId, 'Где заблокирован мой финансовый потенциал по наталу?');
      return this.client.sendMessage(userId, res.text, { buttons: res.buttons, attachments: res.attachments });
    }

    if (payload === 'ACTION_PREMIUM_INFO') {
      const text = 
`💎 **Премиум Клуб АстроМАХ**

Получи неограниченный доступ:
• Личный ИИ-астролог 24/7 без ограничений
• Ежедневные персональные транзиты
• Безлимитные расклады Таро на 3 и 5 карт
• Анализ совместимости пар (синастрия)

Тариф: всего 490 ₽ в месяц (автопродление с легкой отменой в 1 клик).`;

      const buttons = [
        [
          this.client.buildOpenAppButton('🚀 Оформить подписку за 490 ₽', `${this.miniAppUrl}/subscribe`),
        ],
      ];
      return this.client.sendMessage(userId, text, { buttons });
    }
  }
}
