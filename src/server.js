import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import { calculateNatalChart } from './core/astrology.js';
import { drawTarotSpread } from './core/tarot.js';
import { MaxBotClient } from './bot/maxClient.js';
import { BotDispatcher } from './bot/dispatcher.js';
import { GroqAIClient } from './ai/groqClient.js';
import { buildAstrologerSystemPrompt } from './chat/astrologerPersona.js';
import { checkSafetyGuardrails } from './safety/guardrails.js';
import QRCode from 'qrcode';
import { ASTROLOGER_PERSONAS, getPersonaById } from './chat/personas.js';

export function createServer(options = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static('public'));

  const botClient = options.botClient || new MaxBotClient();
  const ai = options.ai || new GroqAIClient();
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
      const { amount = 490, plan = 'monthly_sub', userId = 'user_demo' } = req.body;
      const merchantLogin = process.env.ROBOKASSA_LOGIN || 'AstroMaxTest';
      const pass1 = process.env.ROBOKASSA_PASS1 || 'testPass1_sample';
      const invId = Math.floor(Date.now() / 1000);
      const isRecurring = plan === 'monthly_sub';

      // Вычисление контрольной суммы MD5 по протоколу Robokassa
      // SignatureValue = md5(MerchantLogin:OutSum:InvId:Pass1)
      const outSumFormatted = Number(amount).toFixed(2);
      const signatureString = `${merchantLogin}:${outSumFormatted}:${invId}:${pass1}`;
      const signature = crypto.createHash('md5').update(signatureString).digest('hex');

      const isTest = process.env.ROBOKASSA_TEST ? '1' : '1'; // тестовый режим по умолчанию
      let paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${merchantLogin}&OutSum=${outSumFormatted}&InvId=${invId}&Description=${encodeURIComponent('Подписка АстроМАХ')}&SignatureValue=${signature}&IsTest=${isTest}`;
      
      if (isRecurring) {
        paymentUrl += `&Recurring=true`;
      }

      res.json({
        invId,
        amount: outSumFormatted,
        plan,
        paymentUrl,
        recurring: isRecurring,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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
          model: ai.modelSmart, // Флагманская модель 120B
          temperature: 0.72,
          maxTokens: 750,
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

  return app;
}
