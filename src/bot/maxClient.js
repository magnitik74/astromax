import fs from 'node:fs';
import path from 'node:path';

/**
 * Max Messenger Bot API Client
 * Base URL: https://platform-api2.max.ru
 * Docs: https://dev.max.ru/docs-api
 */

export class MaxBotClient {
  constructor(options = {}) {
    this.token = options.token || process.env.MAX_BOT_TOKEN || '';
    this.baseUrl = options.baseUrl || 'https://platform-api2.max.ru';
    this.isSandbox = options.isSandbox ?? (!this.token || this.token === 'TEST_TOKEN');
    this.isPolling = false;
    this.marker = null;
    this._bannerToken = null;
  }

  /**
   * Отправка HTTP-запроса к API Max Messenger
   */
  async request(endpoint, method = 'GET', body = null) {
    if (this.isSandbox) {
      return {
        ok: true,
        sandbox: true,
        endpoint,
        method,
        receivedBody: body,
      };
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': this.token,
    };

    // Отключение строгой проверки сертификатов для национального удостоверяющего центра Минцифры РФ
    const originalReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Max API error [${response.status}]: ${errText}`);
      }

      return await response.json();
    } finally {
      if (originalReject !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalReject;
      }
    }
  }

  /**
   * Получение информации о боте (GET /me)
   */
  async getMe() {
    return this.request('/me');
  }

  /**
   * Загрузка изображения на сервер Max Messenger
   * @param {string} filePath - Путь к локальному файлу
   * @returns {Promise<string|null>} - Токен загруженного фото
   */
  async uploadImage(filePath) {
    if (this.isSandbox || !fs.existsSync(filePath)) {
      return null;
    }

    try {
      // 1. Инициализация слота загрузки
      const init = await this.request('/uploads?type=image', 'POST');
      if (!init || !init.url) return null;

      // 2. Загрузка через multipart/form-data
      const fileBytes = fs.readFileSync(filePath);
      const filename = path.basename(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

      const blob = new Blob([fileBytes], { type: mimeType });
      const formData = new FormData();
      formData.append('data', blob, filename);

      const originalReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

      let uploadRes;
      try {
        const res = await fetch(init.url, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) return null;
        uploadRes = await res.json();
      } finally {
        if (originalReject !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalReject;
        }
      }

      const token = uploadRes?.photos?.['0']?.token || uploadRes?.token;
      return token || null;
    } catch (err) {
      console.warn(`[MaxBotClient] Ошибка при загрузке изображения ${filePath}:`, err.message);
      return null;
    }
  }

  /**
   * Получение вложения с баннером онбординга (с кэшированием токена)
   */
  async getBannerAttachment(bannerPath = 'astromax_banner.jpg') {
    if (this._bannerToken) {
      return [{ type: 'image', payload: { token: this._bannerToken } }];
    }

    if (fs.existsSync(bannerPath)) {
      const token = await this.uploadImage(bannerPath);
      if (token) {
        this._bannerToken = token;
        return [{ type: 'image', payload: { token } }];
      }
    }
    return null;
  }

  /**
   * Отправка текстового сообщения с поддержкой медиа-вложений и inline-клавиатур
   * @param {string|number|object} recipient - ID пользователя (user_id) или чата
   * @param {string} text - Текст сообщения
   * @param {object} options - { buttons, attachments, isChat }
   */
  async sendMessage(recipient, text, options = {}) {
    let queryParam = '';
    if (typeof recipient === 'object' && recipient !== null) {
      if (recipient.user_id) queryParam = `?user_id=${recipient.user_id}`;
      else if (recipient.chat_id) queryParam = `?chat_id=${recipient.chat_id}`;
    } else if (recipient) {
      if (options.isChat) {
        queryParam = `?chat_id=${recipient}`;
      } else {
        queryParam = `?user_id=${recipient}`;
      }
    }

    const payload = {
      text,
      format: 'markdown',
    };

    const attachments = [];

    if (options.attachments && Array.isArray(options.attachments)) {
      attachments.push(...options.attachments);
    }

    if (options.buttons && options.buttons.length > 0) {
      // Преобразуем любые кнопки ссылок и open_app в валидные публичные https ссылки
      const sanitizeUrl = (rawUrl) => {
        const defaultUrl = process.env.MINI_APP_URL || 'https://astromax-nu.vercel.app';
        if (!rawUrl || typeof rawUrl !== 'string') return defaultUrl;
        const str = rawUrl.trim();
        if (str.includes('localhost') || str.includes('127.0.0.1')) return defaultUrl;
        if (!str.startsWith('http://') && !str.startsWith('https://')) return `https://${str}`;
        return str;
      };

