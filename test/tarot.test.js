import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getFullDeck, drawTarotSpread, MAJOR_ARCANA } from '../src/core/tarot.js';

test('Tarot deck has exactly 78 cards', () => {
  const deck = getFullDeck();
  assert.equal(deck.length, 78, 'Deck must contain 78 cards (22 Major + 56 Minor)');

  const majorCount = deck.filter(c => c.arcana === 'major').length;
  const minorCount = deck.filter(c => c.arcana === 'minor').length;

  assert.equal(majorCount, 22);
  assert.equal(minorCount, 56);
});

test('Tarot daily spread draws 1 card', () => {
  const spread = drawTarotSpread({ type: 'daily' });
  assert.equal(spread.cards.length, 1);
  assert.ok(spread.cards[0].card.name);
  assert.ok(spread.cards[0].card.interpretation);
  assert.ok(['Прямая', 'Перевернутая'].includes(spread.cards[0].card.status));
});

test('Tarot three cards spread draws 3 unique cards', () => {
  const spread = drawTarotSpread({ type: 'three_cards' });
  assert.equal(spread.cards.length, 3);
  
  const ids = spread.cards.map(c => c.card.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, 3, 'Cards in spread must be unique');
});
