import 'dotenv/config';
import { createServer } from './server.js';
import { MaxBotClient } from './bot/maxClient.js';
import { BotDispatcher } from './bot/dispatcher.js';
import { GroqAIClient } from './ai/groqClient.js';

const PORT = process.env.PORT || 3000;
const botClient = new MaxBotClient();
const ai = new GroqAIClient();
const dispatcher = new BotDispatcher(botClient, { ai });

const app = createServer({ botClient, dispatcher, ai });

const server = app.listen(PORT, async () => {
  console.log(`🌌 [АСТРА] Сервер успешно запущен на порту ${PORT}`);
  console.log(`📱 Mini App доступен: http://localhost:${PORT}`);
  console.log(`🤖 Webhook endpoint: http://localhost:${PORT}/webhook/max`);

  // Запуск Long Polling для живого тестирования в мессенджере Max
  if (process.env.MAX_BOT_TOKEN) {
    try {
      const me = await botClient.getMe();
      console.log(`✨ Бот активен в Max Messenger: @${me.username} (${me.first_name})`);

      // Предзагрузка и кэширование баннера онбординга
      const banner = await botClient.getBannerAttachment('astromax_banner.jpg');
      if (banner) {
        console.log(`🖼️ Баннер онбординга успешно кэширован в Max CDN`);
      }

      botClient.startPolling(async (update) => {
        try {
          await dispatcher.handleUpdate(update);
        } catch (err) {
          console.error('[BotDispatcher] Ошибка обработки апдейта:', err);
        }
      });
    } catch (err) {
      console.error('[MaxBotClient] Ошибка при инициализации бота:', err.message);
    }
  }
});

// Корректное завершение при SIGINT/SIGTERM
process.on('SIGINT', () => {
  botClient.stopPolling();
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  botClient.stopPolling();
  server.close(() => process.exit(0));
});
