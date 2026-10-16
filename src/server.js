import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import { calculateNatalChart } from './core/astrology.js';
import { drawTarotSpread } from './core/tarot.js';
import { MaxBotClient } from './bot/maxClient.js';
import { BotDispatcher } from './bot/dispatcher.js';
import { GigaChatClient } from './ai/gigaChatClient.js';
import { GroqAIClient } from './ai/groqClient.js';
import { buildAstrologerSystemPrompt } from './chat/astrologerPersona.js';
import { checkSafetyGuardrails } from './safety/guardrails.js';
import QRCode from 'qrcode';
import { ASTROLOGER_PERSONAS, getPersonaById } from './chat/personas.js';
import { RobokassaClient } from './core/robokassa.js';
import { MetrikaTracker } from './analytics/metrika.js';

export function createServer(options = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static('public'));

  // 0. Публичная оферта и инструкция по отмене подписки
  app.get('/offer', (req, res) => {
    res.sendFile(path.resolve('public/offer.html'));
  });
  app.get('/unsubscribe', (req, res) => {
    res.sendFile(path.resolve('public/unsubscribe.html'));
  });

  // Нормализатор URL для совместимости с Vercel serverless (поддерживает и /api/..., и /...)
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api') && req.url !== '/health' && req.url !== '/offer' && req.url !== '/unsubscribe' && !req.url.startsWith('/webhook')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    next();
  });

  const botClient = options.botClient || new MaxBotClient();
  const ai = options.ai || new GigaChatClient();
  const dispatcher = options.dispatcher || new BotDispatcher(botClient, { ai });

  // 1. Healthcheck
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'AstroMAX API', timestamp: new Date().toISOString() });
  });

  // 1.1 Список 4 экспертов
  app.get('/api/personas', (req, res) => {
    res.json(ASTROLOGER_PERSONAS);
  });

  // 1.2 QR код генератор для вирального шеринга паспорта
  app.get('/api/qr', async (req, res) => {
    try {
      const text = req.query.text || 'https://max.ru/id744510054693_4_bot';
      const dataUrl = await QRCode.toDataURL(text, {
        margin: 1,
        width: 320,
        color: {
          dark: '#FFFFFF',
          light: '#00000000',
        },
      });
      res.json({ ok: true, dataUrl, text });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // 2. Расчет натальной карты (Core Engine + AI)
  app.post('/api/natal', async (req, res) => {
    try {
      const { birthDate, birthTime, lat, lon, timezoneOffset, includeAi = false, focus = 'general' } = req.body;
      if (!birthDate) {
        return res.status(400).json({ error: 'birthDate is required (YYYY-MM-DD)' });
      }
      const chart = calculateNatalChart({
        birthDate,
        birthTime: birthTime || '12:00',
        lat: lat ? Number(lat) : 55.7558,
        lon: lon ? Number(lon) : 37.6173,
        timezoneOffset: timezoneOffset ? Number(timezoneOffset) : 3,
      });

      if (includeAi) {
        chart.aiReading = await ai.generateNatalReading(chart, focus);
      }

      res.json(chart);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Расклад Таро + AI
  app.post('/api/tarot/draw', async (req, res) => {
    try {
      const { type = 'daily', allowReversed = true, includeAi = false, question = null } = req.body;
      const spread = drawTarotSpread({ type, allowReversed });

      if (includeAi) {
        spread.aiInterpretation = await ai.generateTarotReading(spread, question);
      }

      res.json(spread);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Платежный шлюз Robokassa (Создание ссылки с RebillID)
  app.post('/api/payment/create-order', (req, res) => {
    try {
      const { amount, plan = 'trial_3d', userId = 'user_demo', email = '' } = req.body;
      const finalAmount = amount !== undefined ? amount : (plan === 'trial_3d' ? 1 : 399);
      const isRecurring = plan === 'trial_3d' || plan === 'monthly_sub';
      const description = plan === 'trial_3d'
        ? 'Пробный период 3 дня АСТРА VIP (далее 245 ₽/нед)'
        : 'Подписка АСТРА Селеста VIP';

      const client = new RobokassaClient();
      const order = client.generatePaymentUrl({
        amount: finalAmount,
        plan,
        isRecurring,
        email,
        description
      });

      res.json({
        invId: order.invId,
        amount: order.amount,
        plan,
        paymentUrl: order.paymentUrl,
        recurring: order.recurring,
        isTest: order.isTest,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4.1 Оповещение об успешной оплате (Robokassa ResultURL callback)
  app.all('/api/payment/result', async (req, res) => {
    try {
      const data = req.method === 'POST' ? req.body : req.query;
      const outSum = data.OutSum || data.out_sum;
      const invId = data.InvId || data.inv_id;
      const signatureValue = data.SignatureValue || data.signature_value;

      const client = new RobokassaClient();
      const isValid = client.verifyResultSignature({ outSum, invId, signatureValue });

      if (!isValid) {
        console.warn(`[Robokassa ResultURL] Неверная подпись: InvId=${invId}, OutSum=${outSum}`);
        return res.status(400).send('bad sign');
      }

      console.log(`[Robokassa ResultURL] Платеж успешно подтвержден: InvId=${invId}, OutSum=${outSum} ₽`);

      try {
        const metrika = new MetrikaTracker();
        await metrika.trackOfflineConversion({
          clientId: data.shp_userId || `user_${invId}`,
          target: 'payment_success_sub',
          price: Number(outSum) || 399
        });
      } catch (e) {}

      res.setHeader('Content-Type', 'text/plain');
      return res.status(200).send(`OK${invId}`);
    } catch (err) {
      return res.status(500).send(`error: ${err.message}`);
    }
  });

  // 4.2 Перенаправление при успешной оплате (Robokassa SuccessURL)
  app.all('/api/payment/success', (req, res) => {
    const data = req.method === 'POST' ? req.body : req.query;
    const invId = data.InvId || data.inv_id || '';
    const targetUrl = invId ? `/?payment=success&invId=${invId}` : '/?payment=success';
    res.redirect(targetUrl);
  });

  // 4.3 Перенаправление при отмене оплаты (Robokassa FailURL)
  app.all('/api/payment/fail', (req, res) => {
    res.redirect('/?payment=fail');
  });

  // 5. Диалог 24/7 с Личным ИИ-Астрологом (Web / Mini App)
  app.post('/api/chat/ask', async (req, res) => {
    try {
      const { userId = 'guest_web_user', message, profile } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Поле message обязательно' });
      }

      // Проверка на законодательные и этические красные линии (Safety Guardrails)
      const safety = checkSafetyGuardrails(message.trim());
      if (!safety.safe) {
        return res.json({
          reply: safety.response,
          timestamp: new Date().toISOString(),
          history: dispatcher.chatEngine.memory.getUser(userId).history,
        });
      }

      // Синхронизация профиля и натальной карты пользователя
      if (profile) {
        dispatcher.chatEngine.memory.updateProfile(userId, profile);
        if (profile.birthDate) {
          const chart = calculateNatalChart({
            birthDate: profile.birthDate,
            birthTime: profile.birthTime || '12:00',
            lat: profile.lat ? Number(profile.lat) : 55.7558,
            lon: profile.lon ? Number(profile.lon) : 37.6173,
            timezoneOffset: profile.timezoneOffset ? Number(profile.timezoneOffset) : 3,
          });
          dispatcher.chatEngine.memory.setNatalChart(userId, chart);
        }
      }

      const user = dispatcher.chatEngine.memory.getUser(userId);
      dispatcher.chatEngine.memory.addMessage(userId, 'user', message.trim());

      const systemPrompt = buildAstrologerSystemPrompt(user);
      const messages = [
        { role: 'system', content: systemPrompt },
        ...user.history.map(h => ({ role: h.role, content: h.content })),
      ];

      let reply = '';
      try {
        reply = await ai.chatCompletion({
          messages,
          temperature: 0.72,
          maxTokens: 500,
        });
      } catch (aiErr) {
        console.warn('[Server] Сбой AI генерации, fallback:', aiErr.message);
      }

      if (!reply || typeof reply !== 'string' || reply.trim().length === 0) {
        reply = `Звезды подсказывают, что сейчас время довериться интуиции. В твоей натальной карте заложен огромный потенциал для раскрытия и решения текущей ситуации.`;
      }

      dispatcher.chatEngine.memory.addMessage(userId, 'assistant', reply);

      res.json({
        reply,
        timestamp: new Date().toISOString(),
        history: user.history,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Получение и обновление профиля (ЛК)
  app.get('/api/user/profile', (req, res) => {
    const userId = req.query.userId || 'guest_web_user';
    const user = dispatcher.chatEngine.memory.getUser(userId);
    res.json(user);
  });

  app.post('/api/user/profile', (req, res) => {
    try {
      const { userId = 'guest_web_user', profile } = req.body;
      if (profile) {
        dispatcher.chatEngine.memory.updateProfile(userId, profile);
        if (profile.birthDate) {
          const chart = calculateNatalChart({
            birthDate: profile.birthDate,
            birthTime: profile.birthTime || '12:00',
            lat: profile.lat ? Number(profile.lat) : 55.7558,
            lon: profile.lon ? Number(profile.lon) : 37.6173,
            timezoneOffset: profile.timezoneOffset ? Number(profile.timezoneOffset) : 3,
          });
          dispatcher.chatEngine.memory.setNatalChart(userId, chart);
        }
      }
      const user = dispatcher.chatEngine.memory.getUser(userId);
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Max Messenger Webhook
  app.post('/webhook/max', async (req, res) => {
    try {
      const result = await dispatcher.handleUpdate(req.body);
      res.json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: `Not found: ${req.method} ${req.url}` });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('[Server] Uncaught error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
