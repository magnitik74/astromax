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
  assert.ok(res.receivedBody.attachments[0].payload.buttons[0][0].web_app.includes('startapp'));
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
  assert.ok(result.receivedBody.text.includes('С каким вопросом ты пришел') || result.receivedBody.text.includes('твой личный ИИ-астролог'));
  
  // Verify conversion funnel: 3 button rows (open_app native + 2 rows of topic hooks)
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0][0].type, 'open_app');
  assert.ok(buttons[0][0].web_app.includes('startapp'));
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
  assert.ok(buttons[0][0].url.includes('user_id=user_456'));
  assert.equal(buttons[1][0].type, 'callback');
  assert.equal(buttons[1][0].payload, 'TOPIC_RELATIONSHIPS');
  assert.equal(buttons[1][1].payload, 'TOPIC_MONEY');
  assert.equal(buttons[2][0].payload, 'ACTION_TAROT_DAILY');
  assert.equal(buttons[2][1].payload, 'TOPIC_BIG_THREE');
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
  assert.ok(result.receivedBody.text.includes('Храм Таро АСТРА'));
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0][0].type, 'open_app');
  assert.ok(buttons[0][0].web_app.includes('startapp'));
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
});

test('BotDispatcher handles /reset command by clearing memory and providing reset link', async () => {
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
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0][0].type, 'open_app');
  assert.ok(buttons[0][0].url.includes('reset=1'));
  assert.ok(buttons[0][0].url.includes('user_id=user_reset_test'));
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
  assert.ok(result.receivedBody.text.includes('С каким вопросом ты пришел') || result.receivedBody.text.includes('твой личный ИИ-астролог'));
  assert.equal(/https?:\/\//.test(result.receivedBody.text), false, 'Welcome text must NOT contain raw URLs');

  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0][0].type, 'open_app');
  assert.ok(buttons[0][0].web_app.includes('startapp'));
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
  assert.ok(buttons[0][0].url.includes('user_id=11223344'));
  assert.ok(buttons[0][0].url.includes('name=%D0%95%D0%BB%D0%B5%D0%BD%D0%B0'));
  assert.equal(buttons[1][0].payload, 'TOPIC_RELATIONSHIPS');
  assert.equal(buttons[1][1].payload, 'TOPIC_MONEY');
  assert.equal(buttons[2][0].payload, 'ACTION_TAROT_DAILY');
  assert.equal(buttons[2][1].payload, 'TOPIC_BIG_THREE');
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
  assert.ok(res.receivedBody.text.includes('вопрос') || res.receivedBody.text.includes('АСТРА'));
  assert.equal(/https?:\/\//.test(res.receivedBody.text), false, 'Chat reply text must NOT contain raw URLs');
  const buttons = res.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0][0].type, 'open_app');
  assert.ok(buttons[0][0].web_app.includes('startapp'));
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
  assert.ok(buttons[0][0].url.includes('name=%D0%90%D0%BD%D0%BD%D0%B0'));
  assert.equal(buttons[1][0].payload, 'TOPIC_RELATIONSHIPS');
  assert.equal(buttons[1][1].payload, 'TOPIC_MONEY');
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
  assert.ok(result.receivedBody.text.includes('Храм Таро АСТРА'));
  const buttons = result.receivedBody.attachments[0].payload.buttons;
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0][0].type, 'open_app');
  assert.ok(buttons[0][0].web_app.includes('startapp'));
  assert.ok(buttons[0][0].url.includes('https://astromax-nu.vercel.app'));
});

test('BotDispatcher handles topic callbacks: TOPIC_RELATIONSHIPS, TOPIC_MONEY, and TOPIC_BIG_THREE', async () => {
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
  assert.equal(/https?:\/\//.test(relRes.receivedBody.text), false, 'Relationships reply must NOT contain raw URLs');
  assert.equal(relRes.receivedBody.attachments[0].payload.buttons.length, 1);
  assert.equal(relRes.receivedBody.attachments[0].payload.buttons[0][0].type, 'open_app');

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
  assert.equal(/https?:\/\//.test(moneyRes.receivedBody.text), false, 'Money reply must NOT contain raw URLs');
  assert.equal(moneyRes.receivedBody.attachments[0].payload.buttons.length, 1);
  assert.equal(moneyRes.receivedBody.attachments[0].payload.buttons[0][0].type, 'open_app');

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
  assert.equal(/https?:\/\//.test(b3Res.receivedBody.text), false, 'Big Three reply must NOT contain raw URLs');
  assert.equal(b3Res.receivedBody.attachments[0].payload.buttons.length, 1);
  assert.equal(b3Res.receivedBody.attachments[0].payload.buttons[0][0].type, 'open_app');
});
