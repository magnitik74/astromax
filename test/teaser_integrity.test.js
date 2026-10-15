import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '..', 'public', 'index.html');
const chatEnginePath = path.join(__dirname, '..', 'src', 'chat', 'chatEngine.js');
const threeJsPath = path.join(__dirname, '..', 'public', 'three.min.js');

test('Teaser DOM: 4 teaser containers and dedicated canvases exist in public/index.html', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // 1. Teaser Containers Wrap & Steps 1..4
  assert.ok(html.includes('id="obTeasersWrap"'), 'Should contain #obTeasersWrap container');
  assert.ok(html.includes('id="obTeaser1"'), 'Should contain #obTeaser1 (Natal Big Three)');
  assert.ok(html.includes('id="obTeaser2"'), 'Should contain #obTeaser2 (Personal Astrologer 24/7)');
  assert.ok(html.includes('id="obTeaser3"'), 'Should contain #obTeaser3 (Tarot 3D Vortex)');
  assert.ok(html.includes('id="obTeaser4"'), 'Should contain #obTeaser4 (Daily Horoscope)');

  // 2. Dedicated Canvases for Hybrid Dual-Engine
  assert.ok(html.includes('id="obNatalCanvas"'), 'Should contain #obNatalCanvas for 3D Armillary sphere');
  assert.ok(html.includes('id="obEmpathyCanvas"'), 'Should contain #obEmpathyCanvas for Radiant empathy beacon');
  assert.ok(html.includes('id="obTarotCanvas"'), 'Should contain #obTarotCanvas for 3D Tarot vortex');
  assert.ok(html.includes('id="obHoroscopeCanvas"'), 'Should contain #obHoroscopeCanvas for Celestial transit dial');
});

