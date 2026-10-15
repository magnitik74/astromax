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
  assert.equal(res.receivedBody.attachments[0].payload.buttons[0][0].type, 'open_app');
  assert.ok(res.receivedBody.attachments[0].payload.buttons[0][0].web_app.includes('https://astromax-nu.vercel.app'));
  assert.ok(res.receivedBody.attachments[0].payload.buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
});

test('BotDispatcher handles /start command with guidance to native bottom-left button and zero inline link buttons', async () => {
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
  assert.ok(result.receivedBody.text.includes('твой личный ИИ-астролог') || result.receivedBody.text.includes('АСТРА'));
  assert.ok(result.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(result.receivedBody.text), false, 'Welcome text must NOT contain raw URLs');
  
  // Verify strict zero-inline-button policy (no external browser opening)
  const inlineButtons = result.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(inlineButtons.length, 0, 'Must have zero inline link buttons in chat');
});

test('BotDispatcher handles /tarot command by directing directly to native Mini App button', async () => {
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
  assert.ok(result.receivedBody.text.includes('Храм Таро АСТРА'));
  assert.ok(result.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(result.receivedBody.text), false, 'Tarot reply must NOT contain raw URLs');
  const inlineButtons = result.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(inlineButtons.length, 0);
});

test('BotDispatcher handles /reset command by clearing memory and directing to native button', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  const dispatcher = new BotDispatcher(client);

  const result = await dispatcher.handleUpdate({
    message: {
      chat_id: 'user_reset_test',
      text: '/reset',
    },
  });

  assert.ok(result);
  assert.equal(result.receivedBody.chat_id, 'user_reset_test');
  assert.ok(result.receivedBody.text.includes('Сессия сброшена'));
  assert.ok(result.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(result.receivedBody.text), false, 'Reset reply must NOT contain raw URLs');
  const inlineButtons = result.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(inlineButtons.length, 0);
});

test('BotDispatcher handles native Max event: bot_started with user greeting and native button guide', async () => {
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
  assert.ok(result.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(result.receivedBody.text), false, 'Welcome text must NOT contain raw URLs');

  const inlineButtons = result.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(inlineButtons.length, 0);
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
  assert.ok(res.receivedBody.text.includes('АСТРА'));
  assert.ok(res.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(res.receivedBody.text), false, 'Chat reply text must NOT contain raw URLs');
  const inlineButtons = res.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(inlineButtons.length, 0);
});

test('BotDispatcher handles native Max event: message_callback for quick Tarot with native button guide', async () => {
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
  assert.ok(result.receivedBody.text.includes('Храм Таро АСТРА'));
  assert.ok(result.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(result.receivedBody.text), false, 'Tarot reply must NOT contain raw URLs');
  const inlineButtons = result.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(inlineButtons.length, 0);
});

test('BotDispatcher handles topic callbacks with native button guidance: TOPIC_RELATIONSHIPS, TOPIC_MONEY, and TOPIC_BIG_THREE', async () => {
  const client = new MaxBotClient({ isSandbox: true });
  client.answerCallback = async () => ({ ok: true });
  const dispatcher = new BotDispatcher(client);

  // 1. Relationships
  const relRes = await dispatcher.handleUpdate({
    update_type: 'message_callback',
    callback: {
      callback_id: 'cb_rel_1',
      payload: 'TOPIC_RELATIONSHIPS',
      user: { user_id: 777111 },
    },
    message: { recipient: { chat_id: 777111 } },
  });
  assert.ok(relRes.receivedBody.text.includes('Отношения & Любовь'));
  assert.ok(relRes.receivedBody.text.includes('Алёна Смирнова'));
  assert.ok(relRes.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(relRes.receivedBody.text), false, 'Relationships reply must NOT contain raw URLs');
  const relButtons = relRes.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(relButtons.length, 0);

  // 2. Money
  const moneyRes = await dispatcher.handleUpdate({
    update_type: 'message_callback',
    callback: {
      callback_id: 'cb_mon_1',
      payload: 'TOPIC_MONEY',
      user: { user_id: 777222 },
    },
    message: { recipient: { chat_id: 777222 } },
  });
  assert.ok(moneyRes.receivedBody.text.includes('Деньги & Карьера'));
  assert.ok(moneyRes.receivedBody.text.includes('Артём Соколов'));
  assert.ok(moneyRes.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(moneyRes.receivedBody.text), false, 'Money reply must NOT contain raw URLs');
  const monButtons = moneyRes.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(monButtons.length, 0);

  // 3. Big Three
  const b3Res = await dispatcher.handleUpdate({
    update_type: 'message_callback',
    callback: {
      callback_id: 'cb_b3_1',
      payload: 'TOPIC_BIG_THREE',
      user: { user_id: 777333 },
    },
    message: { recipient: { chat_id: 777333 } },
  });
  assert.ok(b3Res.receivedBody.text.includes('Большая Тройка'));
  assert.ok(b3Res.receivedBody.text.includes('Солнце'));
  assert.ok(b3Res.receivedBody.text.includes('Асцендент'));
  assert.ok(b3Res.receivedBody.text.includes('кнопку «✦ Открыть» внизу слева'));
  assert.equal(/https?:\/\//.test(b3Res.receivedBody.text), false, 'Big Three reply must NOT contain raw URLs');
  const b3Buttons = b3Res.receivedBody.attachments?.find(a => a.type === 'inline_keyboard')?.payload?.buttons || [];
  assert.equal(b3Buttons.length, 0);
});
