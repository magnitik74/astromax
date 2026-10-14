import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ASTROLOGER_PERSONAS, getPersonaById } from '../src/chat/personas.js';
import { parseLocationInput } from '../src/core/geoResolver.js';
import fs from 'node:fs';
import path from 'node:path';

test('ASTROLOGER_PERSONAS has 4 authentic Russian experts with avatars on disk', () => {
  assert.equal(ASTROLOGER_PERSONAS.length, 4);

  const expected = ['alena', 'artem', 'elena', 'sofia'];
  const actualIds = ASTROLOGER_PERSONAS.map(p => p.id);
  assert.deepEqual(actualIds, expected);

  ASTROLOGER_PERSONAS.forEach(p => {
    assert.ok(p.name, 'Persona must have a Russian name');
    assert.ok(p.age > 20, 'Persona must have a realistic adult age');
    assert.ok(p.credo, 'Persona must have an inspiring credo');
    assert.ok(p.systemPrompt, 'Persona must have an AI prompt');
    assert.ok(p.avatar, 'Persona must have an avatar path');

    // Verify avatar exists in public/
    const avatarFilePath = path.join(process.cwd(), 'public', p.avatar.replace(/^\//, ''));
    assert.ok(fs.existsSync(avatarFilePath), `Avatar file for ${p.id} must exist at ${avatarFilePath}`);
  });
});

test('getPersonaById returns exact persona or defaults safely to alena', () => {
  const alena = getPersonaById('alena');
  assert.equal(alena.name, 'Алёна Смирнова');

  const artem = getPersonaById('artem');
  assert.equal(artem.name, 'Артём Соколов');

  const elena = getPersonaById('elena');
  assert.equal(elena.name, 'Елена Васильева');

  const sofia = getPersonaById('sofia');
  assert.equal(sofia.name, 'София Романова');

  const fallback = getPersonaById('unknown_id');
  assert.equal(fallback.id, 'alena');
});

test('parseLocationInput resolves major cities and rural settlements (хутор, деревня, село)', () => {
  // 1. Datalist option with UTC
  const spb = parseLocationInput('Санкт-Петербург (UTC+3)');
  assert.equal(spb.city, 'Санкт-Петербург');
  assert.equal(spb.tz, 3);
  assert.ok(spb.lat > 59 && spb.lat < 60);

  // 2. City by name without UTC tag
  const chelyabinsk = parseLocationInput('Челябинск');
  assert.equal(chelyabinsk.city, 'Челябинск');
  assert.equal(chelyabinsk.tz, 5);

  // 3. Far East city
  const vladivostok = parseLocationInput('Владивосток (UTC+10)');
  assert.equal(vladivostok.city, 'Владивосток');
  assert.equal(vladivostok.tz, 10);

  // 4. Village (деревня) without UTC tag -> graceful fallback without crash
  const village = parseLocationInput('д. Сосновка');
  assert.equal(village.city, 'д. Сосновка');
  assert.equal(village.tz, 3);
  assert.ok(village.lat);

  // 5. Hamlet (хутор) with explicit UTC tag
  const hamlet = parseLocationInput('хутор Красноармейский (UTC+4)');
  assert.equal(hamlet.city, 'хутор Красноармейский');
  assert.equal(hamlet.tz, 4);

  // 6. Empty input -> defaults to Moscow
  const empty = parseLocationInput('');
  assert.equal(empty.city, 'Москва');
  assert.equal(empty.tz, 3);
});

