import { RobokassaClient } from '../../src/core/robokassa.js';
import { MetrikaTracker } from '../../src/analytics/metrika.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let data = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        data = Object.fromEntries(new URLSearchParams(data));
      }
    }

    const outSum = data.OutSum || data.out_sum;
    const invId = data.InvId || data.inv_id;
    const signatureValue = data.SignatureValue || data.signature_value;

    const client = new RobokassaClient();
    const isValid = client.verifyResultSignature({
      outSum,
      invId,
      signatureValue
    });

    if (!isValid) {
      console.warn(`[Robokassa ResultURL] Неверная подпись платежа: InvId=${invId}, OutSum=${outSum}`);
      return res.status(400).send('bad sign');
    }

    console.log(`[Robokassa ResultURL] Платеж успешно подтвержден: InvId=${invId}, OutSum=${outSum} ₽`);

    // Отправка офлайн-конверсии в Яндекс.Метрику (РСЯ)
    try {
      const metrika = new MetrikaTracker();
      await metrika.trackOfflineConversion({
        clientId: data.shp_userId || `user_${invId}`,
        target: 'payment_success_sub',
        price: Number(outSum) || 399
      });
    } catch (metricErr) {
      console.warn('[Robokassa Metrika Error]', metricErr);
    }

    // Ответ по протоколу Robokassa: строго "OK{InvId}"
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send(`OK${invId}`);
  } catch (err) {
    console.error('[Robokassa ResultURL Error]', err);
    return res.status(500).send(`error: ${err.message}`);
  }
}
