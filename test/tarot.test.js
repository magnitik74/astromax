import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getFullDeck, drawTarotSpread, MAJOR_ARCANA } from '../src/core/tarot.js';

test('Tarot deck has exactly 78 cards with valid physical images', () => {
  const deck = getFullDeck();
  assert.equal(deck.length, 78, 'Deck must contain 78 cards (22 Major + 56 Minor)');

  const majorCount = deck.filter(c => c.arcana === 'major').length;
  const minorCount = deck.filter(c => c.arcana === 'minor').length;

  assert.equal(majorCount, 22);
  assert.equal(minorCount, 56);

  // RLVR: Verify every single card has an existing image file on disk in public/
  deck.forEach((card) => {
    assert.ok(card.image, `Card ${card.name} must have image path`);
    const relPath = card.image.startsWith('/') ? card.image.slice(1) : card.image;
    const fullPath = path.join(process.cwd(), 'public', relPath);
    assert.ok(fs.existsSync(fullPath), `Card image file must exist on disk: ${fullPath}`);
    assert.ok(card.oracleUpright, `Card ${card.name} must have oracleUpright`);
    assert.ok(card.oracleReversed, `Card ${card.name} must have oracleReversed`);
  });
});

test('Tarot daily spread draws 1 card with image and interpretation', () => {
  const spread = drawTarotSpread({ type: 'daily' });
  assert.equal(spread.cards.length, 1);
  assert.ok(spread.cards[0].card.name);
  assert.ok(spread.cards[0].card.image);
  assert.ok(spread.cards[0].card.interpretation);
  assert.ok(['Прямая', 'Перевернутая'].includes(spread.cards[0].card.status));
});

test('Tarot oracle_yes_no spread draws 1 card with oracleVerdict', () => {
  const spread = drawTarotSpread({ type: 'oracle_yes_no' });
  assert.equal(spread.cards.length, 1);
  assert.ok(spread.cards[0].card.oracleVerdict, 'Must contain oracleVerdict');
  assert.equal(spread.cards[0].position, 'Оракул Да / Нет (Ответ Аркана)');
});

test('Tarot daily deterministic seed yields reproducible draws', () => {
  const spread1 = drawTarotSpread({ type: 'daily', seed: 'user_42_2026-10-15' });
  const spread2 = drawTarotSpread({ type: 'daily', seed: 'user_42_2026-10-15' });
  assert.equal(spread1.cards[0].card.id, spread2.cards[0].card.id, 'Deterministic seed must draw the same card');
  assert.equal(spread1.cards[0].card.isReversed, spread2.cards[0].card.isReversed, 'Deterministic seed must have same orientation');
});

test('Tarot three cards spread draws 3 unique cards', () => {
  const spread = drawTarotSpread({ type: 'three_cards' });
  assert.equal(spread.cards.length, 3);
  
  const ids = spread.cards.map(c => c.card.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, 3, 'Cards in spread must be unique');
});

test('Tarot celtic cross draws 10 unique cards', () => {
  const spread = drawTarotSpread({ type: 'celtic_cross' });
  assert.equal(spread.cards.length, 10);
  
  const ids = spread.cards.map(c => c.card.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, 10, 'All 10 cards in Celtic Cross must be unique');
});
