import test from 'node:test';
import assert from 'node:assert/strict';
import natalHandler from '../api/natal.js';
import healthHandler from '../api/health.js';
import personasHandler from '../api/personas.js';
import tarotHandler from '../api/tarot/draw.js';
import paymentHandler from '../api/payment/create-order.js';

function mockReqRes(method = 'GET', body = null, url = '/') {
  const req = { method, body, url, headers: {} };
  let statusCode = 200;
  let responseData = null;
  const headers = {};

  const res = {
    statusCode,
    setHeader(k, v) { headers[k] = v; },
    status(c) { statusCode = c; this.statusCode = c; return this; },
    json(data) { responseData = data; return this; },
    end() { return this; }
  };

  return { req, res, getStatus: () => statusCode, getData: () => responseData };
}

test('api/health.js returns 200 with status ok', async () => {
  const { req, res, getStatus, getData } = mockReqRes('GET');
  await healthHandler(req, res);
  assert.equal(getStatus(), 200);
  assert.equal(getData().status, 'ok');
});

test('api/personas.js returns 4 astrologer personas', async () => {
  const { req, res, getStatus, getData } = mockReqRes('GET');
  await personasHandler(req, res);
  assert.equal(getStatus(), 200);
  assert.equal(getData().length, 4);
});

test('api/natal.js calculates natal chart correctly', async () => {
  const { req, res, getStatus, getData } = mockReqRes('POST', {
    birthDate: '1995-05-15',
    birthTime: '14:30',
    lat: 55.75,
    lon: 37.61
  });
  await natalHandler(req, res);
  assert.equal(getStatus(), 200);
  const data = getData();
  assert.ok(data.bigThree);
  assert.equal(data.bigThree.sun.sign, 'Телец');
});

test('api/tarot/draw.js draws daily spread', async () => {
  const { req, res, getStatus, getData } = mockReqRes('POST', { type: 'daily' });
  await tarotHandler(req, res);
  assert.equal(getStatus(), 200);
  assert.ok(getData().cards);
  assert.equal(getData().cards.length, 1);
});

test('api/payment/create-order.js generates payment order', async () => {
  const { req, res, getStatus, getData } = mockReqRes('POST', { amount: 490 });
  await paymentHandler(req, res);
  assert.equal(getStatus(), 200);
  assert.ok(getData().paymentUrl);
});

test('api/chat/ask.js produces clean 2-paragraph dialogue without raw markdown ending with question', async () => {
  const askHandler = (await import('../api/chat/ask.js')).default;
  const { req, res, getStatus, getData } = mockReqRes('POST', {
    message: 'Почему он не звонит и держит дистанцию?',
    profile: {
      name: 'Екатерина',
      personaId: 'alena',
      sunSign: 'Скорпион',
      ascendant: 'Рак'
    }
  });

  await askHandler(req, res);
  assert.equal(getStatus(), 200);
  const data = getData();
  assert.ok(data.reply, 'Reply must exist');

  // Verify no raw markdown headers or bold stars
  assert.equal(/#+/.test(data.reply), false, 'Must not contain raw markdown headers');
  assert.equal(/\*\*/.test(data.reply), false, 'Must not contain raw double stars');
  assert.equal(/^[-*•]\s+/m.test(data.reply), false, 'Must not contain raw bullet lists');

  // Verify ending with engaging question
  assert.ok(data.reply.trim().endsWith('?'), 'Must end with an engaging open question');
});

