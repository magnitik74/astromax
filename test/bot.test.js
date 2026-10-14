import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MaxBotClient } from '../src/bot/maxClient.js';
import { BotDispatcher } from '../src/bot/dispatcher.js';

test('MaxBotClient sandbox mode works without credentials', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const me = await client.getMe();
  assert.equal(me.ok, true);
  assert.equal(me.sandbox, true);

  const res = await client.sendMessage('test_chat_123', 'Привет, космос!', {
    buttons: [
      [client.buildOpenAppButton('Открыть', 'https://astromax.app')],
    ],
  });
  assert.equal(res.ok, true);
  assert.equal(res.receivedBody.chat_id, 'test_chat_123');
  assert.equal(res.receivedBody.text, 'Привет, космос!');
  assert.equal(res.receivedBody.attachments[0].type, 'inline_keyboard');
});

test('BotDispatcher handles /start command with open_app button and onboarding', async () => {
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
  assert.ok(result.receivedBody.text.includes('космический код готов'));
  
  // Verify link button is attached
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons[0][0].type, 'link');
});

test('BotDispatcher handles /tarot command with live card draw', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const dispatcher = new BotDispatcher(client);

  const result = await dispatcher.handleUpdate({
    message: {
      chat_id: 'user_789',
      text: '/tarot',
    },
  });

  assert.ok(result);
  assert.ok(result.receivedBody.text.includes('Карта Дня:'));
  assert.ok(result.receivedBody.text.includes('Смысл аркана:'));
});

test('BotDispatcher handles native Max event: bot_started', async () => {
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
  assert.ok(result.receivedBody.text.includes('Елена'));
  assert.ok(result.receivedBody.text.includes('привет'));
  assert.ok(result.receivedBody.text.includes('космический код готов'));
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons[0][0].type, 'link');
  assert.ok(buttons[0][0].url.includes('user_id=11223344'));
});

test('BotDispatcher handles native Max event: message_created and answers via Astrologer chat', async () => {
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
  assert.ok(typeof res.receivedBody.text === 'string' && res.receivedBody.text.length > 10);
});

test('BotDispatcher handles native Max event: message_callback for quick Tarot', async () => {
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
  assert.ok(result.receivedBody.text.includes('Карта Дня:'));
});
