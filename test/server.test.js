import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

test('Server /health returns ok', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.status, 'ok');
  } finally {
    server.close();
  }
});

test('Server POST /api/natal calculates Big Three accurately', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/natal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birthDate: '1990-07-15',
        birthTime: '10:00',
        lat: 55.7558,
        lon: 37.6173,
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.bigThree);
    assert.equal(data.bigThree.sun.sign, 'Рак');
  } finally {
    server.close();
  }
});

test('Server POST /api/tarot/draw returns valid tarot spread', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/tarot/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'three_cards' }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.cards.length, 3);
  } finally {
    server.close();
  }
});

test('Server POST /api/payment/create-order generates valid Robokassa link', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 490, plan: 'monthly_sub' }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.paymentUrl.includes('auth.robokassa.ru'));
    assert.ok(data.paymentUrl.includes('SignatureValue='));
    assert.equal(data.recurring, true);
  } finally {
    server.close();
  }
});

test('Server POST /api/chat/ask handles consultation dialogue with user profile', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test_client_007',
        message: 'Что мне сулят звезды на этой неделе?',
        profile: {
          name: 'Александр',
          birthDate: '1990-05-12',
          birthTime: '14:30',
          city: 'Москва',
        },
      }),
    });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.ok(data.reply);
    assert.ok(data.history.length >= 2);
  } finally {
    server.close();
  }
});

test('Server GET and POST /api/user/profile manages profile dossier correctly', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const postRes = await fetch(`http://localhost:${port}/api/user/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'profile_tester',
        profile: {
          name: 'Мария',
          birthDate: '1995-10-25',
          birthTime: '12:00',
          city: 'Санкт-Петербург',
        },
      }),
    });
    const postData = await postRes.json();
    assert.equal(postRes.status, 200);
    assert.equal(postData.profile.name, 'Мария');
    assert.ok(postData.natalChart);

    const getRes = await fetch(`http://localhost:${port}/api/user/profile?userId=profile_tester`);
    const getData = await getRes.json();
    assert.equal(getRes.status, 200);
    assert.equal(getData.profile.name, 'Мария');
    assert.equal(getData.profile.city, 'Санкт-Петербург');
  } finally {
    server.close();
  }
});
