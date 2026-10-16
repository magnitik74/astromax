import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';

// Zodiac Element Helper function
export function getZodiacElement(sign) {
  const elements = {
    'Овен': 'Огонь', 'Лев': 'Огонь', 'Стрелец': 'Огонь',
    'Телец': 'Земля', 'Дева': 'Земля', 'Козерог': 'Земля',
    'Близнецы': 'Воздух', 'Весы': 'Воздух', 'Водолей': 'Воздух',
    'Рак': 'Вода', 'Скорпион': 'Вода', 'Рыбы': 'Вода'
  };
  return elements[sign] || 'Космос';
}

export function formatPassportShareText(profile, bigThree) {
  const name = profile.name || 'Странник';
  const sun = bigThree?.sun?.sign || 'Не определено';
  const moon = bigThree?.moon?.sign || 'Не определено';
  const asc = bigThree?.ascendant?.sign || 'Не определено';

  return `🌌 Моя натальная карта в АСТРА:\n` +
    `👤 ${name}\n` +
    `☀️ Солнце: ${sun} (${getZodiacElement(sun)})\n` +
    `🌙 Луна: ${moon} (${getZodiacElement(moon)})\n` +
    `⬆️ Асцендент: ${asc} (${getZodiacElement(asc)})\n\n` +
    `🪐 Рассчитай свою натальную карту и Большую Тройку в мессенджере MAX:\n` +
    `https://max.ru/id744510054693_4_bot`;
}

test('Server GET /api/qr returns valid PNG data URL', async () => {
  const app = createServer();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/qr?text=https://max.ru/id744510054693_4_bot`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
    assert.ok(data.dataUrl.startsWith('data:image/png;base64,'));
    assert.equal(data.text, 'https://max.ru/id744510054693_4_bot');
  } finally {
    server.close();
  }
});

test('getZodiacElement correctly maps all 12 signs to 4 elements', () => {
  assert.equal(getZodiacElement('Овен'), 'Огонь');
  assert.equal(getZodiacElement('Телец'), 'Земля');
  assert.equal(getZodiacElement('Близнецы'), 'Воздух');
  assert.equal(getZodiacElement('Рак'), 'Вода');
  assert.equal(getZodiacElement('Лев'), 'Огонь');
  assert.equal(getZodiacElement('Дева'), 'Земля');
  assert.equal(getZodiacElement('Весы'), 'Воздух');
  assert.equal(getZodiacElement('Скорпион'), 'Вода');
  assert.equal(getZodiacElement('Стрелец'), 'Огонь');
  assert.equal(getZodiacElement('Козерог'), 'Земля');
  assert.equal(getZodiacElement('Водолей'), 'Воздух');
  assert.equal(getZodiacElement('Рыбы'), 'Вода');
  assert.equal(getZodiacElement('Неизвестно'), 'Космос');
});

test('formatPassportShareText builds high-converting viral message with link', () => {
  const text = formatPassportShareText(
    { name: 'Александр' },
    {
      sun: { sign: 'Скорпион' },
      moon: { sign: 'Водолей' },
      ascendant: { sign: 'Рак' }
    }
  );

  assert.ok(text.includes('Александр'));
  assert.ok(text.includes('Скорпион (Вода)'));
  assert.ok(text.includes('Водолей (Воздух)'));
  assert.ok(text.includes('Рак (Вода)'));
  assert.ok(text.includes('https://max.ru/id744510054693_4_bot'));
});
