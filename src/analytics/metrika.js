/**
 * Yandex Metrika & AppMetrica Integration Module for AstroMAX
 * Handles Server-Side Offline Conversions for Yandex Direct (РСЯ)
 */

export class MetrikaTracker {
  constructor(options = {}) {
    this.counterId = options.counterId || process.env.YANDEX_METRIKA_ID || '';
    this.oauthToken = options.oauthToken || process.env.YANDEX_METRIKA_TOKEN || '';
  }

  /**
   * Отправка офлайн-конверсии в Яндекс Метрику по протоколу Offline Conversions
   * Позволяет РСЯ обучаться на РЕАЛЬНЫХ оплатах из Robokassa
   * @param {Object} params
   * @param {string} params.clientId - ClientID посетителя из cookie _ym_uid
   * @param {string} params.target - Имя цели (например, 'payment_success_tripwire', 'payment_success_sub')
   * @param {number} params.price - Сумма оплаты в рублях (199 или 490)
   */
  async trackOfflineConversion({ clientId, target, price = 199 }) {
    if (!this.counterId || !this.oauthToken) {
      console.log(`[Metrika] Тестовый режим: событие ${target} на сумму ${price} ₽ (ClientID: ${clientId}) залогировано.`);
      return { success: true, simulated: true };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const csvData = `ClientId,Target,DateTime,Price,Currency\n${clientId},${target},${timestamp},${price},RUB`;

      const formData = new FormData();
      formData.append('file', new Blob([csvData], { type: 'text/csv' }), 'conversions.csv');

      const url = `https://api-metrika.yandex.net/management/v1/counter/${this.counterId}/offline_conversions/upload`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `OAuth ${this.oauthToken}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[Metrika Error] ${res.status}: ${text}`);
        return { success: false, error: text };
      }

      const json = await res.json();
      console.log(`[Metrika Success] Конверсия ${target} передана в РСЯ:`, json);
      return { success: true, json };
    } catch (err) {
      console.error('[Metrika Exception]', err.message);
      return { success: false, error: err.message };
    }
  }
}
