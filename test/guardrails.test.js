import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSafetyGuardrails, RED_LINES } from '../src/safety/guardrails.js';

test('checkSafetyGuardrails passes normal questions', () => {
  const q1 = checkSafetyGuardrails('Что меня ждет в любви на этой неделе?');
  assert.equal(q1.safe, true);
  assert.equal(q1.category, null);

  const q2 = checkSafetyGuardrails('Стоит ли менять работу в ноябре?');
  assert.equal(q2.safe, true);

  const q3 = checkSafetyGuardrails('Расскажи про мой Асцендент в Скорпионе');
  assert.equal(q3.safe, true);
});

test('checkSafetyGuardrails catches emergency and self-harm triggers with helpline', () => {
  const res = checkSafetyGuardrails('Я больше не хочу жить, все плохо');
  assert.equal(res.safe, false);
  assert.equal(res.category, RED_LINES.EMERGENCY);
  assert.ok(res.response.includes('8-800-2000-122'));
  assert.ok(res.response.toLowerCase().includes('телефон доверия'));
});

test('checkSafetyGuardrails catches medical diagnosis questions and redirects to doctors', () => {
  const res = checkSafetyGuardrails('Поставь мне диагноз, у меня болит в боку');
  assert.equal(res.safe, false);
  assert.equal(res.category, RED_LINES.MEDICAL);
  assert.ok(res.response.includes('квалифицированного врача'));
});

test('checkSafetyGuardrails catches black magic / fearmongering and deconstructs superstitions', () => {
  const res = checkSafetyGuardrails('Как снять порчу и венец безбрачия?');
  assert.equal(res.safe, false);
  assert.equal(res.category, RED_LINES.BLACK_MAGIC);
  assert.ok(res.response.includes('свободу воли'));
});

test('checkSafetyGuardrails catches gambling scam guarantees', () => {
  const res = checkSafetyGuardrails('Дай прогноз на ставки на спорт с 100% выигрышем');
  assert.equal(res.safe, false);
  assert.equal(res.category, RED_LINES.FINANCIAL_SCAM);
  assert.ok(res.response.includes('не дает гарантий в азартных играх'));
});
