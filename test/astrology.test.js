import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateNatalChart, getZodiacPosition, ZODIAC_SIGNS } from '../src/core/astrology.js';

test('Zodiac sign conversion is mathematically exact', () => {
  // 0° is Aries
  const aries = getZodiacPosition(0);
  assert.equal(aries.sign, 'Овен');
  assert.equal(aries.degrees, 0);

  // 45.5° is Taurus 15° 30'
  const taurus = getZodiacPosition(45.5);
  assert.equal(taurus.sign, 'Телец');
  assert.equal(taurus.degrees, 15);
  assert.equal(taurus.minutes, 30);

  // 359.9° is Pisces
  const pisces = getZodiacPosition(359.9);
  assert.equal(pisces.sign, 'Рыбы');
});

test('Natal chart calculates Big Three, 10 planets and aspects', () => {
  const chart = calculateNatalChart({
    birthDate: '1995-10-25',
    birthTime: '14:30',
    lat: 55.7558,
    lon: 37.6173,
    timezoneOffset: 3,
  });

  // Verify Big Three exists
  assert.ok(chart.bigThree);
  assert.ok(chart.bigThree.sun.sign, 'Sun sign must exist');
  assert.ok(chart.bigThree.moon.sign, 'Moon sign must exist');
  assert.ok(chart.bigThree.ascendant.sign, 'Ascendant must exist');

  // Sun on Oct 25 is Scorpio
  assert.equal(chart.bigThree.sun.sign, 'Скорпион');

  // Verify 10 planets calculated
  assert.equal(chart.planets.length, 10);
  const planetNames = chart.planets.map(p => p.id);
  assert.ok(planetNames.includes('Sun'));
  assert.ok(planetNames.includes('Moon'));
  assert.ok(planetNames.includes('Mercury'));
  assert.ok(planetNames.includes('Venus'));
  assert.ok(planetNames.includes('Mars'));
  assert.ok(planetNames.includes('Jupiter'));
  assert.ok(planetNames.includes('Saturn'));
  assert.ok(planetNames.includes('Pluto'));

  // Verify aspects calculated
  assert.ok(Array.isArray(chart.aspects));
  assert.ok(chart.aspects.length > 0, 'Should find astrological aspects');

  // Verify element balance sum
  const elemSum = Object.values(chart.balance.elements).reduce((a, b) => a + b, 0);
  assert.equal(elemSum, 10, 'All 10 planets mapped into 4 elements');
});