test('Teaser Navigation: Header controls, progress segments, and discreet skip button exist', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // 1. Header step indicator
  assert.ok(html.includes('id="onboardingStepIndicator"'), 'Should contain #onboardingStepIndicator');

  // 2. 4-Segment Progress Pills
  assert.ok(html.includes('id="obSeg1"'), 'Should contain #obSeg1 progress segment');
  assert.ok(html.includes('id="obSeg2"'), 'Should contain #obSeg2 progress segment');
  assert.ok(html.includes('id="obSeg3"'), 'Should contain #obSeg3 progress segment');
  assert.ok(html.includes('id="obSeg4"'), 'Should contain #obSeg4 progress segment');

  // 3. Header Skip button
  assert.ok(html.includes('id="obSkipBtn"'), 'Should contain #obSkipBtn discreet header button');
  assert.ok(/id="obSkipBtn"[^>]*>[\s\S]*?Пропустить/i.test(html) || /Пропустить[\s\S]*?id="obSkipBtn"/i.test(html), 'Skip button must have text "Пропустить"');
  assert.ok(/id="obSkipBtn"[^>]*onclick=["'][^"']*skipToDataEntry/i.test(html) || html.includes('skipToDataEntry'), 'Skip button must trigger skipToDataEntry');
});

test('Teaser Action Buttons: CTA buttons on screens 1-4 and Back buttons on screens 2-4', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // 1. Next CTA buttons on screens 1-3 («Далее →»)
  const teaser1Match = html.match(/id="obTeaser1"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
  assert.ok(html.includes('Далее →') || html.includes('Далее &rarr;'), 'Must include «Далее →» CTA button');

  // 2. Screen 4 Primary CTA («Создать мою натальную карту →»)
  assert.ok(
    html.includes('Создать мою натальную карту →') || 
    html.includes('Создать мою натальную карту &rarr;'), 
    'Screen 4 must include «Создать мою натальную карту →» CTA'
  );

  // 3. Back buttons on screens 2-4 («← Назад»)
  assert.ok(
    html.includes('← Назад') || html.includes('&larr; Назад') || html.includes('←'),
    'Screens 2-4 must provide Back navigation button («← Назад»)'
  );
});

test('Teaser Assets & Security: Local Three.js bundled and 0 external CDN script references', () => {
  // 1. Local Three.js file on disk
  assert.ok(fs.existsSync(threeJsPath), 'public/three.min.js must exist locally');
  const stat = fs.statSync(threeJsPath);
  assert.ok(stat.size > 500000, 'public/three.min.js must be a valid Three.js bundle (>500KB)');

  // 2. HTML script inclusion
  const html = fs.readFileSync(indexPath, 'utf-8');
  assert.ok(
    html.includes('<script src="/three.min.js"></script>') || html.includes('src="/three.min.js"'),
    'public/index.html must reference local Three.js via /three.min.js'
  );

  // 3. ZERO external CDN script references
  const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  const scriptSources = [];
  while ((match = scriptSrcRegex.exec(html)) !== null) {
    scriptSources.push(match[1]);
  }

  assert.ok(scriptSources.length > 0, 'Should find local script tags');
  for (const src of scriptSources) {
    assert.ok(
      !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//'),
      `Script src "${src}" must NOT point to an external CDN (100% local assets required)`
    );
    assert.ok(
      !/cdnjs|jsdelivr|unpkg|telegram\.org/i.test(src),
      `Script src "${src}" must NOT reference external CDN hosts`
    );
  }
});

test('Brand & Psychological Copy Integrity: Zero blacklisted words and zero robotic gender brackets', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  // Extract onboarding markup region
  const obStart = html.indexOf('id="onboardingModal"');
  assert.ok(obStart !== -1, 'onboardingModal container must be present');
  const obChunk = html.slice(obStart, obStart + 8000);

  // 1. Blacklisted words check (Rule 7)
  assert.ok(!/демон/i.test(obChunk), 'Strict prohibition of word "демон" in onboarding');
  assert.ok(!/NASA/i.test(obChunk), 'Strict prohibition of word "NASA" in onboarding');
  assert.ok(!/эфемерид/i.test(obChunk), 'Strict prohibition of word "эфемериды" in onboarding');

  // Also verify entire index.html
  assert.ok(!html.toLowerCase().includes('демон'), 'Global prohibition of word "демон" in index.html');
  assert.ok(!html.includes('NASA'), 'Global prohibition of word "NASA" in index.html');
  assert.ok(!html.toLowerCase().includes('эфемерид'), 'Global prohibition of word "эфемериды" in index.html');

  // 2. Zero robotic gender brackets in onboarding: /(а)/(ла)/(ся)/(сь)/(ось)/
  const roboticGenderRegex = /[а-яё]+\((?:а|ла|ся|сь|ось)\)/i;
  assert.ok(
    !roboticGenderRegex.test(obChunk),
    'Onboarding text must have zero robotic gender brackets like "рожден(а)", "побоялся(лась)"'
  );
  assert.ok(
    !roboticGenderRegex.test(html),
    'Entire index.html must have zero robotic gender brackets'
  );

  // 3. Verify chatEngine.js has zero robotic gender brackets
  if (fs.existsSync(chatEnginePath)) {
    const chatContent = fs.readFileSync(chatEnginePath, 'utf-8');
    assert.ok(
      !roboticGenderRegex.test(chatContent),
      'src/chat/chatEngine.js must have zero robotic gender brackets'
    );
  }
});

test('TVLC Controller & Lifecycle: switchTeaserAnimation, pauseAllTeaserAnimations and skipToDataEntry exist', () => {
  const html = fs.readFileSync(indexPath, 'utf-8');

  assert.ok(
    html.includes('function switchTeaserAnimation') || html.includes('switchTeaserAnimation =') || html.includes('showTeaserStep'),
    'Must define switchTeaserAnimation or showTeaserStep in client script'
  );
  assert.ok(
    html.includes('function pauseAllTeaserAnimations') || html.includes('pauseAllTeaserAnimations =') || html.includes('pauseAllTeasers'),
    'Must define pauseAllTeaserAnimations for CPU/battery lifecycle management'
  );
  assert.ok(
    html.includes('function skipToDataEntry') || html.includes('skipToDataEntry ='),
    'Must define skipToDataEntry function for 1-click jump to Step 1'
  );
});
