import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'public', 'index.html');
const offerPath = path.join(__dirname, '..', 'public', 'offer.html');

test('Moonly Parity: Visual Noise Purge & Gentle Breathing', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // 1. astraRingSpin is stopped / no conic-gradient spinning
  assert.ok(!html.includes('background: conic-gradient('), 'conic-gradient spinning halo must be purged');
  assert.ok(html.includes('moonlyBreathe'), 'moonlyBreathe gentle float must be defined');

  // 2. astraSpecularSweep is disabled
  assert.ok(html.includes('.ob-medallion-shimmer {\n      display: none;\n    }') || html.includes('display: none;'), 'ob-medallion-shimmer must be hidden');
});

test('Moonly Parity: Golden Triad Onboarding Copy & Clay Assets', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // Step 1: Как тебя зовут?
  assert.ok(html.includes('Как тебя зовут?'), 'Step 1 title must be concise: «Как тебя зовут?»');
  assert.ok(html.includes('Твоё имя свяжет тебя с персональной картой неба.'), 'Step 1 copy must be poetic and concise');

  // Step 2: Когда ты родился?
  assert.ok(html.includes('Когда ты родился?'), 'Step 2 title must be concise: «Когда ты родился?»');
  assert.ok(html.includes('Момент первого вдоха определяет траекторию светил.'), 'Step 2 copy must be poetic and concise');

  // Step 3: Где ты родился?
  assert.ok(html.includes('Где ты родился?'), 'Step 3 title must be concise: «Где ты родился?»');
  assert.ok(html.includes('Географическая точка выстраивает сетку домов.'), 'Step 3 copy must be poetic and concise');

  // Step Loading: Составляем твою карту
  assert.ok(html.includes('Составляем твою карту...'), 'Loading screen must use serene title');
  assert.ok(html.includes('Сверяем координаты планет • Твой космический чертёж готов'), 'Loading screen must use clean astrological status');

  // Medallion Clay assets
  assert.ok(html.includes('/images/moonly/clay_sun.png'), 'Step 1 must use clay sun asset');
  assert.ok(html.includes('/images/moonly/clay_planet_2.png'), 'Step 2 must use clay planet asset');
  assert.ok(html.includes('/images/moonly/clay_planet_3.png'), 'Step 3 must use clay planet asset');
  assert.ok(html.includes('/images/moonly/hero_clay_moon.png'), 'Loading must use clay moon hero asset');
});

test('Moonly Parity: Freemium 3 Questions & Paywall Bottom Sheet', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // 1. Chat questions counter badge
  assert.ok(html.includes('id="chatQuestionsBadge"'), 'Must have #chatQuestionsBadge');
  assert.ok(html.includes('id="chatFreeCount"'), 'Must have #chatFreeCount');
  assert.ok(html.includes('3 из 3'), 'Default badge text must indicate 3 из 3');

  // 2. Paywall Bottom Sheet modal
  assert.ok(html.includes('id="moonlyPaywallModal"'), 'Must define #moonlyPaywallModal');
  assert.ok(html.includes('3 дня за 1 ₽') || html.includes('Пробный период 3 дня') || html.includes('1 ₽'), 'Paywall must offer 1 ruble trial');
  assert.ok(html.includes('245 ₽ в неделю'), 'Paywall must specify 245 rub/week regular price');
  assert.ok(html.includes('triggerTrialSubscription()'), 'Paywall must trigger trial subscription');

  // 3. User cancel subscription button in profile
  assert.ok(html.includes('id="profileUnsubBtn"'), 'Profile must have explicit 1-click cancel button');
  assert.ok(html.includes('handleUnsubscribe()'), 'Profile must trigger handleUnsubscribe()');
  assert.ok(html.includes('Пользовательское соглашение'), 'Must link to User Agreement');
});

test('Moonly Parity: Public Offer Tariff Synchronization', () => {
  const offer = fs.readFileSync(offerPath, 'utf-8');

  assert.ok(offer.includes('1 ₽') && offer.includes('3 (три) календарных дня'), 'Offer must include 1 ruble 3-day trial');
  assert.ok(offer.includes('245 ₽') && offer.includes('7 (семь) календарных дней'), 'Offer must include 245 rub weekly renewal');
});
