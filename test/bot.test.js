import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MaxBotClient } from '../src/bot/maxClient.js';
import { BotDispatcher } from '../src/bot/dispatcher.js';

test('MaxBotClient sandbox mode works without credentials and includes format: markdown', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const me = await client.getMe();
  assert.equal(me.ok, true);
  assert.equal(me.sandbox, true);

  const res = await client.sendMessage('test_chat_123', '**Привет, космос!**', {
    buttons: [
      [client.buildOpenAppButton('Открыть', 'https://astromax-nu.vercel.app')],
    ],
  });
  assert.equal(res.ok, true);
  assert.equal(res.receivedBody.chat_id, 'test_chat_123');
  assert.equal(res.receivedBody.text, '**Привет, космос!**');
  assert.equal(res.receivedBody.format, 'markdown');
  assert.equal(res.receivedBody.attachments[0].type, 'inline_keyboard');
  assert.equal(res.receivedBody.attachments[0].payload.buttons[0][0].url, 'https://astromax-nu.vercel.app');
});

test('BotDispatcher handles /start command with strict single CTA button to Mini App', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const dispatcher = new BotDispatcher(client);

  const result = await dispatcher.handleUpdate({
    message: {
      chat_id: 'user_456',
      text: '/start',
    },
  });

  assert.ok(result);
  assert.equal(result.receivedBody.chat_id, 'user_456');
  assert.equal(result.receivedBody.format, 'markdown');
  assert.ok(result.receivedBody.text.includes('Твой персональный разбор готов') || result.receivedBody.text.includes('скрытое напряжение'));
  
  // Verify strict funnel: exactly 1 button row, 1 button, pointing to live Mini App
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].length, 1);
  assert.equal(buttons[0][0].type, 'link');
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
  assert.ok(buttons[0][0].url.includes('user_id=user_456'));
});

test('BotDispatcher handles /tarot command by directing directly to Mini App', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const dispatcher = new BotDispatcher(client);

  const result = await dispatcher.handleUpdate({
    message: {
      chat_id: 'user_789',
      text: '/tarot',
    },
  });

  assert.ok(result);
  assert.equal(result.receivedBody.format, 'markdown');
  assert.ok(result.receivedBody.text.includes('Храм Таро АстроМАХ'));
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons[0][0].type, 'link');
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
});

test('BotDispatcher handles native Max event: bot_started with user_id & name deep links', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const dispatcher = new BotDispatcher(client);

  const result = await dispatcher.handleUpdate({
    update_type: 'bot_started',
    chat_id: 11223344,
    user: {
      user_id: 11223344,
      first_name: 'Елена',
      username: 'elena_star',
    },
  });

  assert.ok(result);
  assert.equal(result.receivedBody.chat_id, 11223344);
  assert.equal(result.receivedBody.format, 'markdown');
  assert.ok(result.receivedBody.text.includes('Елена'));
  assert.ok(result.receivedBody.text.includes('Твой персональный разбор готов') || result.receivedBody.text.includes('скрытое напряжение'));

  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0][0].type, 'link');
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
  assert.ok(buttons[0][0].url.includes('user_id=11223344'));
  assert.ok(buttons[0][0].url.includes('name=%D0%95%D0%BB%D0%B5%D0%BD%D0%B0'));
});

test('BotDispatcher handles native Max event: message_created by guiding user into Mini App', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const dispatcher = new BotDispatcher(client);
  const userId = 'user_chat_test';

  const res = await dispatcher.handleUpdate({
    update_type: 'message_created',
    message: {
      sender: { user_id: userId, first_name: 'Анна' },
      recipient: { chat_id: userId },
      body: { text: 'Что меня ждет в любви на этой неделе?' },
    },
  });

  assert.ok(res);
  assert.equal(res.receivedBody.chat_id, userId);
  assert.equal(res.receivedBody.format, 'markdown');
  assert.ok(res.receivedBody.text.includes('внутри приложения'));
  const buttons = res.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons[0][0].type, 'link');
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
  assert.ok(buttons[0][0].url.includes('name=%D0%90%D0%BD%D0%BD%D0%B0'));
});

test('BotDispatcher handles native Max event: message_callback for quick Tarot with Mini App link', async () => {
  let answeredCallbackId = null;
  const client = new MaxBotClient({ isSandbox: true });
  client.answerCallback = async (cbId) => { answeredCallbackId = cbId; return { ok: true }; };

  const dispatcher = new BotDispatcher(client);

  const result = await dispatcher.handleUpdate({
    update_type: 'message_callback',
    callback: {
      callback_id: 'cb_test_999',
      payload: 'ACTION_TAROT_DAILY',
      user: { user_id: 555666 },
    },
    message: {
      recipient: { chat_id: 555666 },
    },
  });

  assert.equal(answeredCallbackId, 'cb_test_999');
  assert.ok(result);
  assert.equal(result.receivedBody.format, 'markdown');
  assert.ok(result.receivedBody.text.includes('Храм Таро АстроМАХ'));
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons[0][0].type, 'link');
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
});
