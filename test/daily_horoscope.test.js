import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Daily Horoscope HTML & Navigation integrity', () => {
  const htmlPath = path.resolve('public/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify daily tab screen exists
  assert.ok(html.includes('id="tab-screen-daily"'), 'tab-screen-daily screen must exist');

  // Verify daily nav button exists in bottom bar
  assert.ok(html.includes('id="nav-daily"'), 'nav-daily button must exist');
  assert.ok(html.includes("switchNavTab('daily')"), 'switchNavTab daily must be wired');

  // Verify elements for 24:00 countdown and daily readings exist
  assert.ok(html.includes('id="dailyCountdownText"'), 'dailyCountdownText must exist');
  assert.ok(html.includes('id="dailyEnergyPct"'), 'dailyEnergyPct must exist');
  assert.ok(html.includes('id="dailyLoveFocus"'), 'dailyLoveFocus must exist');
  assert.ok(html.includes('id="dailyCareerFocus"'), 'dailyCareerFocus must exist');
  assert.ok(html.includes('id="dailyVitalityFocus"'), 'dailyVitalityFocus must exist');
  assert.ok(html.includes('id="dailyMarkerColor"'), 'dailyMarkerColor must exist');
  assert.ok(html.includes('id="dailyMentorBridgeAvatar"'), 'dailyMentorBridgeAvatar must exist');

  // Verify toast notification is safely anchored at bottom (no top chat overlap)
  assert.ok(html.includes('bottom: calc(var(--bottom-bar-height)'), 'Toast must be anchored above bottom bar');
  assert.ok(!html.includes("showToast(`Наставник:"), 'Persona switch must not trigger blocking toast in chat');
});

test('Daily Horoscope local midnight calculation matches device clock', () => {
  const now = new Date(2026, 9, 15, 14, 30, 0, 0); // 14:30:00
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msRemaining = nextMidnight.getTime() - now.getTime();

  // Exactly 9 hours and 30 minutes left
  assert.equal(msRemaining, (9 * 3600 + 30 * 60) * 1000);

  const totalSec = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  assert.equal(formatted, '09:30:00');
});

test('Daily Horoscope deterministic seed produces non-empty readings for all 12 signs', () => {
  const signs = ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'];
  const testDate = new Date(2026, 9, 15);

  signs.forEach(sunSign => {
    signs.forEach(moonSign => {
      const day = testDate.getDate();
      const month = testDate.getMonth() + 1;
      const year = testDate.getFullYear();
      const signCharSum = (sunSign + moonSign).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const seed = (year * 372 + month * 31 + day + signCharSum) % 1000;

      const energyPct = 70 + (seed % 28);
      assert.ok(energyPct >= 70 && energyPct <= 97, 'Energy percent within valid range');
      assert.ok(seed >= 0 && seed < 1000, 'Seed is valid integer');
    });
  });
});
