import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/webhook.js';

test('Webhook API GET returns 200 OK and service metadata', async () => {
  let statusCode = 0;
  let headers = {};
  let responseData = null;

  const req = { method: 'GET' };
  const res = {
    setHeader(k, v) { headers[k] = v; },
    status(code) {
      statusCode = code;
      return {
        json(data) { responseData = data; return data; },
        end() { return null; }
      };
    }
  };

  await handler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(responseData.ok, true);
  assert.ok(responseData.service.includes('Webhook'));
});

test('Webhook API POST handles bot_started update gracefully', async () => {
  let statusCode = 0;
  let responseData = null;

  const req = {
    method: 'POST',
    body: {
      update_type: 'bot_started',
      user: { user_id: 999999, first_name: 'Тест' },
      chat_id: 999999
    }
  };
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return {
        json(data) { responseData = data; return data; }
      };
    }
  };

  await handler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(responseData.ok, true);
});

test('Webhook API POST handles message_created with funnel response', async () => {
  let statusCode = 0;
  let responseData = null;

  const req = {
    method: 'POST',
    body: {
      update_type: 'message_created',
      message: {
        sender: { user_id: 888888, first_name: 'Тест' },
        recipient: { chat_id: 888888 },
        body: { text: 'Как открыть?' }
      }
    }
  };
  const res = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return {
        json(data) { responseData = data; return data; }
      };
    }
  };

  await handler(req, res);
  assert.equal(statusCode, 200);
  assert.equal(responseData.ok, true);
});