      const sanitizedButtons = options.buttons.map(row =>
        row.map(btn => {
          if (btn.type === 'open_app') {
            const botUsername = process.env.MAX_BOT_USERNAME || 'id744510054693_4_bot';
            const defaultWebApp = `https://max.ru/${botUsername}?startapp`;
            return {
              type: 'open_app',
              text: btn.text,
              web_app: btn.web_app || defaultWebApp,
            };
          }
          if (btn.type === 'link') {
            return {
              type: 'link',
              text: btn.text,
              url: sanitizeUrl(btn.url),
            };
          }
          return btn;
        })
      );

      attachments.push({
        type: 'inline_keyboard',
        payload: {
          buttons: sanitizedButtons,
        },
      });
    }

    if (attachments.length > 0) {
      payload.attachments = attachments;
    }

    // Для sandbox-режима сохраняем поле chat_id
    if (this.isSandbox) {
      payload.chat_id = recipient;
    }

    return this.request(`/messages${queryParam}`, 'POST', payload);
  }

  /**
   * Ответ на нажатие callback-кнопки
   */
  async answerCallback(callbackId, message = null) {
    if (!callbackId) return null;
    const endpoint = `/answers?callback_id=${encodeURIComponent(callbackId)}`;
    return this.request(endpoint, 'POST', message ? { message } : {});
  }

  /**
   * Получение обновлений через Long Polling (GET /updates)
   */
  async getUpdates({ marker = this.marker, limit = 50, timeout = 25 } = {}) {
    let url = `/updates?limit=${limit}&timeout=${timeout}`;
    if (marker !== null && marker !== undefined) {
      url += `&marker=${marker}`;
    }
    return this.request(url, 'GET');
  }

  /**
   * Запуск постоянного цикла Long Polling для локального тестирования или production-сервера
   */
  startPolling(onUpdate, options = {}) {
    if (this.isPolling) return;
    this.isPolling = true;
    const timeout = options.timeout ?? 25;
    const interval = options.interval ?? 500;

    console.log(`🤖 [MaxBotClient] Long Polling успешно запущен (timeout: ${timeout}s)`);

    const pollLoop = async () => {
      while (this.isPolling) {
        try {
          const res = await this.getUpdates({ marker: this.marker, timeout });
          if (res && res.marker !== undefined) {
            this.marker = res.marker;
          }

          if (res && Array.isArray(res.updates) && res.updates.length > 0) {
            for (const update of res.updates) {
              try {
                if (onUpdate) await onUpdate(update);
              } catch (updErr) {
                console.error(`[MaxBotClient] Ошибка обработки обновления:`, updErr);
              }
            }
          }
        } catch (err) {
          console.warn(`[MaxBotClient] Сбой Long Polling: ${err.message}. Повтор через 3 сек...`);
          await new Promise(r => setTimeout(r, 3000));
        }

        if (interval > 0) {
          await new Promise(r => setTimeout(r, interval));
        }
      }
    };

    pollLoop();
  }

  /**
   * Остановка цикла Long Polling
   */
  stopPolling() {
    this.isPolling = false;
    console.log(`🛑 [MaxBotClient] Long Polling остановлен`);
  }

  /**
   * Создание кнопки для открытия Mini App (нативно внутри MAX WebView)
   */
  buildOpenAppButton(text, appUrl, options = {}) {
    const botUsername = process.env.MAX_BOT_USERNAME || 'id744510054693_4_bot';
    const webApp = options.webApp || `https://max.ru/${botUsername}?startapp`;
    return {
      type: 'link',
      text,
      web_app: webApp,
      url: appUrl,
    };
  }

  /**
   * Создание стандартной callback-кнопки
   */
  buildCallbackButton(text, payload) {
    return {
      type: 'callback',
      text,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
    };
  }

  /**
   * Создание кнопки-ссылки
   */
  buildLinkButton(text, url) {
    return {
      type: 'link',
      text,
      url,
    };
  }
}
