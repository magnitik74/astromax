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

test('api/chat/ask.js generates dynamic live responses for Elena without hitting static fallback', async () => {
  const askHandler = (await import('../api/chat/ask.js')).default;
  const staticFallback = 'Эта ситуация пришла не случайно — она в точности повторяет развилку, которая уже встречалась на жизненном пути, когда не хватило решимости сделать выбор...\n\nЧто именно внутри так упорно держится за привычный дискомфорт вместо шага в неизвестность?';

  // Question 1
  const req1 = mockReqRes('POST', {
    message: 'Как мне преодолеть финансовый тупик и сменить профессию?',
    profile: {
      name: 'Михаил',
      personaId: 'elena',
      sunSign: 'Телец',
      ascendant: 'Скорпион'
    }
  });
  await askHandler(req1.req, req1.res);
  assert.equal(req1.getStatus(), 200);
  const reply1 = req1.getData().reply;

  // Question 2
  const req2 = mockReqRes('POST', {
    message: 'Чувствую постоянный упадок сил и апатию в отношениях, что делать?',
    profile: {
      name: 'Михаил',
      personaId: 'elena',
      sunSign: 'Телец',
      ascendant: 'Скорпион'
    }
  });
  await askHandler(req2.req, req2.res);
  assert.equal(req2.getStatus(), 200);
  const reply2 = req2.getData().reply;

  assert.ok(reply1 && reply1.length > 50, 'Reply 1 must be substantial');
  assert.ok(reply2 && reply2.length > 50, 'Reply 2 must be substantial');
  assert.notEqual(reply1, staticFallback, 'Reply 1 must not be the hardcoded static fallback');
  assert.notEqual(reply2, staticFallback, 'Reply 2 must not be the hardcoded static fallback');
  assert.notEqual(reply1, reply2, 'Responses to different questions must be dynamic and unique');
  assert.ok(reply1.trim().endsWith('?'), 'Reply 1 must end with open question');
  assert.ok(reply2.trim().endsWith('?'), 'Reply 2 must end with open question');
  assert.equal(/#+/.test(reply1), false, 'Reply 1 must not contain raw markdown headers');
  assert.equal(/\*\*/.test(reply1), false, 'Reply 1 must not contain raw markdown bold');
});

