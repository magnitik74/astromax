import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateNatalChart } from '../src/core/astrology.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'public', 'index.html');

test('Natal Chart & Wheel: HTML and Navigation Integrity', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // 1. Rebranding from "Паспорт" to "Натальная карта"
  assert.ok(html.includes('Твоя натальная карта'), 'Should include "Твоя натальная карта" header');
  assert.ok(html.includes('<span class="tab-label">Карта</span>'), 'Tab bar should label the tab as "Карта"');

  // 2. High-contrast Tab Bar Icons
  assert.ok(html.includes('stroke-width="2.2"'), 'Tab bar icons must use high-contrast stroke-width 2.2');
  assert.ok(html.includes('color: #A1A1AA;'), 'Inactive tab items should use silver #A1A1AA');

  // 3. 3D Zodiac Wheel Container & Planet Card
  assert.ok(html.includes('id="natalWheelSvg"'), 'Should contain natal wheel SVG');
  assert.ok(html.includes('id="natalPlanetCard"'), 'Should contain interactive natal planet card');
  assert.ok(html.includes('id="npcGlyph"'), 'Should contain planet glyph element');
  assert.ok(html.includes('id="npcTitle"'), 'Should contain planet title element');
  assert.ok(html.includes('id="npcAskBtn"'), 'Should contain button to ask mentor about planet');

  // 4. Chat 1-Tap Send Fix
  assert.ok(html.includes('onpointerdown="handleSendPointerDown(event)"'), 'Chat send button must have onpointerdown handler');
  assert.ok(html.includes('function handleSendPointerDown('), 'Should define handleSendPointerDown');

  // 5. Zero Blacklist Words Check (Rule 7)
  assert.ok(!html.toLowerCase().includes('демон'), 'Strict prohibition of word "демон"');
  assert.ok(!html.includes('NASA'), 'Strict prohibition of word "NASA"');
  assert.ok(!html.toLowerCase().includes('эфемерид'), 'Strict prohibition of word "эфемериды"');
});

test('Natal Chart Core Engine: calculates all 7 major bodies for Zodiac Wheel', () => {
  const chart = calculateNatalChart({
    birthDate: '1990-05-12',
    birthTime: '14:30',
    lat: 55.7558,
    lon: 37.6173,
    timezoneOffset: 3
  });

  assert.ok(chart.bigThree.sun.sign, 'Sun sign must exist');
  assert.ok(chart.bigThree.moon.sign, 'Moon sign must exist');
  assert.ok(chart.bigThree.ascendant.sign, 'Ascendant sign must exist');

  const requiredPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter'];
  for (const pName of requiredPlanets) {
    const found = chart.planets.find(p => p.id === pName);
    assert.ok(found, `Planet ${pName} must be calculated in planets array`);
    assert.ok(typeof found.longitude === 'number', `${pName} longitude must be a valid number`);
    assert.ok(found.longitude >= 0 && found.longitude <= 360, `${pName} longitude must be in range 0..360`);
  }
});
